// ============================================================
// main.js — Point d'entrée, boucle principale
// Orchestre Renderer, Player, Input, Mechanics, Rules,
// Level, Audio, UI
// ============================================================

import { Renderer }        from './renderer.js';
import { Player }          from './player.js';
import { InputManager }    from './input.js';
import { MechanicsEngine } from './mechanics.js';
import { RulesEngine }     from './rules.js';
import { LevelLoader }     from './level.js';
import { AudioManager }    from './audio.js';
import { UIManager }       from './ui.js';

// ── Module instances ─────────────────────────────────────
const canvas    = document.getElementById('game-canvas');
const renderer  = new Renderer(canvas);
const player    = new Player();
const input     = new InputManager();
const mechanics = new MechanicsEngine();
const rules     = new RulesEngine();
const loader    = new LevelLoader();
const audio     = new AudioManager();
const ui        = new UIManager();

window.addEventListener('resize', () => renderer.resize());

// ── Game state ───────────────────────────────────────────
let levelIndex    = 0;   // index dans la liste des niveaux chargés
let levelList     = [];  // liste des IDs de niveaux (depuis index.json)
let currentData   = null;
let currentGrid   = null;
let gameActive    = false;
let frameCount    = 0;

// ── Boot ─────────────────────────────────────────────────
async function init() {
  // Charger la liste des niveaux
  try {
    const res = await fetch('data/levels/index.json');
    levelList = await res.json();
  } catch (e) {
    console.error('[main] Cannot load level index:', e);
    levelList = [1, 2, 3, 4, 5, 6, 7]; // fallback
  }

  buildDevNav();
  await loadLevel(0);
  requestAnimationFrame(loop);
}

// ── Charger un niveau par index dans levelList ───────────
async function loadLevel(idx) {
  gameActive  = false;
  frameCount  = 0;
  levelIndex  = idx;
  audio.stopLoop();
  ui.resetAll();
  input.flush();

  const levelId = levelList[idx];
  const result  = await loader.load(levelId);

  if (!result) {
    console.error(`[main] Failed to load level ${levelId}`);
    return;
  }

  currentData = result.levelData;
  currentGrid = result.grid;

  // Init player
  const [sc, sr] = currentData.start || [0, 0];
  player.reset(sc, sr);

  // Wire player callbacks
  player.onLand = (col, row) => {
    audio.step();
    rules.onPlayerLand(col, row);
    rules.checkHints(currentData.hints);
  };
  player.onBorderHit = (dir) => {
    rules.onBorderHit(dir, currentData.border_behavior || 'kill');
  };

  // Wire rules callbacks
  rules.onKill = handleDeath;
  rules.onWin  = handleWin;
  rules.onTeleport  = (c, r) => { audio.teleport(); player.teleport(c, r); };
  rules.onShowHint  = (text, dur) => ui.showHint(text, dur);
  rules.onPlaySound = (id) => {
    const patterns = currentData.music_patterns || {};
    if (patterns[id]) audio.startLoop(patterns[id]);
  };
  rules.onStopSound = () => audio.stopLoop();

  // Load rules (preserve death count across retries)
  rules.load(currentData.rules, currentGrid);

  // HUD
  ui.setLevel(currentData.id, currentData.title || '');

  // Wall hint
  if (currentData.wall_hint) ui.showWallHint(currentData.wall_hint);

  // on_start events
  for (const evt of (currentData.on_start || [])) {
    const delay = evt.delay || 0;
    switch (evt.type) {
      case 'show_hint':
        setTimeout(() => ui.showHint(evt.hint_text, evt.duration || 4000), delay);
        break;
      case 'show_sequence':
        setTimeout(() => ui.showSequence(evt.colors, evt.duration || 4000, evt.label || ''), delay);
        break;
      case 'play_sound':
        setTimeout(() => {
          const p = currentData.music_patterns?.[evt.sound_id];
          if (p) audio.startLoop(p);
        }, delay);
        break;
    }
  }

  updateDevNav();
  audio.levelStart(currentData.id);
  gameActive = true;
}

// ── Death ─────────────────────────────────────────────────
function handleDeath() {
  if (!gameActive) return;
  gameActive = false;
  player.die();
  audio.death();
  input.flush();

  setTimeout(() => {
    ui.showDeath(currentData.death_message || 'You fell.', () => {
      ui.flash(() => reloadCurrentLevel());
    });
  }, 320);
}

// ── Win ──────────────────────────────────────────────────
function handleWin() {
  if (!gameActive) return;
  gameActive = false;
  audio.win();

  setTimeout(() => {
    const nextIdx = levelIndex + 1;
    if (nextIdx < levelList.length) {
      ui.showWin(currentData.win_message || 'Pattern understood.', () => {
        rules.resetDeaths();
        ui.flash(() => loadLevel(nextIdx));
      });
    } else {
      ui.showComplete(() => {
        rules.resetDeaths();
        ui.flash(() => loadLevel(0));
      });
    }
  }, 200);
}

// ── Retry current level ───────────────────────────────────
async function reloadCurrentLevel() {
  // Re-charge le même niveau mais conserve le compteur de morts (déjà dans rules.state)
  const result = await loader.load(levelList[levelIndex]);
  if (!result) return;

  currentData = result.levelData;
  currentGrid = result.grid;

  const [sc, sr] = currentData.start || [0, 0];
  player.reset(sc, sr);

  rules.load(currentData.rules, currentGrid);
  rules.checkHints(currentData.hints); // afficher hint si seuil atteint

  mechanics.time = 0;
  frameCount     = 0;
  input.flush();
  ui.resetAll();

  if (currentData.wall_hint) ui.showWallHint(currentData.wall_hint);

  audio.levelStart(currentData.id);
  ui.setLevel(currentData.id, currentData.title || '');
  gameActive = true;
}

// ── Main loop ─────────────────────────────────────────────
function loop() {
  frameCount++;

  input.pollGamepad();

  if (gameActive) {
    const dir = (!player.moving) ? input.consume() : null;
    const gridSize = currentData?.grid_size || 6;
    const border   = currentData?.border_behavior || 'kill';

    player.update(dir, gridSize, border);
    mechanics.update(currentGrid);
    rules.tickIdle(player.moving);
  }

  renderer.render(currentGrid, player);
  requestAnimationFrame(loop);
}

// ── Start ─────────────────────────────────────────────────
init();

// ── Back to home ─────────────────────────────────────────
document.getElementById('btn-home')?.addEventListener('click', () => {
  gameActive = false;
  audio.stopLoop();
  window.location.href = 'index.html';
});

// ── Dev nav sidebar ──────────────────────────────────────
function buildDevNav() {
  const container = document.getElementById('dev-nav__levels');
  if (!container) return;
  container.innerHTML = '';
  levelList.forEach((id, idx) => {
    const btn = document.createElement('button');
    btn.className   = 'dev-nav__btn';
    btn.textContent = id;
    btn.title       = `Jump to level ${id}`;
    btn.dataset.idx = idx;
    btn.addEventListener('click', () => {
      rules.resetDeaths();
      ui.flash(() => loadLevel(idx));
    });
    container.appendChild(btn);
  });
}

function updateDevNav() {
  document.querySelectorAll('.dev-nav__btn').forEach((btn, idx) => {
    btn.classList.toggle('active', idx === levelIndex);
  });
}
