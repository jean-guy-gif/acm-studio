import {
  fetchPageViaExtension,
  fetchRobotsViaExtension,
} from '@/features/browser-extension/client';
import { decideRobotsAllowed } from '@/features/comparable-import/services/robots-decision';
import type {
  ComparableImportResult,
  ImportFailureReason,
} from '@/features/comparable-import/types';
import { readByExtension } from '@/features/comparable-import/utils/extension-hosts';
import { forbiddenPortalMessage } from '@/features/comparable-import/utils/forbidden-portals';
import { normalizeListingUrl } from '@/features/comparable-import/utils/normalize-listing-url';
import {
  isUnreadPortalUrl,
  UNREAD_PORTAL_MESSAGE,
} from '@/features/comparable-import/utils/unread-portals';

// Shared client-side import path for a listing URL (Mission 46 §3). Used by BOTH the
// seller-property panel AND the competitors panel — a future fix happens here, once.
//
// With the extension: robots.txt AND the page are read in the ADVISOR'S browser (the
// portals block the server's data-center address, not the advisor). robots is
// respected first; a refusal is never read as an absence. Without the extension —
// or if it cannot read the page — we fall back to the server import. The HTML is always re-validated by the existing server parser (never trusted).

// Exact message: the portal refuses this ADDRESS, not necessarily the listing (the
// canonical form may well be allowed).
export const ROBOTS_BLOCKED_MESSAGE =
  'Ce portail refuse cette adresse (pas nécessairement l’annonce). Saisissez le bien à la main ci-dessous.';

// Lancement, mission 11 (suite, demande de Jean-Guy du 25/11) — l'extension n'a pas lu la page d'un
// portail (absente, endormie, ou sa lecture a échoué) : le serveur a essayé à sa place, mais les
// portails refusent son adresse (M74), son échec ne dit rien de l'annonce. Jamais « L'annonce
// semble supprimée » ni « le site a refusé » : l'écran dit l'extension (M105).
export const EXTENSION_UNREAD_MESSAGE =
  'L’extension ACM n’a pas pu lire l’annonce\u00a0: vérifiez qu’elle est installée et activée, puis réessayez. Sinon, saisissez le bien à la main ci-dessous.';
// Les échecs du serveur qui ne disent rien de l'annonce quand c'est un portail qui répond. Une
// adresse refusée par le portail (robots.txt), une adresse invalide ou qui n'est pas une annonce
// gardent leur message.
const SERVER_BLINDED: ReadonlySet<ImportFailureReason> = new Set([
  'unavailable',
  'refused',
  'network',
  'timeout',
  'empty',
]);

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
  console.info(`[ACM import] adresse normalisée\u00a0: ${normalized}  (origine\u00a0: ${url})`);
  const parsed = safeUrl(normalized);
  // Mission 150 — un site qu'ACM ne lit plus : refusé avant toute lecture (le serveur le refuse
  // aussi).
  if (isUnreadPortalUrl(normalized)) {
    return { ok: false, error: UNREAD_PORTAL_MESSAGE };
  }
  // Lancement, mission 11 (suite) — un site qui interdit la lecture de ses annonces (Belles
  // Demeures) : dit tout de suite, sans rien lire ni rien demander.
  const forbidden = forbiddenPortalMessage(normalized);
  if (forbidden) {
    return { ok: false, error: forbidden };
  }

  // L'extension ne lit que ses portails : ailleurs (le site d'une agence…), elle n'est pas
  // sollicitée, et le serveur lit le site lui-même.
  const portal = parsed != null && readByExtension(parsed.hostname);
  if (extensionAvailable && parsed && portal) {
    const robots = await fetchRobotsViaExtension(new URL('/robots.txt', parsed.origin).toString());
    // L'extension n'a pas répondu du tout : ce n'est pas un refus du portail (M105).
    const silent = !robots.ok && robots.unreachable === true;
    if (!silent) {
      if (!decideRobotsAllowed(robots, parsed.pathname + parsed.search)) {
        return { ok: false, error: ROBOTS_BLOCKED_MESSAGE };
      }
      const page = await fetchPageViaExtension(normalized);
      if (page.ok) {
        // Diagnostic (§2.4): a complete Bien'ici fiche is ~286 000 chars; a shell is
        // under 50 000. If the parser then finds nothing, this tells which it was.
        console.info(
          `[ACM import] page reçue\u00a0: ${page.size} caractères en ${page.durationMs} ms`,
        );
        const htmlData = new FormData();
        htmlData.set('url', page.finalUrl || normalized);
        htmlData.set('html', page.html);
        return importHtmlAction(htmlData);
      }
      console.warn(`[ACM import] extension\u00a0: ${page.error}`);
    }
    // fall through to the server attempt
  }

  const formData = new FormData();
  formData.set('url', normalized);
  const result = await importUrlAction(formData);
  // Un portail que l'extension n'a pas lu : l'échec du serveur ne dit rien de l'annonce.
  if (portal && !result.ok && result.reason && SERVER_BLINDED.has(result.reason)) {
    return { ok: false, error: EXTENSION_UNREAD_MESSAGE };
  }
  return result;
}
