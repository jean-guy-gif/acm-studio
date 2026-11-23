import path from 'node:path';

import { defineConfig } from 'vitest/config';

// Le banc de l'Étude imprimée (`npm run banc:etude`) : hors de `npm test`, il fabrique des pages
// HTML que `banc.mjs` mesure ensuite dans un vrai navigateur.
export default defineConfig({
  test: { environment: 'node', include: ['tests/print/etude.gen.test.ts'], env: { TZ: 'UTC' } },
  resolve: {
    alias: {
      '@': path.resolve('src'),
      'server-only': path.resolve('node_modules/server-only/empty.js'),
    },
  },
});
