// Greedy one-ply bot used by tests and the difficulty simulator.
import { MatchEngine } from '../src/game/MatchEngine.js';

function goalProgress(engine) {
  return engine.level.goals.reduce((sum, g) => sum + Math.min(engine.collected[g.type] ?? 0, g.count), 0);
}

export function allSwaps(engine) {
  const out = [];
  for (let r = 0; r < engine.rows; r++) {
    for (let c = 0; c < engine.cols; c++) {
      if (c + 1 < engine.cols) out.push([r, c, r, c + 1]);
      if (r + 1 < engine.rows) out.push([r, c, r + 1, c]);
    }
  }
  return out;
}

export function bestMove(engine) {
  let best = null;
  let bestValue = -Infinity;
  for (const m of allSwaps(engine)) {
    const sim = engine.clone();
    const res = sim.trySwap(...m);
    if (!res.valid) continue;
    const value = goalProgress(sim) * 100 + sim.score / 100 + (sim.status === 'won' ? 1e6 : 0);
    if (value > bestValue) {
      bestValue = value;
      best = m;
    }
  }
  return best;
}

export function playWithBot(level, seed) {
  const engine = new MatchEngine({ level, seed });
  while (engine.status === 'playing') {
    const m = bestMove(engine);
    if (!m) break;
    engine.trySwap(...m);
  }
  return { engine, moves: engine.moveLog, result: engine.result() };
}
