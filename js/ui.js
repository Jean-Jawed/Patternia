// ============================================================
// ui.js — HUD, écrans, hints, séquences, wall hint
// ============================================================

export class UIManager {
  constructor() {
    this.$levelNum  = document.getElementById('hud-level-num');
    this.$title     = document.getElementById('hud-title');
    this.$timer     = document.getElementById('hud-timer');
    this.$death     = document.getElementById('screen-death');
    this.$win       = document.getElementById('screen-win');
    this.$complete  = document.getElementById('screen-complete');
    this.$deathMsg  = document.getElementById('death-message');
    this.$winMsg    = document.getElementById('win-message');
    this.$hint      = document.getElementById('hint-box');
    this.$seq       = document.getElementById('sequence-display');
    this.$wall      = document.getElementById('wall-hint');
    this.$flash     = document.getElementById('level-flash');

    this._hintTimer = null;
  }

  // ── HUD ───────────────────────────────────────────────────
  setLevel(num, title) {
    if (this.$levelNum) this.$levelNum.textContent = num;
    if (this.$title)    this.$title.textContent    = title || '';
  }

  // ── Timer ─────────────────────────────────────────────────
  showTimer(seconds) {
    if (!this.$timer) return;
    this.$timer.classList.remove('hidden');
    this._updateTimerText(seconds);
  }
  updateTimer(seconds) { this._updateTimerText(seconds); }
  hideTimer() { this.$timer?.classList.add('hidden'); }
  _updateTimerText(s) {
    if (!this.$timer) return;
    const m  = Math.floor(s / 60);
    const ss = Math.floor(s % 60);
    this.$timer.textContent = `${m}:${String(ss).padStart(2,'0')}`;
  }

  // ── Death screen ──────────────────────────────────────────
  showDeath(message, onRetry) {
    if (!this.$death) return;
    if (this.$deathMsg) this.$deathMsg.textContent = message || 'You fell.';
    this.$death.classList.remove('hidden');
    this._deferBtn('btn-retry', onRetry);
  }
  hideDeath() { this.$death?.classList.add('hidden'); }

  // ── Win screen ────────────────────────────────────────────
  showWin(message, onNext) {
    if (!this.$win) return;
    if (this.$winMsg) this.$winMsg.textContent = message || 'Pattern understood.';
    this.$win.classList.remove('hidden');
    this._deferBtn('btn-next', onNext);
  }
  hideWin() { this.$win?.classList.add('hidden'); }

  // ── Complete screen ───────────────────────────────────────
  showComplete(onRestart) {
    if (!this.$complete) return;
    this.$complete.classList.remove('hidden');
    this._deferBtn('btn-restart', onRestart);
  }
  hideComplete() { this.$complete?.classList.add('hidden'); }

  // ── Hint box ──────────────────────────────────────────────
  showHint(text, duration = 3500) {
    if (!this.$hint) return;
    clearTimeout(this._hintTimer);
    this.$hint.textContent = text;
    this.$hint.classList.remove('hidden');
    if (duration > 0) {
      this._hintTimer = setTimeout(() => this.hideHint(), duration);
    }
  }
  hideHint() {
    clearTimeout(this._hintTimer);
    this.$hint?.classList.add('hidden');
  }

  // ── Wall hint (règle affichée en bas de l'écran) ──────────
  showWallHint(data) {
    if (!this.$wall || !data) return;
    this.$wall.innerHTML = '';
    if (data.label) {
      const l = document.createElement('span');
      l.className   = 'wh-label';
      l.textContent = data.label + ' :';
      this.$wall.appendChild(l);
    }
    for (let i = 0; i < data.colors.length; i++) {
      if (i > 0) {
        const arr = document.createElement('span');
        arr.className   = 'wh-arrow';
        arr.textContent = '→';
        this.$wall.appendChild(arr);
      }
      const d = document.createElement('div');
      d.className        = 'wh-dot';
      d.style.background = data.colors[i];
      this.$wall.appendChild(d);
    }
    setTimeout(() => this.$wall.classList.add('visible'), 600);
  }
  hideWallHint() {
    this.$wall?.classList.remove('visible');
    setTimeout(() => { if (this.$wall) this.$wall.innerHTML = ''; }, 700);
  }

  // ── Sequence display ──────────────────────────────────────
  showSequence(colors, duration = 0, label = '') {
    if (!this.$seq) return;
    this.$seq.innerHTML = '';
    if (label) {
      const l = document.createElement('div');
      l.className   = 'seq-label';
      l.textContent = label;
      this.$seq.appendChild(l);
    }
    const row = document.createElement('div');
    row.className = 'seq-row';
    for (const c of colors) {
      const d = document.createElement('div');
      d.className        = 'seq-dot';
      d.style.background = c;
      row.appendChild(d);
    }
    this.$seq.appendChild(row);
    this.$seq.classList.remove('hidden');
    if (duration > 0) {
      setTimeout(() => this.hideSequence(), duration);
    }
  }
  hideSequence() { this.$seq?.classList.add('hidden'); }

  // ── Level transition flash ────────────────────────────────
  flash(callback) {
    if (!this.$flash) { callback?.(); return; }
    this.$flash.classList.add('in');
    setTimeout(() => {
      callback?.();
      this.$flash.classList.remove('in');
    }, 240);
  }

  // ── Reset all overlays ────────────────────────────────────
  resetAll() {
    this.hideDeath();
    this.hideWin();
    this.hideComplete();
    this.hideHint();
    this.hideSequence();
    this.hideWallHint();
    this.hideTimer();
  }

  // ── Internal ──────────────────────────────────────────────
  _deferBtn(id, cb) {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.onclick = null;
    setTimeout(() => { btn.onclick = cb; }, 420);
  }
}
