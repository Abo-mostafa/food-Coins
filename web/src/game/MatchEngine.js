// Deterministic Match-3 engine. No rendering, no DOM, no Firebase.
// The same engine runs in the browser (for play + animation steps) and in
// Cloud Functions (to replay the move list and verify a win before paying coins).
import { createRng } from './rng.js';
import { ROWS, COLS, SPECIAL, specialArea, specialForGroup } from './SpecialPieces.js';
import { SCORING, goalsComplete } from './LevelConfig.js';

const MAX_CASCADES = 60;

export class MatchEngine {
  constructor({ level, seed, rows = ROWS, cols = COLS }) {
    this.level = level;
    this.rows = rows;
    this.cols = cols;
    this.types = level.types;
    this.rng = createRng(seed);
    this.nextId = 1;
    this.movesLeft = level.moves;
    this.movesUsed = 0;
    this.score = 0;
    this.collected = Object.fromEntries(this.types.map((t) => [t, 0]));
    this.status = 'playing';
    this.moveLog = [];
    this.grid = this._generateBoard();
  }

  // ---------- public API ----------

  get(r, c) {
    return this.grid[r]?.[c] ?? null;
  }

  snapshot() {
    return this.grid.map((row) => row.map((p) => (p ? { ...p } : null)));
  }

  isAdjacent(r1, c1, r2, c2) {
    return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
  }

  inBounds(r, c) {
    return r >= 0 && r < this.rows && c >= 0 && c < this.cols;
  }

  /**
   * Attempt to swap two adjacent cells.
   * Returns { valid:false, reason } without consuming a move when the swap makes no match,
   * or { valid:true, steps, status, ... } describing every cascade for the renderer.
   */
  trySwap(r1, c1, r2, c2) {
    if (this.status !== 'playing') return { valid: false, reason: 'not-playing' };
    if (!this.inBounds(r1, c1) || !this.inBounds(r2, c2)) return { valid: false, reason: 'out-of-bounds' };
    if (!this.isAdjacent(r1, c1, r2, c2)) return { valid: false, reason: 'not-adjacent' };

    this._swapCells(r1, c1, r2, c2);
    const a = this.grid[r1][c1];
    const b = this.grid[r2][c2];
    const forced = [];
    if (a.special) forced.push([r1, c1]);
    if (b.special) forced.push([r2, c2]);

    if (forced.length === 0 && this._findGroups().length === 0) {
      this._swapCells(r1, c1, r2, c2);
      return { valid: false, reason: 'no-match' };
    }

    this.movesUsed++;
    this.movesLeft--;
    this.moveLog.push([r1, c1, r2, c2]);

    const steps = this._resolve([[r1, c1], [r2, c2]], forced);
    let bonus = 0;

    if (goalsComplete(this.level, this.collected)) {
      this.status = 'won';
      bonus = this.movesLeft * SCORING.movesLeftBonus;
      this.score += bonus;
    } else if (this.movesLeft <= 0) {
      this.status = 'lost';
    } else if (!this.hasPossibleMove()) {
      steps.push(this._shuffle());
    }

    return {
      valid: true,
      steps,
      status: this.status,
      score: this.score,
      movesLeft: this.movesLeft,
      movesBonus: bonus,
      collected: { ...this.collected },
    };
  }

  hasPossibleMove() {
    return this.findMove() !== null;
  }

