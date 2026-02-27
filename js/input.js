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

  // ── Mobile D-pad ──────────────────────────────────────────
  _maybeBindJoystick() {
    const isTouch = ('ontouchstart' in window)
      || navigator.maxTouchPoints > 0
      || window.matchMedia('(pointer: coarse)').matches;
    if (!isTouch) return;

    const dpad = document.getElementById('dpad');
    if (!dpad) return;
    dpad.classList.remove('hidden');

    const dirs = ['up', 'down', 'left', 'right'];

    dirs.forEach(dir => {
      const btn = document.getElementById(`dpad-${dir}`);
      if (!btn) return;

      // touchstart: enqueue immediately on finger-down
      btn.addEventListener('touchstart', e => {
        e.preventDefault();
        this._enqueue(dir);
        btn.classList.add('pressed');
      }, { passive: false });

      btn.addEventListener('touchend', () => {
        btn.classList.remove('pressed');
      }, { passive: true });

      // Fallback for mouse (desktop testing)
      btn.addEventListener('mousedown', () => {
        this._enqueue(dir);
        btn.classList.add('pressed');
      });
      btn.addEventListener('mouseup',   () => btn.classList.remove('pressed'));
      btn.addEventListener('mouseleave',() => btn.classList.remove('pressed'));
    });
  }

  // ── Internal ──────────────────────────────────────────────
  _enqueue(dir) {
    if (this.queue.length < 2) this.queue.push(dir);
  }
}
