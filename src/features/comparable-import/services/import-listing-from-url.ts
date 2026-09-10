import {
  fetchPageViaExtension,
  fetchRobotsViaExtension,
} from '@/features/browser-extension/client';
import { decideRobotsAllowed } from '@/features/comparable-import/services/robots-decision';
import type { ComparableImportResult } from '@/features/comparable-import/types';
import { normalizeListingUrl } from '@/features/comparable-import/utils/normalize-listing-url';

// Shared client-side import path for a listing URL (Mission 46 §3). Used by BOTH the
// seller-property panel AND the competitors panel — a future fix happens here, once.
//
// With the extension: robots.txt AND the page are read in the ADVISOR'S browser (the
// portals block the server's data-center address, not the advisor). robots is
// respected first; a refusal is never read as an absence. Without the extension —
// or if it cannot read the page — we fall back to the server import, then the paste
// zone. The HTML is always re-validated by the existing server parser (never trusted).

// Exact message: the portal refuses this ADDRESS, not necessarily the listing (the
// canonical form may well be allowed, and the paste zone always works).
export const ROBOTS_BLOCKED_MESSAGE =
  'Ce portail refuse cette adresse (pas nécessairement l’annonce). Utilisez le copier-coller ci-dessous.';

function safeUrl(raw: string): URL | null {
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

export async function importListingFromUrl(opts: {
  url: string;
  extensionAvailable: boolean;
  importUrlAction: (formData: FormData) => Promise<ComparableImportResult>;
  importHtmlAction: (formData: FormData) => Promise<ComparableImportResult>;
}): Promise<ComparableImportResult> {
  const { url, extensionAvailable, importUrlAction, importHtmlAction } = opts;

  // Normalise FIRST — before robots and before the fetch — so we control and
  // retrieve exactly the same canonical address. Deterministic, never adjusted to
  // make the address pass.
  const normalized = normalizeListingUrl(url);
  console.info(`[ACM import] adresse normalisée : ${normalized}  (origine : ${url})`);
  const parsed = safeUrl(normalized);

  if (extensionAvailable && parsed) {
    const robots = await fetchRobotsViaExtension(new URL('/robots.txt', parsed.origin).toString());
    if (!decideRobotsAllowed(robots, parsed.pathname + parsed.search)) {
      return { ok: false, error: ROBOTS_BLOCKED_MESSAGE };
    }
    const page = await fetchPageViaExtension(normalized);
    if (page.ok) {
      // Diagnostic (§2.4): a complete Bien'ici fiche is ~286 000 chars; a shell is
      // under 50 000. If the parser then finds nothing, this tells which it was.
      console.info(`[ACM import] page reçue : ${page.size} caractères en ${page.durationMs} ms`);
      const htmlData = new FormData();
      htmlData.set('url', page.finalUrl || normalized);
      htmlData.set('html', page.html);
      return importHtmlAction(htmlData);
    }
    console.warn(`[ACM import] extension : ${page.error}`);
    // fall through to the server attempt, then the paste fallback
  }

  const formData = new FormData();
  formData.set('url', normalized);
  return importUrlAction(formData);
}
