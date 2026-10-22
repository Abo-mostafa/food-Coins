// Copies the pure game-logic modules into functions/src/shared so the server replays
// levels with exactly the same code the client plays with.
import { cpSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dest = join(root, 'functions', 'src', 'shared');
mkdirSync(dest, { recursive: true });
for (const file of ['rng.js', 'MatchEngine.js', 'SpecialPieces.js', 'LevelConfig.js']) {
  cpSync(join(root, 'src', 'game', file), join(dest, file));
}
console.log('Synced game engine -> functions/src/shared');
