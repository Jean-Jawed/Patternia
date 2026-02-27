// ============================================================
// renderer.js — Rendu isométrique Canvas 2D
// TW / TH / DEPTH sont calculés dynamiquement au resize
// pour s'adapter à tous les viewports sans toucher au desktop
// ============================================================

import { getTileVerts, darken, lerpColor } from './utils.js';

const GRID = 6;  // nombre de tuiles côté

export class Renderer {
  constructor(canvas) {
    this.canvas  = canvas;
    this.ctx     = canvas.getContext('2d');
    this.originX = 0;
    this.originY = 0;
    this.time    = 0;
    // Tile dimensions — recalculées au resize
    this.TW    = 92;
    this.TH    = 54;
    this.DEPTH = 14;
    this.resize();
  }

  resize() {
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this._recalcTileSize();
    this._recalcOrigin();
  }

  // ── Calcul responsive des dimensions de tuile ─────────────
  // Sur desktop  : TW=92 (inchangé)
  // Sur mobile   : réduit pour que la grille tienne dans la
  //                zone disponible (viewport - HUD - dpad)
  _recalcTileSize() {
    const W = this.canvas.width;
    const H = this.canvas.height;
    const isMobile = W < 768;

    // Marges réservées (px) selon contexte
    const hudH  = isMobile ? 60  : 70;   // espace HUD en haut
    const dpadH = isMobile ? 200 : 0;    // espace D-pad en bas
    const padH  = isMobile ? 20  : 30;   // marge verticale supplémentaire
    const padW  = isMobile ? 24  : 60;   // marge horizontale

    const availW = W - padW * 2;
    const availH = H - hudH - dpadH - padH;

    // La grille iso a ces dimensions en fonction de TW/TH :
    //   largeur totale  = (GRID-1+1) * TW   = GRID * TW
    //   hauteur totale  = (GRID-1) * TH/2 + TH/2 + DEPTH
    //                   = (GRID - 0.5) * TH/2 + DEPTH
    // On veut TW max tel que la grille tienne dans availW et availH
    // Rapport TH/TW = 54/92 ≈ 0.587, DEPTH/TW = 14/92 ≈ 0.152

    const TH_RATIO    = 54 / 92;
    const DEPTH_RATIO = 14 / 92;

    const twFromW = availW / GRID;
    const twFromH = availH / ((GRID - 0.5) * TH_RATIO / 2 + DEPTH_RATIO);

    let tw = Math.min(twFromW, twFromH);

    // Desktop : jamais plus grand que la valeur de référence
    if (!isMobile) tw = Math.min(tw, 92);
    // Mobile  : on peut descendre jusqu'à 36 pour les très petits écrans
    tw = Math.max(tw, 36);

    this.TW    = Math.round(tw);
    this.TH    = Math.round(tw * TH_RATIO);
    this.DEPTH = Math.round(tw * DEPTH_RATIO);
  }

  _recalcOrigin() {
    const { TW, TH, DEPTH } = this;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const isMobile = W < 768;

    const hudH  = isMobile ? 60  : 70;
    const dpadH = isMobile ? 200 : 0;

    const gridH = (GRID - 0.5) * TH / 2 + DEPTH;
    const availH = H - hudH - dpadH;

    this.originX = W / 2;
    this.originY = hudH + (availH - gridH) / 2 + TH / 4;
  }

  // ── Draw one tile ──────────────────────────────────────────
  drawTile(col, row, cell) {
    const { TW, TH, DEPTH } = this;
    const ctx = this.ctx;
    const v   = getTileVerts(col, row, TW, TH, this.originX, this.originY);
    const lz  = cell?.levitateZ || 0;

    const isStart = cell?.isStart;
    const isExit  = cell?.isExit;
    const mc      = cell?.currentColor;

    let top  = '#EAE5DC', side = '#D0C9BC', edge = '#B8B0A3';
    if (isStart)      { top = '#A8C4B0'; side = '#7A9E84'; edge = '#6A9070'; }
    else if (isExit)  { top = '#C8A96E'; side = '#A07840'; edge = '#88622A'; }
    else if (mc)      { top = mc; side = darken(mc, .22); edge = darken(mc, .38); }

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

    // Top face
    const hasRot = cell?.rotAngle;
    if (hasRot && mc) {
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

    // Joker shimmer
    if (cell?.isJoker && cell.blinkVisible) {
      ctx.beginPath();
      ctx.moveTo(v.top.x,    v.top.y    - lz);
      ctx.lineTo(v.right.x,  v.right.y  - lz);
      ctx.lineTo(v.bottom.x, v.bottom.y - lz);
      ctx.lineTo(v.left.x,   v.left.y   - lz);
      ctx.closePath();
      ctx.fillStyle = 'rgba(180,180,255,.2)'; ctx.fill();
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
    const order = [];
    for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) order.push([c, r]);
    order.sort((a, b) => (a[0]+a[1]) - (b[0]+b[1]));
    for (const [c, r] of order) this.drawTile(c, r, grid[r][c]);
  }

  // ── Draw player sphere ────────────────────────────────────
  drawPlayer(player) {
    if (!player || player.dead) return;
    const { TW, TH } = this;
    const ctx = this.ctx;
    const v   = getTileVerts(player.visualCol, player.visualRow, TW, TH, this.originX, this.originY);
    const cx  = (v.top.x + v.bottom.x) / 2;
    const cy  = v.top.y + TH * .22;
    const lev = player.levOffset;
    const r   = TW * .19;
    const sy  = cy - lev;

    const sa = Math.max(.03, .13 - lev * .003);
    ctx.beginPath();
    ctx.ellipse(cx, sy + r*.32, r*.88, r*.27, 0, 0, Math.PI*2);
    ctx.fillStyle = `rgba(26,24,20,${sa})`; ctx.fill();

    const grd = ctx.createRadialGradient(cx-r*.3, sy-r-r*.32, r*.04, cx, sy-r, r);
    grd.addColorStop(0,   'rgba(255,255,255,1)');
    grd.addColorStop(.42, 'rgba(232,229,222,1)');
    grd.addColorStop(1,   'rgba(188,183,175,1)');
    ctx.beginPath(); ctx.arc(cx, sy-r, r, 0, Math.PI*2);
    ctx.fillStyle = grd; ctx.fill();
    ctx.strokeStyle = 'rgba(160,155,148,.28)'; ctx.lineWidth = .5; ctx.stroke();

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
    const { ctx } = this;
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
