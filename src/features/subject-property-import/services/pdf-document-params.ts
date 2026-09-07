import 'server-only';

import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

// pdfjs ships two data folders it loads at runtime: `standard_fonts/` (the 14
// base PDF fonts) and `cmaps/` (packed CID→Unicode maps). In a Vercel serverless
// function these are NOT bundled unless explicitly traced (see
// outputFileTracingIncludes in next.config.ts). We resolve their location from the
// INSTALLED package — never from process.cwd(), which is not the package root in a
// traced function — so the paths hold both locally and in production.
let cached: { standardFontDataUrl: string; cMapUrl: string } | null = null;

function pdfDataPaths(): { standardFontDataUrl: string; cMapUrl: string } {
  if (!cached) {
    const require = createRequire(import.meta.url);
    const packageRoot = dirname(require.resolve('pdfjs-dist/package.json'));
    cached = {
      // pdfjs expects directory URLs ending with a trailing slash.
      standardFontDataUrl: join(packageRoot, 'standard_fonts/'),
      cMapUrl: join(packageRoot, 'cmaps/'),
    };
  }
  return cached;
}

// Shared getDocument() parameters for text AND image extraction. We only read
// character codes / decode images — nothing is rendered — so font faces are off.
export function pdfDocumentParams(data: Uint8Array) {
  const { standardFontDataUrl, cMapUrl } = pdfDataPaths();
  return {
    data,
    isEvalSupported: false,
    useSystemFonts: false,
    useWorkerFetch: false,
    disableFontFace: true,
    standardFontDataUrl,
    cMapUrl,
    cMapPacked: true,
  };
}
