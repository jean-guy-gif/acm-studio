import path from 'node:path';

import { defineConfig } from 'vitest/config';

// Lot B4 — la mesure se lance à part, jamais par `npm test` : elle appelle le vrai modèle
// (`notes.mesure.mjs`).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['missions/LB4-essais/*.mesure.mjs'],
    testTimeout: 900_000,
  },
  resolve: {
    alias: {
      '@': path.resolve('src'),
      'server-only': path.resolve('node_modules/server-only/empty.js'),
    },
  },
});
