// ============================================================
// mechanics.js — Moteur d'animations visuelles des tuiles
// Met à jour cell.currentColor, cell.levitateZ,
// cell.rotAngle, cell.blinkVisible, etc. à chaque frame
// ============================================================

import { lerpColor, colorKey } from './utils.js';

export class MechanicsEngine {
  constructor() {
    this.time = 0;
  }

  update(grid) {
    this.time++;
    const t = this.time;

    for (const row of grid) {
      for (const cell of row) {
        if (!cell || cell.isStart || cell.isExit) {
          cell.levitateZ = 0;
          continue;
        }

        const m = cell.mechType;
        const p = cell.mechanic_params || {};
        cell.levitateZ = 0;

        if (!m) { cell.currentColor = cell.baseColor; continue; }

        switch (m) {

          case 'solid_color':
            cell.currentColor = p.color || '#888';
            break;

          case 'blinking': {
            const on = Math.sin(t * (p.speed || .04) * Math.PI * 2) > 0;
            cell.currentColor  = on ? (p.color || '#888') : null;
            cell.blinkVisible  = on;
            break;
          }

          case 'rotating_cw':
            cell.currentColor = p.color || '#888';
            cell.rotAngle     = (t * (p.speed || .025)) % (Math.PI * 2);
            break;

          case 'rotating_ccw':
            cell.currentColor = p.color || '#888';
            cell.rotAngle     = -(t * (p.speed || .025)) % (Math.PI * 2);
            break;

          case 'levitating': {
            const amp  = p.amplitude  || 8;
            const freq = p.frequency  || .03;
            cell.currentColor = p.color || '#888';
            cell.levitateZ    = amp + Math.sin(t * freq * Math.PI * 2) * amp * .5;
            break;
          }

          case 'pulsing': {
            const spd = p.speed     || .03;
            const mn  = p.min_scale || .75;
            const mx  = p.max_scale || 1.0;
            cell.currentColor = p.color || '#888';
            cell.pulseScale   = mn + (Math.sin(t * spd * Math.PI * 2) * .5 + .5) * (mx - mn);
            break;
          }

          case 'multicolor': {
            const cols = p.colors || ['#E74C3C', '#4A90D9', '#F5A623'];
            const spd  = p.speed  || .01;
            cell.currentColor = cols[Math.floor(t * spd) % cols.length];
            break;
          }

          case 'color_shift': {
            const fac = Math.sin(t * (p.speed || .02) * Math.PI * 2) * .5 + .5;
            cell.currentColor = lerpColor(p.color_from || '#4A90D9', p.color_to || '#E74C3C', fac);
            break;
          }

          default:
            cell.currentColor = cell.baseColor;
        }
      }
    }
  }
}