  findMove() {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const options = [
          [r, c + 1],
          [r + 1, c],
        ];
        for (const [r2, c2] of options) {
          if (!this.inBounds(r2, c2)) continue;
          if (this.grid[r][c].special || this.grid[r2][c2].special) return [r, c, r2, c2];
          this._swapCells(r, c, r2, c2);
          const ok = this._findGroups().length > 0;
          this._swapCells(r, c, r2, c2);
          if (ok) return [r, c, r2, c2];
        }
      }
    }
    return null;
  }

  result() {
    return {
      status: this.status,
      score: this.score,
      movesUsed: this.movesUsed,
      movesLeft: this.movesLeft,
      collected: { ...this.collected },
    };
  }

  clone() {
    const copy = Object.create(MatchEngine.prototype);
    Object.assign(copy, this);
    copy.rng = createRng(0);
    copy.rng.state = this.rng.state;
    copy.grid = this.snapshot();
    copy.collected = { ...this.collected };
    copy.moveLog = this.moveLog.map((m) => [...m]);
    return copy;
  }

  // ---------- board generation ----------

  _newPiece(type, special = null) {
    return { id: this.nextId++, type, special };
  }

  _randomType() {
    return this.types[this.rng.int(this.types.length)];
  }

  _generateBoard() {
    for (let attempt = 0; attempt < 200; attempt++) {
      this.grid = Array.from({ length: this.rows }, () => Array(this.cols).fill(null));
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          let type;
          let guard = 0;
          do {
            type = this._randomType();
            guard++;
          } while (guard < 20 && this._wouldMatchAt(r, c, type));
          this.grid[r][c] = this._newPiece(type);
        }
      }
      if (this._findGroups().length === 0 && this.hasPossibleMove()) return this.grid;
    }
    return this.grid;
  }

  _wouldMatchAt(r, c, type) {
    const g = this.grid;
    if (c >= 2 && g[r][c - 1]?.type === type && g[r][c - 2]?.type === type) return true;
    if (r >= 2 && g[r - 1][c]?.type === type && g[r - 2][c]?.type === type) return true;
    return false;
  }

  _swapCells(r1, c1, r2, c2) {
    const tmp = this.grid[r1][c1];
    this.grid[r1][c1] = this.grid[r2][c2];
    this.grid[r2][c2] = tmp;
  }

  // ---------- matching ----------

  _findRuns() {
    const runs = [];
    const g = this.grid;
    for (let r = 0; r < this.rows; r++) {
      let c = 0;
      while (c < this.cols) {
        const t = g[r][c]?.type;
        let len = 1;
        while (t && c + len < this.cols && g[r][c + len]?.type === t) len++;
        if (t && len >= 3) runs.push({ dir: 'h', len, cells: Array.from({ length: len }, (_, i) => [r, c + i]) });
        c += len;
      }
    }
    for (let c = 0; c < this.cols; c++) {
      let r = 0;
      while (r < this.rows) {
        const t = g[r][c]?.type;
        let len = 1;
        while (t && r + len < this.rows && g[r + len][c]?.type === t) len++;
        if (t && len >= 3) runs.push({ dir: 'v', len, cells: Array.from({ length: len }, (_, i) => [r + i, c]) });
        r += len;
      }
    }
    return runs;
  }

  _findGroups() {
    const runs = this._findRuns();
    if (runs.length === 0) return [];
    const groups = [];
    const owner = new Map();
    for (const run of runs) {
      const touching = new Set();
      for (const [r, c] of run.cells) {
        const k = r * this.cols + c;
        if (owner.has(k)) touching.add(owner.get(k));
      }
      let target;
      if (touching.size === 0) {
        target = { keys: new Set(), maxRun: 0, hasH: false, hasV: false };
        groups.push(target);
      } else {
        const list = [...touching];
        target = list[0];
        for (const other of list.slice(1)) {
          for (const k of other.keys) {
            target.keys.add(k);
            owner.set(k, target);
          }
          target.maxRun = Math.max(target.maxRun, other.maxRun);
          target.hasH ||= other.hasH;
          target.hasV ||= other.hasV;
          groups.splice(groups.indexOf(other), 1);
        }
      }
      for (const [r, c] of run.cells) {
        const k = r * this.cols + c;
        target.keys.add(k);
        owner.set(k, target);
      }
      target.maxRun = Math.max(target.maxRun, run.len);
      if (run.dir === 'h') target.hasH = true;
      else target.hasV = true;
    }
    return groups.map((g) => ({
      ...g,
      cells: [...g.keys].map((k) => [Math.floor(k / this.cols), k % this.cols]),
    }));
  }

  _pickSpecialCell(group, preferred) {
    for (const [pr, pc] of preferred) {
      if (group.keys.has(pr * this.cols + pc)) return [pr, pc];
    }
    // Deterministic fallback: lowest row, then rightmost-first in RTL reading order.
    let best = group.cells[0];
    for (const cell of group.cells) {
      if (cell[0] > best[0] || (cell[0] === best[0] && cell[1] < best[1])) best = cell;
    }
    return best;
  }

  // ---------- resolution ----------

  _resolve(swapCells, forced) {
    const steps = [];
    let combo = 0;
    let first = true;

    while (combo < MAX_CASCADES) {
      const groups = this._findGroups();
      const forcedNow = first ? forced : [];
      if (groups.length === 0 && forcedNow.length === 0) break;
      combo++;

      const clear = new Set();
      const creations = [];
      const activations = [];
      let scoreGain = 0;

      for (const group of groups) {
        for (const key of group.keys) clear.add(key);
        const special = this._specialAllowed(specialForGroup(group));
        if (special) {
          const [r, c] = this._pickSpecialCell(group, first ? swapCells : []);
          creations.push({ r, c, special, type: this.grid[r][c].type });
          scoreGain += special === SPECIAL.BOMB ? SCORING.bombCreated : SCORING.rocketCreated;
        }
      }

      const queue = [];
      for (const [r, c] of forcedNow) {
        clear.add(r * this.cols + c);
        queue.push([r, c]);
      }
      for (const key of clear) {
        const r = Math.floor(key / this.cols);
        const c = key % this.cols;
        const p = this.grid[r][c];
        if (p?.special && !forcedNow.some(([fr, fc]) => fr === r && fc === c)) queue.push([r, c]);
      }

      const activated = new Set();
      while (queue.length) {
        const [r, c] = queue.shift();
        const key = r * this.cols + c;
        const piece = this.grid[r][c];
        if (!piece?.special || activated.has(key)) continue;
        activated.add(key);
        const area = specialArea(piece.special, r, c, this.rows, this.cols);
        activations.push({ r, c, id: piece.id, special: piece.special, area });
        scoreGain += SCORING.specialActivated;
        for (const [ar, ac] of area) {
          const ak = ar * this.cols + ac;
          clear.add(ak);
          if (this.grid[ar][ac]?.special && !activated.has(ak)) queue.push([ar, ac]);
        }
      }

      const cleared = [];
      for (const key of clear) {
        const r = Math.floor(key / this.cols);
        const c = key % this.cols;
        const p = this.grid[r][c];
        if (!p) continue;
        cleared.push({ r, c, id: p.id, type: p.type, special: p.special });
        if (this.collected[p.type] !== undefined) this.collected[p.type]++;
        this.grid[r][c] = null;
      }
      scoreGain += cleared.length * SCORING.perPiece * combo;

      const created = creations.map(({ r, c, special, type }) => {
        const piece = this._newPiece(type, special);
        this.grid[r][c] = piece;
        return { r, c, ...piece };
      });

      const { falls, spawns } = this._applyGravity();
      this.score += scoreGain;
      steps.push({ combo, cleared, activations, created, falls, spawns, scoreGain, score: this.score });
      first = false;
    }
    return steps;
  }

  _specialAllowed(special) {
    if (!special) return null;
    const allowed = this.level.specials ?? { rocket: true, bomb: true };
    return allowed[special] ? special : null;
  }

  _applyGravity() {
    const falls = [];
    const spawns = [];
    for (let c = 0; c < this.cols; c++) {
      let write = this.rows - 1;
      for (let r = this.rows - 1; r >= 0; r--) {
        const p = this.grid[r][c];
        if (!p) continue;
        if (r !== write) {
          this.grid[write][c] = p;
          this.grid[r][c] = null;
          falls.push({ id: p.id, c, from: r, to: write });
        }
        write--;
      }
      const missing = write + 1;
      for (let r = write; r >= 0; r--) {
        const piece = this._newPiece(this._randomType());
        this.grid[r][c] = piece;
        spawns.push({ ...piece, r, c, from: r - missing });
      }
    }
    return { falls, spawns };
  }

  _shuffle() {
    const pieces = [];
    for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) pieces.push(this.grid[r][c]);
    for (let attempt = 0; attempt < 100; attempt++) {
      for (let i = pieces.length - 1; i > 0; i--) {
        const j = this.rng.int(i + 1);
        [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
      }
      let i = 0;
      for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) this.grid[r][c] = pieces[i++];
      if (this._findGroups().length === 0 && this.hasPossibleMove()) break;
      if (attempt === 99) {
        for (const p of pieces) p.type = this._randomType();
      }
    }
    const positions = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) positions.push({ id: this.grid[r][c].id, r, c, type: this.grid[r][c].type });
    }
    return { shuffle: true, positions };
  }
}

/**
 * Replay a full move list from a seed. Used by the server to verify a claimed win.
 * Returns the final result, or { status: 'invalid' } if any move is illegal.
 */
export function replayLevel(level, seed, moves) {
  const engine = new MatchEngine({ level, seed });
  if (!Array.isArray(moves) || moves.length > level.moves) return { status: 'invalid', reason: 'too-many-moves' };
  for (let i = 0; i < moves.length; i++) {
    const m = moves[i];
    if (!Array.isArray(m) || m.length !== 4 || !m.every((n) => Number.isInteger(n))) {
      return { status: 'invalid', reason: 'bad-move', index: i };
    }
    if (engine.status !== 'playing') return { status: 'invalid', reason: 'moves-after-end', index: i };
    const res = engine.trySwap(m[0], m[1], m[2], m[3]);
    if (!res.valid) return { status: 'invalid', reason: res.reason, index: i };
  }
  return engine.result();
}
