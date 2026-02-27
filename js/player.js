// ============================================================
// player.js — Sphère joueur, déplacements, lévitation
// Gère aussi le comportement aux bords (border_behavior)
// ============================================================

import { lerp, easeInOut } from './utils.js';

const MOVE_FRAMES = 11;   // frames pour traverser une tuile
const LEV_AMP     = 8;    // amplitude de lévitation (px)
const LEV_FREQ    = .038; // fréquence oscillation

export class Player {
  constructor() {
    this.col        = 0;
    this.row        = 0;
    this.visualCol  = 0;
    this.visualRow  = 0;
    this.dead       = false;
    this.moving     = false;
    this.moveT      = 0;
    this.fromCol    = 0;
    this.fromRow    = 0;
    this.toCol      = 0;
    this.toRow      = 0;
    this.levTime    = 0;
    this.levOffset  = 0;

    // Callbacks (set by main.js)
    this.onLand         = null;  // (col, row) → void
    this.onBorderHit    = null;  // (direction) → void
  }

  // ── Place le joueur à une position de départ ──────────────
  reset(col, row) {
    this.col = this.visualCol = this.fromCol = this.toCol = col;
    this.row = this.visualRow = this.fromRow = this.toRow = row;
    this.dead   = false;
    this.moving = false;
    this.moveT  = 0;
  }

  teleport(col, row) {
    this.reset(col, row);
  }

  die() {
    this.dead   = true;
    this.moving = false;
  }

  // ── Mise à jour chaque frame ──────────────────────────────
  update(direction, gridSize, borderBehavior) {
    if (this.dead) return;

    // Lévitation
    this.levTime  += LEV_FREQ;
    this.levOffset = LEV_AMP + Math.sin(this.levTime) * LEV_AMP * .55;

    if (this.moving) {
      this._advanceMove();
    } else if (direction) {
      this._tryMove(direction, gridSize, borderBehavior);
    }
  }

  _tryMove(dir, gridSize, borderBehavior = 'kill') {
    let nc = this.col;
    let nr = this.row;

    if (dir === 'up')    nr--;
    if (dir === 'down')  nr++;
    if (dir === 'left')  nc--;
    if (dir === 'right') nc++;

    const outOfBounds = nc < 0 || nc >= gridSize || nr < 0 || nr >= gridSize;

    if (outOfBounds) {
      this._handleBorder(dir, nc, nr, gridSize, borderBehavior);
      return;
    }

    // Normal move
    this.fromCol = this.col;
    this.fromRow = this.row;
    this.toCol   = nc;
    this.toRow   = nr;
    this.moveT   = 0;
    this.moving  = true;
  }

  _handleBorder(dir, nc, nr, gridSize, behavior) {
    switch (behavior) {
      case 'kill':
        // Move toward border then die
        this.onBorderHit?.(dir);
        break;

      case 'block':
        // Silently ignore
        break;

      case 'wrap': {
        // Wrap around the grid
        const wc = ((nc % gridSize) + gridSize) % gridSize;
        const wr = ((nr % gridSize) + gridSize) % gridSize;
        this.fromCol = this.col;
        this.fromRow = this.row;
        this.toCol   = wc;
        this.toRow   = wr;
        this.moveT   = 0;
        this.moving  = true;
        break;
      }

      case 'exit':
        // Reaching any border = win (handled by rules engine via onBorderHit)
        this.onBorderHit?.(dir);
        break;

      default:
        // Default: block
        break;
    }
  }

  _advanceMove() {
    this.moveT += 1 / MOVE_FRAMES;
    if (this.moveT >= 1) {
      this.moveT     = 1;
      this.moving    = false;
      this.col       = this.toCol;
      this.row       = this.toRow;
      this.visualCol = this.toCol;
      this.visualRow = this.toRow;
      this.onLand?.(this.col, this.row);
    } else {
      const t        = easeInOut(this.moveT);
      this.visualCol = lerp(this.fromCol, this.toCol, t);
      this.visualRow = lerp(this.fromRow, this.toRow, t);
    }
  }
}
