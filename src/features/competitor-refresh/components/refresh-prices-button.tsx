'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { btnSecondary } from '@/components/ui/styles';
import { pingExtension } from '@/features/browser-extension/client';
import { EXTENSION_RETRY_LABEL } from '@/features/browser-extension/install-url';
import {
  finishPriceRefresh,
  listCompetitorsToRefresh,
  refreshCompetitorPrice,
} from '@/features/competitor-refresh/actions/refresh-competitor-price';
import {
  priceRefreshSummary,
  type PriceCheckOutcome,
} from '@/features/competitor-refresh/services/price-refresh';
import { listingPayload } from '@/features/competitor-search/services/listing-payload';
import {
  readPageViaExtension,
  type PortalRobotsCache,
} from '@/features/competitor-search/services/read-page-via-extension';
import { redirectedAwayFromListing } from '@/features/competitor-search/services/stream-estate-import';

export const NO_EXTENSION_FOR_REFRESH = 'Installez ou activez l’extension ACM, puis réessayez.';

// Mission 105 — sur le Suivi d'un dossier : relire, par l'extension, les annonces des concurrents
// retenus. Aucun appel payant ; le serveur relit chaque page et décide.
export function RefreshPricesButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  // Mission 108 — sans extension, le message vient tout de suite ; « Réessayer » redétecte.
  const [missingExtension, setMissingExtension] = useState(false);

  const run = async (force = false) => {
    setBusy(true);
    setMessage(null);
    setMissingExtension(false);
    try {
      const ping = await pingExtension({ force });
      if (!ping.available) {
        setMessage(NO_EXTENSION_FOR_REFRESH);
        setMissingExtension(true);
        return;
      }
      const competitors = await listCompetitorsToRefresh(projectId);
      const robotsCache: PortalRobotsCache = new Map();
      const outcomes: PriceCheckOutcome[] = [];
      for (const [index, competitor] of competitors.entries()) {
        setProgress(`Relecture ${index + 1} sur ${competitors.length}…`);
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
      setMessage(priceRefreshSummary(outcomes));
      router.refresh();
    } catch {
      setMessage('La mise à jour s’est interrompue : réessayez.');
    } finally {
      setProgress(null);
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        className={`${btnSecondary} whitespace-nowrap`}
        disabled={busy}
        onClick={() => void run()}
      >
        {busy ? (progress ?? 'Mise à jour…') : 'Mettre à jour les prix des concurrents'}
      </button>
      {message ? (
        <p role="status" data-testid="price-refresh-summary" className="text-xs text-zinc-600">
          {message}
        </p>
      ) : null}
      {missingExtension ? (
        <button
          type="button"
          className={`${btnSecondary} self-start text-xs`}
          disabled={busy}
          onClick={() => void run(true)}
        >
          {EXTENSION_RETRY_LABEL}
        </button>
      ) : null}
    </div>
  );
}
