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
    const resolved = require.resolve('pdfjs-dist/package.json');
    // If pdfjs was bundled into the server chunk, require.resolve returns a webpack
    // MODULE ID (a number), not a file path — and dirname() would throw an opaque
    // "path must be a string" deep in the stack. Fail loudly with the real cause:
    // pdfjs-dist must be in serverExternalPackages (next.config.ts).
    if (typeof resolved !== 'string') {
      throw new Error(
        `pdfjs-dist a été empaqueté dans le bundle serveur (require.resolve a renvoyé ${typeof resolved} « ${String(resolved)} »). Ajoutez 'pdfjs-dist' à serverExternalPackages dans next.config.ts pour qu'il reste un module Node externe.`,
      );
    }
    const packageRoot = dirname(resolved);
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
