// ============================================================
// home.js — Animation page d'accueil + navigation
// ============================================================

const canvas = document.getElementById('bg-canvas');
const ctx    = canvas.getContext('2d');

const TYPES  = ['square', 'circle', 'triangle', 'diamond'];
const COLS   = [
  'rgba(200,169,110,A)',
  'rgba(123,158,166,A)',
  'rgba(26,24,20,A)',
];

function rCol(a) {
  return COLS[Math.floor(Math.random() * COLS.length)].replace('A', a);
}

class Shape {
  constructor() { this.reset(true); }

  reset(init = false) {
    this.type  = TYPES[Math.floor(Math.random() * TYPES.length)];
    this.x     = Math.random() * canvas.width;
    this.y     = init ? Math.random() * canvas.height : canvas.height + 80;
    this.sz    = 8 + Math.random() * 34;
    this.rot   = Math.random() * Math.PI * 2;
    this.rs    = (Math.random() - .5) * .005;
    this.vx    = (Math.random() - .5) * .16;
    this.vy    = -(0.07 + Math.random() * .17);
    this.alpha = 0;
    this.ta    = .04 + Math.random() * .12;
    this.fi    = true;
    this.life  = 0;
    this.ml    = 400 + Math.random() * 600;
  }

  update() {
    this.x   += this.vx;
    this.y   += this.vy;
    this.rot += this.rs;
    this.life++;
    if (this.fi) {
      this.alpha = Math.min(this.alpha + .002, this.ta);
      if (this.alpha >= this.ta) this.fi = false;
    }
    if (this.life > this.ml * .75) this.alpha = Math.max(0, this.alpha - .0015);
    if (this.life > this.ml || this.y < -100) this.reset(false);
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.globalAlpha  = this.alpha;
    ctx.strokeStyle  = rCol(this.alpha);
    ctx.fillStyle    = rCol(this.alpha * .3);
    ctx.lineWidth    = 1;
    const s = this.sz;
    ctx.beginPath();
    switch (this.type) {
      case 'square':
        ctx.rect(-s/2, -s/2, s, s); break;
      case 'circle':
        ctx.arc(0, 0, s/2, 0, Math.PI*2); break;
      case 'triangle':
        ctx.moveTo(0, -s/2); ctx.lineTo(s/2, s/2); ctx.lineTo(-s/2, s/2);
        ctx.closePath(); break;
      case 'diamond':
        ctx.moveTo(0, -s/2); ctx.lineTo(s/2, 0);
        ctx.lineTo(0, s/2);  ctx.lineTo(-s/2, 0);
        ctx.closePath(); break;
    }
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

function resize() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

const shapes = Array.from({ length: 28 }, () => new Shape());
let pulseT = 0;

function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Subtle grid
  ctx.save();
  ctx.strokeStyle = 'rgba(26,24,20,.025)';
  ctx.lineWidth   = .5;
  for (let x = 0; x < canvas.width;  x += 80) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
  for (let y = 0; y < canvas.height; y += 80) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(canvas.width, y);  ctx.stroke(); }
  ctx.restore();

  // Shapes
  shapes.forEach(s => { s.update(); s.draw(); });

  // Pulse rings
  pulseT += .007;
  const mx = canvas.width/2, my = canvas.height/2;
  const r  = 110 + Math.sin(pulseT) * 16;
  const a  = .04  + Math.sin(pulseT * .7) * .018;
  ctx.save();
  ctx.beginPath(); ctx.arc(mx, my, r, 0, Math.PI*2);
  ctx.strokeStyle = `rgba(200,169,110,${a})`; ctx.lineWidth = 1; ctx.stroke();
  ctx.beginPath(); ctx.arc(mx, my, r * .6, 0, Math.PI*2);
  ctx.strokeStyle = `rgba(123,158,166,${a*.7})`; ctx.lineWidth = .5; ctx.stroke();
  ctx.restore();

  // Vignette
  const grd = ctx.createRadialGradient(mx, my, canvas.width*.22, mx, my, canvas.width*.72);
  grd.addColorStop(0, 'rgba(245,242,236,0)');
  grd.addColorStop(1, 'rgba(245,242,236,.5)');
  ctx.save(); ctx.fillStyle = grd; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.restore();

  requestAnimationFrame(loop);
}
loop();

// ── Navigation ──
document.getElementById('btn-start').addEventListener('click', () => {
  document.body.classList.add('exiting');
  setTimeout(() => { window.location.href = 'game.html'; }, 580);
});

// ── Credits modal ──
const modal    = document.getElementById('credits-modal');
const backdrop = document.getElementById('credits-backdrop');
const btnOpen  = document.getElementById('btn-credits');
const btnClose = document.getElementById('btn-credits-close');

function openCredits()  { modal.classList.add('open');    modal.setAttribute('aria-hidden','false'); }
function closeCredits() { modal.classList.remove('open'); modal.setAttribute('aria-hidden','true'); }

btnOpen?.addEventListener('click',  openCredits);
btnClose?.addEventListener('click', closeCredits);
backdrop?.addEventListener('click', closeCredits);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeCredits(); });
