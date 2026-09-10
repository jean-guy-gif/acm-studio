import path from 'node:path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Run tests in UTC, whatever the developer's machine. Guard-rail against the
    // next latent timezone-dependent case: a green suite must not depend on the
    // host's zone. The code is already zone-independent (see extract-listing-
    // published-at), this keeps CI and local machines agreeing.
    env: { TZ: 'UTC' },
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
