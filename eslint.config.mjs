import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // The browser extension is a separate artifact with its own runtime (chrome.*)
    // and is not part of the Next.js app — it is linted/loaded on its own.
    'extension/**',
    // Generated pdfjs browser assets (copied from node_modules, git-ignored).
    'public/pdfjs/**',
  ]),
]);

export default eslintConfig;
