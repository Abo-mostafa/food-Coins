import { describe, it, expect } from 'vitest';
import { MatchEngine, replayLevel } from '../src/game/MatchEngine.js';
import { LEVELS, getLevel, computeReward, goalsComplete } from '../src/game/LevelConfig.js';
import { SPECIAL, specialArea } from '../src/game/SpecialPieces.js';
import { playWithBot, allSwaps } from './bot.js';

const level = getLevel(1);

function setGrid(engine, rows) {
  engine.grid = rows.map((row) => row.map((ch) => engine._newPiece(ch === '.' ? 'x' + Math.random() : ch)));
}

function makeEngine(rows, lvl = { ...level, moves: 10, goals: [{ type: 'A', count: 99 }], types: ['A', 'B', 'C', 'D'] }) {
  const e = new MatchEngine({ level: lvl, seed: 42 });
  e.grid = rows.map((row) => [...row].map((ch) => e._newPiece(ch)));
  return e;
}

describe('board', () => {
  it('creates a 5x8 board with no initial matches and at least one move', () => {
    for (let seed = 1; seed < 50; seed++) {
      const e = new MatchEngine({ level, seed });
      expect(e.grid.length).toBe(8);
      expect(e.grid.every((r) => r.length === 5)).toBe(true);
      expect(e._findGroups()).toHaveLength(0);
      expect(e.hasPossibleMove()).toBe(true);
    }
  });

  it('is deterministic for the same seed', () => {
    const a = new MatchEngine({ level, seed: 777 });
    const b = new MatchEngine({ level, seed: 777 });
    expect(a.snapshot()).toEqual(b.snapshot());
  });
});

describe('swaps', () => {
  it('rejects a swap that makes no match and does not consume a move', () => {
    const e = makeEngine(['ABCDA', 'BCDAB', 'CDABC', 'DABCD', 'ABCDA', 'BCDAB', 'CDABC', 'DABCD']);
    const before = e.snapshot();
    const res = e.trySwap(0, 0, 0, 1);
    expect(res.valid).toBe(false);
    expect(e.movesLeft).toBe(10);
    expect(e.snapshot()).toEqual(before);
  });

  it('rejects non-adjacent swaps', () => {
    const e = new MatchEngine({ level, seed: 5 });
    expect(e.trySwap(0, 0, 2, 0).valid).toBe(false);
    expect(e.trySwap(0, 0, 1, 1).valid).toBe(false);
  });

  it('accepts a matching swap, consumes one move, clears pieces and refills', () => {
    const e = makeEngine(['BACDB', 'ABCDC', 'CDBAD', 'DCADB', 'BDCAB', 'CBDCA', 'DCBDC', 'BDCBD']);
    e.grid[0] = ['A', 'B', 'A', 'A', 'C'].map((t) => e._newPiece(t));
    const res = e.trySwap(0, 0, 0, 1);
    expect(res.valid).toBe(true);
    expect(e.movesLeft).toBe(9);
    expect(res.steps[0].cleared.length).toBeGreaterThanOrEqual(3);
    expect(e.grid.flat().every(Boolean)).toBe(true);
    expect(e.collected.A).toBeGreaterThanOrEqual(3);
  });
});

