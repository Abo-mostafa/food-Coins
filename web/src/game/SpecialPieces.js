// Special piece rules. Pure logic, no rendering.
export const ROWS = 8;
export const COLS = 5;

export const SPECIAL = Object.freeze({
  ROCKET: 'rocket',
  BOMB: 'bomb',
});

export const SPECIAL_RULES = Object.freeze({
  // A straight line of exactly 4 creates a rocket that clears its whole row.
  rocketRunLength: 4,
  // A straight line of 5+, or an L/T shape of 5+ pieces, creates a bomb.
  bombRunLength: 5,
  bombGroupSize: 5,
  // Bomb clears every cell within 2 steps (Manhattan distance <= 2): a fixed 13-cell diamond.
  bombRadius: 2,
});

export function specialForGroup(group) {
  if (group.maxRun >= SPECIAL_RULES.bombRunLength) return SPECIAL.BOMB;
  if (group.hasH && group.hasV && group.cells.length >= SPECIAL_RULES.bombGroupSize) return SPECIAL.BOMB;
  if (group.maxRun >= SPECIAL_RULES.rocketRunLength) return SPECIAL.ROCKET;
  return null;
}

export function specialArea(special, row, col, rows = ROWS, cols = COLS) {
  const cells = [];
  if (special === SPECIAL.ROCKET) {
    for (let c = 0; c < cols; c++) cells.push([row, c]);
  } else if (special === SPECIAL.BOMB) {
    const r0 = SPECIAL_RULES.bombRadius;
    for (let dr = -r0; dr <= r0; dr++) {
      for (let dc = -r0; dc <= r0; dc++) {
        if (Math.abs(dr) + Math.abs(dc) > r0) continue;
        const r = row + dr;
        const c = col + dc;
        if (r >= 0 && r < rows && c >= 0 && c < cols) cells.push([r, c]);
      }
    }
  }
  return cells;
}
