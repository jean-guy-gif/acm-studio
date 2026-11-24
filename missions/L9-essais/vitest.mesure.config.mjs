import path from 'node:path';

import { defineConfig } from 'vitest/config';

// Lancement, mission 9 — la mesure se lance à part, jamais par `npm test` : elle appelle le vrai
// modèle, sur l'ordre de Jean-Guy seulement (`photos.mesure.mjs`).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['missions/L9-essais/*.mesure.mjs'],
    testTimeout: 1_500_000,
  },
  resolve: {
    alias: {
      '@': path.resolve('src'),
      'server-only': path.resolve('node_modules/server-only/empty.js'),
    },
  },
});