describe('specials', () => {
  it('match of 4 creates a rocket at the swapped cell', () => {
    const e = makeEngine(['BAAAB'.replace(/./g, (c, i) => (i === 0 ? 'A' : c)), 'CDCDC', 'DCDCD', 'CDCDC', 'DCDCD', 'CDCDC', 'DCDCD', 'CDCDC']);
    // row0: A A A A B -> already a match; build via swap instead
    e.grid[0] = ['B', 'A', 'A', 'A', 'C'].map((t) => e._newPiece(t));
    e.grid[1][0] = e._newPiece('A');
    const res = e.trySwap(0, 0, 1, 0);
    expect(res.valid).toBe(true);
    const created = res.steps[0].created;
    expect(created).toHaveLength(1);
    expect(created[0].special).toBe(SPECIAL.ROCKET);
    expect([created[0].r, created[0].c]).toEqual([0, 0]);
  });

  it('match of 5 creates a bomb', () => {
    const e = makeEngine(['ABAAA', 'BABCD', 'CDCDC', 'DCDCD', 'CDCDC', 'DCDCD', 'CDCDC', 'DCDCD']);
    const res = e.trySwap(0, 1, 1, 1);
    expect(res.valid).toBe(true);
    expect(res.steps[0].created[0].special).toBe(SPECIAL.BOMB);
  });

  it('rocket clears the whole row when activated by swapping', () => {
    const e = makeEngine(['ABCDA', 'BCDAB', 'CDABC', 'DABCD', 'ABCDA', 'BCDAB', 'CDABC', 'DABCD']);
    e.grid[4][2].special = SPECIAL.ROCKET;
    const res = e.trySwap(4, 2, 4, 3);
    expect(res.valid).toBe(true);
    const step = res.steps[0];
    expect(step.activations[0].special).toBe(SPECIAL.ROCKET);
    const rowCleared = step.cleared.filter((p) => p.r === 4);
    expect(rowCleared).toHaveLength(5);
  });

  it('bomb clears the fixed 13-cell diamond', () => {
    expect(specialArea(SPECIAL.BOMB, 4, 2)).toHaveLength(13);
    expect(specialArea(SPECIAL.BOMB, 0, 0)).toHaveLength(6);
  });

  it('specials chain-activate each other', () => {
    const e = makeEngine(['ABCDA', 'BCDAB', 'CDABC', 'DABCD', 'ABCDA', 'BCDAB', 'CDABC', 'DABCD']);
    e.grid[4][0].special = SPECIAL.ROCKET;
    e.grid[4][4].special = SPECIAL.BOMB;
    const res = e.trySwap(4, 0, 4, 1);
    const kinds = res.steps[0].activations.map((a) => a.special);
    expect(kinds).toContain(SPECIAL.BOMB);
  });
});

describe('goals and moves', () => {
  it('ends as lost when moves run out', () => {
    const lvl = { ...getLevel(1), moves: 1, goals: [{ type: 'broast', count: 999 }] };
    const e = new MatchEngine({ level: lvl, seed: 3 });
    const m = e.findMove();
    const res = e.trySwap(...m);
    expect(res.status).toBe('lost');
    expect(e.trySwap(...(e.findMove() ?? [0, 0, 0, 1])).valid).toBe(false);
  });

  it('bot can win early levels and the reward is computed from the result', () => {
    let wins = 0;
    for (let i = 0; i < 10; i++) {
      const { result } = playWithBot(getLevel(1), 100 + i);
      if (result.status === 'won') {
        wins++;
        expect(goalsComplete(getLevel(1), result.collected)).toBe(true);
        const reward = computeReward(getLevel(1), result);
        expect(reward.coins).toBeGreaterThanOrEqual(getLevel(1).baseCoins);
        expect(reward.mealRevealed).toBe(true);
      }
    }
    expect(wins).toBeGreaterThanOrEqual(7);
  });

  it('lost result gives no reward', () => {
    expect(computeReward(getLevel(1), { status: 'lost', score: 9999, collected: {} }).coins).toBe(0);
  });
});

describe('server replay', () => {
  it('replaying the same seed and moves reproduces the exact result', () => {
    const { result, moves } = playWithBot(getLevel(4), 2024);
    expect(replayLevel(getLevel(4), 2024, moves)).toEqual(result);
  });

  it('rejects a forged move list', () => {
    const e = new MatchEngine({ level, seed: 9 });
    const invalid = allSwaps(e).find((m) => !e.clone().trySwap(...m).valid);
    expect(replayLevel(level, 9, [invalid]).status).toBe('invalid');
    expect(replayLevel(level, 9, Array(level.moves + 1).fill([0, 0, 0, 1])).status).toBe('invalid');
  });

  it('a different seed does not reproduce a winning replay', () => {
    const { moves } = playWithBot(getLevel(1), 55);
    const other = replayLevel(getLevel(1), 56, moves);
    expect(other.status).not.toBe('won');
  });

  it('every level definition is valid', () => {
    for (const l of LEVELS) {
      expect(l.goals.length).toBeGreaterThan(0);
      expect(l.goals.some((g) => g.type === l.meal.revealType && g.count >= l.meal.revealPieces)).toBe(true);
    }
  });
});
