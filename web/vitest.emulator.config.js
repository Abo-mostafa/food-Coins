import { defineConfig } from 'vitest/config';

// Integration tests against the Firebase Emulator Suite (run via `npm run test:emulators`).
export default defineConfig({
  test: { include: ['tests/emulator/**/*.test.js'], testTimeout: 60000, hookTimeout: 60000, fileParallelism: false },
});
