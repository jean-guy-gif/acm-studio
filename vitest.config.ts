import path from 'node:path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // The extension was outside every automatic check since its creation, and it is
    // the piece that shipped two production defects (the never-built background tab,
    // and the stable shell taken for a finished page). Its chrome-free pure helpers
    // (extension/page-readiness.js) are now in the graph.
    include: ['src/**/*.test.ts', 'extension/**/*.test.js'],
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
