// Usage: node scripts/simulate.js [runs]  -> greedy-bot win rate per level
import { LEVELS } from '../src/game/LevelConfig.js';
import { playWithBot } from '../tests/bot.js';

const runs = Number(process.argv[2] ?? 30);
for (const level of LEVELS) {
  let wins = 0;
  let movesLeft = 0;
  for (let i = 0; i < runs; i++) {
    const { result } = playWithBot(level, 1000 + i * 7919);
    if (result.status === 'won') {
      wins++;
      movesLeft += result.movesLeft;
    }
  }
  const goals = level.goals.map((g) => `${g.type}:${g.count}`).join(',');
  console.log(`L${level.id}\tmoves=${level.moves}\ttypes=${level.types.length}\t${goals}\twin=${Math.round((wins / runs) * 100)}%\tavgLeft=${wins ? (movesLeft / wins).toFixed(1) : '-'}`);
}
