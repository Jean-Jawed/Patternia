// ============================================================
// level.js — Chargement et parsing d'un niveau JSON
// ============================================================

export class LevelLoader {
  /**
   * Charge un niveau par numéro.
   * Retourne { levelData, grid } ou null si erreur.
   */
  async load(num) {
    const pad = String(num).padStart(2, '0');
    const url = `data/levels/level_${pad}.json`;
    try {
      const res  = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return { levelData: data, grid: this._buildGrid(data) };
    } catch (e) {
      console.error(`[level] Cannot load ${url}:`, e);
      return null;
    }
  }

  /**
   * Construit la grille 2D [row][col] depuis le JSON.
   * Chaque cellule est un objet avec toutes les propriétés
   * nécessaires au renderer et au moteur de règles.
   */
  _buildGrid(data) {
    const sz = data.grid_size || 6;

    // Grille vide
    const grid = Array.from({ length: sz }, (_, r) =>
      Array.from({ length: sz }, (_, c) => ({
        col: c, row: r,
        id: null,
        mechType:       null,
        mechanic_params: {},
        baseColor:      null,
        currentColor:   null,
        levitateZ:      0,
        rotAngle:       0,
        pulseScale:     1,
        blinkVisible:   true,
        isStart:        false,
        isExit:         false,
        isJoker:        false,
      }))
    );

    // Cases spéciales
    const [sc, sr] = data.start || [0, 0];
    const [ec, er] = data.exit  || [sz-1, sz-1];
    grid[sr][sc].isStart = true;
    grid[er][ec].isExit  = true;

    // Cellules définies dans le JSON
    for (const cell of (data.cells || [])) {
      const [col, row] = cell.position;
      if (row < 0 || row >= sz || col < 0 || col >= sz) continue;

      const g = grid[row][col];
      g.id              = cell.id;
      g.mechType        = cell.mechanic        || null;
      g.mechanic_params = cell.mechanic_params || {};
      g.baseColor       = g.mechanic_params.color || null;
      g.currentColor    = g.baseColor;

      // Joker : case clignotante identifiée comme joker dans le JSON
      g.isJoker = cell.joker === true;
    }

    return grid;
  }
}
