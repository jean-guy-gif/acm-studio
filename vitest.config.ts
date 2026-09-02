import path from 'node:path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve('src'),
      // Server modules guard themselves with `server-only`, which throws outside
      // a React Server context. Resolve it to the package's own empty stub so
      // those modules can be unit-tested under Node (vitest).
      'server-only': path.resolve('node_modules/server-only/empty.js'),
    },
  },
});
