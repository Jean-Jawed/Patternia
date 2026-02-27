// ============================================================
// input.js — Clavier, Gamepad, Joystick tactile
// Produit une queue de directions normalisées
// ============================================================

export class InputManager {
  constructor() {
    this.queue    = [];   // max 2 moves ahead
    this._keys    = {};
    this._gpPrev  = {};
    this._joyDir  = null;

    this._bindKeyboard();
    this._bindGamepad();
    this._maybeBindJoystick();
  }

  // ── Consume next direction (called by main loop) ──────────
  consume() {
    return this.queue.shift() || null;
  }

  flush() {
    this.queue  = [];
    this._keys  = {};
    this._gpPrev = {};
  }

  // ── Keyboard ──────────────────────────────────────────────
  _bindKeyboard() {
    const MAP = {
      ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
      KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right',
    };
    window.addEventListener('keydown', e => {
      const d = MAP[e.code];
      if (d && !this._keys[d]) {
        this._keys[d] = true;
        this._enqueue(d);
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', e => {
      const d = MAP[e.code];
      if (d) delete this._keys[d];
    });
  }

  // ── Gamepad polling ───────────────────────────────────────
  _bindGamepad() {}

  pollGamepad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gp of pads) {
      if (!gp) continue;
      const BTN = { up: 12, down: 13, left: 14, right: 15 };
      for (const [dir, idx] of Object.entries(BTN)) {
        const pressed = gp.buttons[idx]?.pressed;
        if (pressed && !this._gpPrev[dir]) this._enqueue(dir);
        this._gpPrev[dir] = pressed;
      }
      // Left stick
      const ax = gp.axes[0], ay = gp.axes[1];
      const D  = .5;
      this._gpStick('up',    ay < -D, '_su');
      this._gpStick('down',  ay >  D, '_sd');
      this._gpStick('left',  ax < -D, '_sl');
      this._gpStick('right', ax >  D, '_sr');
    }
  }

  _gpStick(dir, active, key) {
    if (active && !this._gpPrev[key]) { this._enqueue(dir); this._gpPrev[key] = true; }
    else if (!active) this._gpPrev[key] = false;
  }

  // ── Mobile joystick ───────────────────────────────────────
  _maybeBindJoystick() {
    if (!('ontouchstart' in window) && navigator.maxTouchPoints < 1) return;

    const container = document.getElementById('joystick-container');
    const base      = document.getElementById('joystick-base');
    const thumb     = document.getElementById('joystick-thumb');
    if (!base) return;

    container?.classList.remove('hidden');

    let sx = 0, sy = 0;
    const DEAD = 18, MAX = 38;

    base.addEventListener('touchstart', e => {
      const r = base.getBoundingClientRect();
      sx = r.left + r.width  / 2;
      sy = r.top  + r.height / 2;
    }, { passive: true });

    base.addEventListener('touchmove', e => {
      const t  = e.touches[0];
      const dx = t.clientX - sx, dy = t.clientY - sy;
      const d  = Math.sqrt(dx*dx + dy*dy);
      const cl = Math.min(d, MAX);
      if (thumb) thumb.style.transform =
        `translate(calc(-50% + ${dx/d*cl}px), calc(-50% + ${dy/d*cl}px))`;

      if (d > DEAD) {
        const ang = Math.atan2(dy, dx) * 180 / Math.PI;
        let dir;
        if      (ang > -135 && ang <= -45) dir = 'up';
        else if (ang > -45  && ang <=  45) dir = 'right';
        else if (ang >  45  && ang <= 135) dir = 'down';
        else                               dir = 'left';
        if (dir !== this._joyDir) { this._joyDir = dir; this._enqueue(dir); }
      } else {
        this._joyDir = null;
      }
      e.preventDefault();
    }, { passive: false });

    base.addEventListener('touchend', () => {
      if (thumb) thumb.style.transform = 'translate(-50%, -50%)';
      this._joyDir = null;
    });
  }

  // ── Internal ──────────────────────────────────────────────
  _enqueue(dir) {
    if (this.queue.length < 2) this.queue.push(dir);
  }
}
