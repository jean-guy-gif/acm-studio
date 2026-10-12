import { importAndCreateComparable } from '@/features/competitor-search/actions/import-and-create-competitor';
import {
  createCompetitorFromSearch,
  recordImportReadFailure,
} from '@/features/competitor-search/actions/pending-imports';
import type { ImportListingDeps } from '@/features/competitor-search/services/import-listing';
import { listingPayload } from '@/features/competitor-search/services/listing-payload';
import {
  readPageViaExtension,
  type PortalRobotsCache,
} from '@/features/competitor-search/services/read-page-via-extension';
import { redirectedAwayFromListing } from '@/features/competitor-search/services/stream-estate-import';

// Mission 101 — ce dont l'import d'une annonce a besoin, branché sur l'extension (lecture de la
// page) et sur le serveur (import, création depuis la recherche, signalement). Utilisé par l'écran
// de recherche et par le bandeau « import en attente » : un seul enchaînement, partout.
export function listingImportDeps(options: {
  projectId: string;
  propertyType: string | null;
  // Bien venu de Stream Estate : une page qui renvoie ailleurs que l'annonce = annonce retirée.
  fromStreamEstate: boolean;
  robotsCache: PortalRobotsCache;
  // La fenêtre du lot, réutilisée pour les deux premières lectures. Absente : fenêtre neuve.
  windowId?: number;
}): ImportListingDeps {
  const { projectId, propertyType, fromStreamEstate, robotsCache, windowId } = options;
  return {
    readPage: (url, { freshWindow }) =>
      readPageViaExtension(url, {
        robotsCache,
        ...(freshWindow || windowId == null ? {} : { windowId }),
      }),
    ...(fromStreamEstate ? { isWithdrawn: redirectedAwayFromListing } : {}),
    importPage: async (url, html) => {
      const result = await importAndCreateComparable(
        projectId,
        listingPayload(url, html, propertyType),
      );
      return result.ok ? { ok: true } : { ok: false, code: result.code };
    },
    createFromSearch: async (url, { withdrawn }) => {
      const result = await createCompetitorFromSearch(projectId, url, withdrawn);
      return result.ok ? { ok: true } : { ok: false, code: result.code };
    },
    reportReadFailure: (url, cause, attempts) =>
      recordImportReadFailure(projectId, url, cause, attempts),
  };
}
