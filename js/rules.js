// ============================================================
// rules.js — Moteur de règles
//
// Évalue les conditions à chaque déplacement et déclenche
// les effets correspondants.
//
// Pour ajouter une règle complexe non couverte par le JSON :
//   1. Ajouter une fonction dans la section CUSTOM RULES
//   2. La référencer via { "type": "custom_rule", "name": "..." }
// ============================================================

import { colorKey } from './utils.js';

export class RulesEngine {
  constructor() {
    this.rules   = [];
    this.grid    = null;
    this.state   = this._fresh();

    // Callbacks — branchés par main.js
    this.onKill      = null;  // ()             → void
    this.onWin       = null;  // ()             → void
    this.onTeleport  = null;  // (col, row)     → void
    this.onShowHint  = null;  // (text, dur)    → void
    this.onPlaySound = null;  // (soundId)      → void
    this.onStopSound = null;  // ()             → void
  }

  _fresh() {
    return {
      colorSeq:      [],   // couleurs touchées (non-joker)
      solidColorSeq: [],   // couleurs touchées (non-blink, non-joker)
      stepCount:     0,    // nombre de cases touchées
      deathCount:    0,    // morts dans ce niveau
      idleFrames:    0,    // frames immobile
      musicPlaying:  false,
    };
  }

  // ── Chargement d'un niveau ────────────────────────────────
  load(rules, grid) {
    this.rules = rules || [];
    this.grid  = grid;
    const deaths = this.state.deathCount; // on conserve le compteur de morts
    this.state = this._fresh();
    this.state.deathCount = deaths;
  }

  resetDeaths() {
    this.state.deathCount = 0;
  }

  // ── Appelé à chaque frame (pour conditions temporelles) ───
  tickIdle(playerMoving) {
    if (playerMoving) this.state.idleFrames = 0;
    else              this.state.idleFrames++;

    // Évaluer les règles frame-based
    for (const rule of this.rules) {
      if (rule.condition?.type === 'idle_seconds') {
        const needed = (rule.condition.seconds || 0) * 60;
        if (this.state.idleFrames >= needed) {
          this._trigger(rule.effect);
          this.state.idleFrames = 0; // ne re-déclenche pas en boucle
        }
      }
    }
  }

  // ── Appelé quand le joueur touche une case ─────────────────
  onPlayerLand(col, row) {
    const cell    = this.grid?.[row]?.[col];
    const color   = cell?.currentColor || null;
    const isJoker = cell?.isJoker      || false;
    const isBlink = cell?.mechType     === 'blinking';

    // Mise à jour des séquences
    if (color && !isJoker) {
      this.state.colorSeq.push(colorKey(color));
    }
    if (color && !isJoker && !isBlink) {
      this.state.solidColorSeq.push(colorKey(color));
    }
    this.state.stepCount++;

    // Trim pour éviter une croissance infinie
    if (this.state.colorSeq.length     > 64) this.state.colorSeq.shift();
    if (this.state.solidColorSeq.length > 64) this.state.solidColorSeq.shift();

    // Évaluer toutes les règles
    for (const rule of this.rules) {
      if (this._match(rule.condition, col, row, cell)) {
        this._trigger(rule.effect);
        return; // première règle déclenchée, on s'arrête
      }
    }
  }

  // ── Appelé quand le joueur touche un bord ─────────────────
  onBorderHit(direction, borderBehavior) {
    if (borderBehavior === 'kill') {
      this._trigger({ type: 'kill' });
    } else if (borderBehavior === 'exit') {
      this._trigger({ type: 'win' });
    }
  }

  // ── Hint conditionnel (déclenché après N morts) ───────────
  checkHints(hints) {
    if (!hints) return;
    for (const h of hints) {
      if (h.trigger === 'death_count' && this.state.deathCount >= h.threshold) {
        this.onShowHint?.(h.text, h.duration || 4000);
      }
    }
  }

  // ── Évaluation d'une condition ────────────────────────────
  _match(cond, col, row, cell) {
    if (!cond) return false;
    const ck = colorKey(cell?.currentColor || '');

    switch (cond.type) {

      // Toucher une case précise
      case 'touch_cell':
        return cell?.id === cond.cell_id;

      // Toucher une couleur
      case 'touch_cell_color':
        return ck === colorKey(cond.color);

      // Atteindre la sortie
      case 'reach_exit':
        return cell?.isExit === true;

      // Deux mêmes couleurs de suite (toutes cases)
      case 'two_consecutive_same': {
        const s = this.state.colorSeq;
        if (s.length < 2) return false;
        return s.at(-2) === colorKey(cond.color) && s.at(-1) === colorKey(cond.color);
      }

      // Deux mêmes couleurs de suite (cases solides seulement, blink = reset)
      case 'two_consecutive_same_solid': {
        const s = this.state.solidColorSeq;
        if (s.length < 2) return false;
        return s.at(-2) === colorKey(cond.color) && s.at(-1) === colorKey(cond.color);
      }

      // Rupture de pattern cyclique (ex: B B Y B B Y…)
      case 'pattern_break': {
        const pat = cond.pattern.map(colorKey);
        const s   = this.state.colorSeq;
        if (s.length === 0) return false;
        const expected = pat[(s.length - 1) % pat.length];
        return s.at(-1) !== expected;
      }

      // Violation d'une séquence exacte à suivre (les N premiers pas)
      case 'sequence_violates': {
        const seq = cond.sequence.map(colorKey);
        const s   = this.state.colorSeq;
        if (s.length === 0) return false;
        const idx = s.length - 1;
        if (idx >= seq.length) return false; // au-delà = plus de contrainte
        return s[idx] !== seq[idx];
      }

      // AND logique entre plusieurs conditions
      case 'AND':
        return (cond.conditions || []).every(c => this._match(c, col, row, cell));

      // OR logique entre plusieurs conditions
      case 'OR':
        return (cond.conditions || []).some(c => this._match(c, col, row, cell));

      // Musique en cours
      case 'music_playing':
        return this.state.musicPlaying;

      // Nombre de pas total
      case 'total_steps_equals':
        return this.state.stepCount === cond.steps;

      // ── CUSTOM RULES ─────────────────────────────────────
      // Ajouter ici les règles trop complexes pour le JSON pur.
      // Référencer depuis le JSON via : { "type": "custom_rule", "name": "..." }
      case 'custom_rule':
        return this._customRule(cond.name, col, row, cell);

      default:
        return false;
    }
  }

  // ── Déclenchement d'un effet ──────────────────────────────
  _trigger(eff) {
    if (!eff) return;
    switch (eff.type) {
      case 'kill':
        this.state.deathCount++;
        this.onKill?.();
        break;
      case 'win':
        this.onWin?.();
        break;
      case 'teleport':
        this.onTeleport?.(eff.target_col, eff.target_row);
        break;
      case 'show_hint':
        this.onShowHint?.(eff.hint_text, eff.duration || 3000);
        break;
      case 'play_sound':
        this.state.musicPlaying = true;
        this.onPlaySound?.(eff.sound_id);
        break;
      case 'stop_sound':
        this.state.musicPlaying = false;
        this.onStopSound?.();
        break;
    }
  }

  // ── Section règles custom ─────────────────────────────────
  // Pour les comportements non modélisables en JSON pur.
  // Chaque règle custom reçoit (name, col, row, cell) et retourne bool.
  _customRule(name, col, row, cell) {
    switch (name) {
      // Exemple futur :
      // case 'three_roundtrips': return this._checkRoundtrips(3);
      default:
        console.warn(`[rules] custom_rule "${name}" not implemented`);
        return false;
    }
  }
}
