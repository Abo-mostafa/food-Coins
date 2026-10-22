import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { host: true, port: 5173 },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: { phaser: ['phaser'], firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/functions'] },
      },
    },
  },
  test: { include: ['tests/**/*.test.js'], exclude: ['tests/emulator/**', 'node_modules/**'] },
});
