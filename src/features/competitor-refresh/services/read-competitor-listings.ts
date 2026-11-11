import { pingExtension } from '@/features/browser-extension/client';
import {
  finishPriceRefresh,
  listCompetitorsToRefresh,
  refreshCompetitorPrice,
} from '@/features/competitor-refresh/actions/refresh-competitor-price';
import type { PriceCheckOutcome } from '@/features/competitor-refresh/services/price-refresh';
import { listingPayload } from '@/features/competitor-search/services/listing-payload';
import {
  readPageViaExtension,
  type PortalRobotsCache,
} from '@/features/competitor-search/services/read-page-via-extension';
import { redirectedAwayFromListing } from '@/features/competitor-search/services/stream-estate-import';
import { refreshDemoPrices } from '@/features/demo/actions/refresh-demo-prices';

// Mission 105 — relire, par l'extension, les annonces des concurrents retenus d'un dossier ; aucun
// appel payant, le serveur relit chaque page et décide. Mission 114 — en démonstration, le serveur
// relit les prix du jeu de données. Mission 152 — partagé par le Suivi (« Faire le point marché »)
// et « Avant le rendez-vous » (« Vérifier les annonces »). Module du navigateur.
export async function readCompetitorListings(
  projectId: string,
  options: { demo: boolean; force?: boolean; onProgress?: (text: string) => void },
): Promise<PriceCheckOutcome[] | 'no_extension'> {
  if (options.demo) {
    options.onProgress?.('Relecture des annonces…');
    return refreshDemoPrices(projectId);
  }
  const ping = await pingExtension({ force: options.force ?? false });
  if (!ping.available) return 'no_extension';
  const competitors = await listCompetitorsToRefresh(projectId);
  const robotsCache: PortalRobotsCache = new Map();
  const outcomes: PriceCheckOutcome[] = [];
  for (const [index, competitor] of competitors.entries()) {
    options.onProgress?.(`Relecture ${index + 1} sur ${competitors.length}…`);
    const read = await readPageViaExtension(competitor.listingUrl, { robotsCache });
    if (!read.ok) {
      outcomes.push({ status: 'unreadable' });
      continue;
    }
    const payload = listingPayload(competitor.listingUrl, read.html, null);
    if (redirectedAwayFromListing(competitor.listingUrl, read.finalUrl)) {
      payload.set('gone', 'redirect');
    }
    outcomes.push(
      await refreshCompetitorPrice(projectId, competitor.id, payload).catch(
        (): PriceCheckOutcome => ({ status: 'unreadable' }),
      ),
    );
  }
  await finishPriceRefresh(projectId);
  return outcomes;
}
