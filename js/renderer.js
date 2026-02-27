// ============================================================
// renderer.js — Rendu isométrique Canvas 2D
// ============================================================

import { getTileVerts, darken, lerpColor } from './utils.js';

const TW    = 92;   // tile width
const TH    = 54;   // tile height (face top)
const DEPTH = 14;   // side face depth

export class Renderer {
  constructor(canvas) {
    this.canvas  = canvas;
    this.ctx     = canvas.getContext('2d');
    this.originX = 0;
    this.originY = 0;
    this.time    = 0;
    this.resize();
  }

  resize() {
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this._recalcOrigin();
  }

  _recalcOrigin() {
    const g = 6;
    const gridH = (g-1) * TH/2 + TH/2 + DEPTH;
    this.originX = this.canvas.width  / 2;
    this.originY = (this.canvas.height - gridH) / 2 + 15;
  }

  // ── Draw one tile ──────────────────────────────────────────
  drawTile(col, row, cell) {
    const ctx = this.ctx;
    const v   = getTileVerts(col, row, TW, TH, this.originX, this.originY);
    const lz  = cell?.levitateZ || 0;

    const isStart = cell?.isStart;
    const isExit  = cell?.isExit;
    const mc      = cell?.currentColor;

    // Color palette
    let top  = '#EAE5DC', side = '#D0C9BC', edge = '#B8B0A3';
    if (isStart) { top = '#A8C4B0'; side = '#7A9E84'; edge = '#6A9070'; }
    else if (isExit) { top = '#C8A96E'; side = '#A07840'; edge = '#88622A'; }
    else if (mc)     { top = mc; side = darken(mc, .22); edge = darken(mc, .38); }

    // Right side face
    ctx.beginPath();
    ctx.moveTo(v.right.x,  v.right.y  - lz);
    ctx.lineTo(v.bottom.x, v.bottom.y - lz);
    ctx.lineTo(v.bottom.x, v.bottom.y + DEPTH - lz);
    ctx.lineTo(v.right.x,  v.right.y  + DEPTH - lz);
    ctx.closePath(); ctx.fillStyle = side; ctx.fill();

    // Left side face
    ctx.beginPath();
    ctx.moveTo(v.left.x,   v.left.y   - lz);
    ctx.lineTo(v.bottom.x, v.bottom.y - lz);
    ctx.lineTo(v.bottom.x, v.bottom.y + DEPTH - lz);
    ctx.lineTo(v.left.x,   v.left.y   + DEPTH - lz);
    ctx.closePath(); ctx.fillStyle = edge; ctx.fill();

    // Top face — with special handling for rotating tiles
    const hasRot = cell?.rotAngle;
    if (hasRot && mc) {
      // Clip to tile shape, draw floor + rotated inner square
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(v.top.x,    v.top.y    - lz);
      ctx.lineTo(v.right.x,  v.right.y  - lz);
      ctx.lineTo(v.bottom.x, v.bottom.y - lz);
      ctx.lineTo(v.left.x,   v.left.y   - lz);
      ctx.closePath(); ctx.clip();

      ctx.fillStyle = '#EAE5DC'; ctx.fill();

      const cx = (v.top.x + v.bottom.x) / 2;
      const cy = (v.top.y - lz + v.bottom.y - lz) / 2;
      ctx.save();
      ctx.translate(cx, cy); ctx.rotate(cell.rotAngle);
      ctx.beginPath(); ctx.rect(-TW*.28, -TH*.28, TW*.56, TH*.56);
      ctx.fillStyle = mc; ctx.fill();
      ctx.restore();
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.moveTo(v.top.x,    v.top.y    - lz);
      ctx.lineTo(v.right.x,  v.right.y  - lz);
      ctx.lineTo(v.bottom.x, v.bottom.y - lz);
      ctx.lineTo(v.left.x,   v.left.y   - lz);
      ctx.closePath(); ctx.fillStyle = top; ctx.fill();
    }

    // Outline
    ctx.beginPath();
    ctx.moveTo(v.top.x,    v.top.y    - lz);
    ctx.lineTo(v.right.x,  v.right.y  - lz);
    ctx.lineTo(v.bottom.x, v.bottom.y - lz);
    ctx.lineTo(v.left.x,   v.left.y   - lz);
    ctx.closePath();
    ctx.strokeStyle = 'rgba(180,172,162,.38)'; ctx.lineWidth = .7; ctx.stroke();

    // Joker shimmer (blinking tiles marked as joker)
    if (cell?.isJoker && cell.blinkVisible) {
      ctx.beginPath();
      ctx.moveTo(v.top.x,    v.top.y    - lz);
      ctx.lineTo(v.right.x,  v.right.y  - lz);
      ctx.lineTo(v.bottom.x, v.bottom.y - lz);
      ctx.lineTo(v.left.x,   v.left.y   - lz);
      ctx.closePath();
      ctx.fillStyle = 'rgba(180,180,255,.2)'; ctx.fill();
      // Star symbol at center
      const cx = (v.top.x + v.bottom.x) / 2;
      const cy = (v.top.y - lz + v.bottom.y - lz) / 2;
      this._drawStar(cx, cy, TW*.13, TW*.06, 'rgba(200,200,255,.75)');
    }

    // Exit glow
    if (isExit) {
      const pulse = .09 + Math.sin(this.time * .05) * .05;
      const cx = (v.top.x + v.bottom.x) / 2;
      const cy = (v.top.y - lz + v.bottom.y - lz) / 2;
      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, TW*.55);
      grd.addColorStop(0, `rgba(200,169,110,${pulse+.18})`);
      grd.addColorStop(1, 'rgba(200,169,110,0)');
      ctx.beginPath();
      ctx.moveTo(v.top.x, v.top.y-lz); ctx.lineTo(v.right.x, v.right.y-lz);
      ctx.lineTo(v.bottom.x, v.bottom.y-lz); ctx.lineTo(v.left.x, v.left.y-lz);
      ctx.closePath(); ctx.fillStyle = grd; ctx.fill();
    }

