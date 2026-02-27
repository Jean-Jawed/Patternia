// ============================================================
// audio.js — Sons procéduraux via Web Audio API
// ============================================================

export class AudioManager {
  constructor() {
    this._ctx   = null;
    this._gain  = null;
    this._loop  = null;
  }

  _init() {
    if (this._ctx) return;
    try {
      this._ctx  = new (window.AudioContext || window.webkitAudioContext)();
      this._gain = this._ctx.createGain();
      this._gain.gain.value = .38;
      this._gain.connect(this._ctx.destination);
    } catch (e) {
      console.warn('[audio] Web Audio not available');
    }
  }

  _resume() {
    if (this._ctx?.state === 'suspended') this._ctx.resume();
  }

  // ── Tone generator ────────────────────────────────────────
  _tone(freq, type = 'sine', dur = .15, vol = .22, delay = 0) {
    this._init(); this._resume();
    if (!this._ctx) return;
    const t = this._ctx.currentTime + delay;
    const o = this._ctx.createOscillator();
    const g = this._ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(this._gain);
    o.start(t); o.stop(t + dur + .02);
  }

  // ── Events ────────────────────────────────────────────────
  step()      { this._tone(520, 'sine',     .06, .09); }
  death()     { this._tone(180, 'sawtooth', .35, .22); this._tone(90, 'sine', .5, .12, .1); }
  win()       { [523,659,784,1047].forEach((f,i) => this._tone(f, 'sine', .25, .18, i*.1)); }
  teleport()  {
    this._init(); this._resume();
    if (!this._ctx) return;
    const t = this._ctx.currentTime;
    const o = this._ctx.createOscillator();
    const g = this._ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(280, t);
    o.frequency.exponentialRampToValueAtTime(880, t + .22);
    g.gain.setValueAtTime(.18, t);
    g.gain.exponentialRampToValueAtTime(.0001, t + .28);
    o.connect(g); g.connect(this._gain);
    o.start(t); o.stop(t + .32);
  }

  // Tonique d'entrée de niveau (différente par niveau)
  levelStart(levelId) {
    const notes = [440, 494, 523, 587, 659, 698, 784, 830, 880];
    const freq  = notes[Math.min(levelId-1, notes.length-1)];
    this._tone(freq,        'sine', .4,  .14);
    this._tone(freq * 1.5,  'sine', .3,  .07, .15);
  }

  // ── Music loop ────────────────────────────────────────────
  /**
   * pattern: [{ freq, duration }]
   * Joue en boucle jusqu'à stopLoop()
   */
  startLoop(pattern) {
    this.stopLoop();
    if (!pattern?.length) return;
    this._init(); this._resume();
    let step = 0;
    const next = () => {
      const n = pattern[step % pattern.length];
      this._tone(n.freq, 'sine', n.duration * .75, .12);
      step++;
      this._loop = setTimeout(next, n.duration * 1000);
    };
    next();
  }

  stopLoop() {
    clearTimeout(this._loop);
    this._loop = null;
  }

  setVolume(v) {
    if (this._gain) this._gain.gain.value = Math.max(0, Math.min(1, v));
  }
}