    // Start label
    if (isStart) {
      ctx.save();
      ctx.font = `${TW*.13}px Raleway,sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,.5)';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('START', v.top.x, v.top.y - lz + TH*.22);
      ctx.restore();
    }
  }

  // ── Draw full grid (painter's order) ──────────────────────
  drawGrid(grid) {
    const g = 6;
    const order = [];
    for (let r = 0; r < g; r++) for (let c = 0; c < g; c++) order.push([c, r]);
    order.sort((a, b) => (a[0]+a[1]) - (b[0]+b[1]));
    for (const [c, r] of order) this.drawTile(c, r, grid[r][c]);
  }

  // ── Draw player sphere ────────────────────────────────────
  drawPlayer(player) {
    if (!player || player.dead) return;
    const ctx = this.ctx;
    const v   = getTileVerts(player.visualCol, player.visualRow, TW, TH, this.originX, this.originY);
    const cx  = (v.top.x + v.bottom.x) / 2;
    const cy  = v.top.y + TH * .22;
    const lev = player.levOffset;
    const r   = TW * .19;
    const sy  = cy - lev;

    // Shadow
    const sa = Math.max(.03, .13 - lev * .003);
    ctx.beginPath();
    ctx.ellipse(cx, sy + r*.32, r*.88, r*.27, 0, 0, Math.PI*2);
    ctx.fillStyle = `rgba(26,24,20,${sa})`; ctx.fill();

    // Sphere body
    const grd = ctx.createRadialGradient(cx-r*.3, sy-r-r*.32, r*.04, cx, sy-r, r);
    grd.addColorStop(0,   'rgba(255,255,255,1)');
    grd.addColorStop(.42, 'rgba(232,229,222,1)');
    grd.addColorStop(1,   'rgba(188,183,175,1)');
    ctx.beginPath(); ctx.arc(cx, sy-r, r, 0, Math.PI*2);
    ctx.fillStyle = grd; ctx.fill();
    ctx.strokeStyle = 'rgba(160,155,148,.28)'; ctx.lineWidth = .5; ctx.stroke();

    // Specular highlight
    ctx.beginPath(); ctx.arc(cx-r*.3, sy-r-r*.32, r*.2, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fill();
  }

  // ── Full render frame ─────────────────────────────────────
  render(grid, player) {
    this.time++;
    this.ctx.fillStyle = '#F5F2EC';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    if (grid) this.drawGrid(grid);
    this.drawPlayer(player);
  }

  // ── Helpers ───────────────────────────────────────────────
  _drawStar(cx, cy, outer, inner, color) {
    const ctx = this.ctx;
    const pts = 4;
    ctx.save(); ctx.beginPath();
    for (let i = 0; i < pts*2; i++) {
      const r = i%2===0 ? outer : inner;
      const a = i * Math.PI/pts - Math.PI/2;
      i===0 ? ctx.moveTo(cx+r*Math.cos(a), cy+r*Math.sin(a))
            : ctx.lineTo(cx+r*Math.cos(a), cy+r*Math.sin(a));
    }
    ctx.closePath(); ctx.fillStyle = color; ctx.fill(); ctx.restore();
  }
}
