'use client';

import Link from 'next/link';
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
import { refreshDemoPrices } from '@/features/demo/actions/refresh-demo-prices';
import { useDemoMode } from '@/features/demo/components/demo-mode-provider';
import {
  recordMarketUpdate,
  type RecordMarketUpdateResult,
} from '@/features/market-update/actions/record-market-update';
import {
  MarketUpdateCompetitorLines,
  shortDay,
} from '@/features/market-update/components/market-update-panel';

export const NO_EXTENSION_FOR_REFRESH = 'Installez ou activez l’extension ACM, puis réessayez.';
export const REFRESH_BUTTON_LABEL = 'Mettre à jour les concurrents';

// Mission 105 — sur le Suivi d'un dossier : relire, par l'extension, les annonces des concurrents
// retenus. Aucun appel payant ; le serveur relit chaque page et décide.
// Mission 114 — en démonstration, pas d'extension : le serveur relit les prix du jeu de données.
// Mission 127 — « Mettre à jour les concurrents » enchaîne, en le disant : (a) la relecture, puis
// (b) le point daté qui conclut (baisses, ventes probables, retraits) ; la recherche des nouveaux
// venus (c) viendra en 127 B. Une relecture acquise sans point écrit se dit, et se réessaie.
export function RefreshPricesButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const demo = useDemoMode();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [point, setPoint] = useState<Extract<RecordMarketUpdateResult, { ok: true }> | null>(null);
  const [pointError, setPointError] = useState<string | null>(null);
  // Mission 108 — sans extension, le message vient tout de suite ; « Réessayer » redétecte.
  const [missingExtension, setMissingExtension] = useState(false);

  const conclude = async (outcomes: PriceCheckOutcome[]) => {
    setProgress('Le point marché s’écrit…');
    const unreadable = outcomes.filter((o) => o.status === 'unreadable').length;
    const result = await recordMarketUpdate(projectId, unreadable);
    if (result.ok) {
      setPoint(result);
      setPointError(null);
    } else {
      setPoint(null);
      setPointError(result.error);
    }
  };

  const run = async (force = false) => {
    setBusy(true);
    setMessage(null);
    setPoint(null);
    setPointError(null);
    setMissingExtension(false);
    try {
      if (demo) {
        setProgress('Relecture des annonces…');
        const outcomes = await refreshDemoPrices(projectId);
        setMessage(priceRefreshSummary(outcomes));
        await conclude(outcomes);
        router.refresh();
        return;
      }
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
      await conclude(outcomes);
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
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={`${btnSecondary} whitespace-nowrap`}
          disabled={busy}
          onClick={() => void run()}
        >
          {busy ? (progress ?? 'Mise à jour…') : REFRESH_BUTTON_LABEL}
        </button>
        {busy ? (
          <span className="text-xs text-zinc-500 stage:text-white/60">
            {demo
              ? 'Sans appel payant.'
              : 'Par l’extension ACM, sans appel payant. Ne fermez pas l’onglet.'}
          </span>
        ) : null}
      </div>
      {message ? (
        <p
          role="status"
          data-testid="price-refresh-summary"
          className="text-xs text-zinc-600 stage:text-white/70"
        >
          {message}
        </p>
      ) : null}
      {pointError ? (
        <p role="alert" className="text-xs font-semibold text-red-700">
          {pointError}
        </p>
      ) : null}
      {point ? (
        <div
          className="mt-1 flex flex-col gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 stage:border-emerald-400/30 stage:bg-emerald-500/10"
          data-testid="market-update-recorded"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-title text-sm font-bold text-zinc-900 stage:text-white">
              Point du {shortDay(point.madeAt)} enregistré
            </span>
            <Link
              href={`/builder/${projectId}/point-marche?point=${point.updateId}`}
              className={`${btnSecondary} text-xs whitespace-nowrap`}
            >
              Ouvrir le Point marché →
            </Link>
          </div>
          <span className="text-xs text-zinc-600 stage:text-white/70">{point.line}</span>
          <MarketUpdateCompetitorLines summary={point.summary} madeAt={point.madeAt} />
        </div>
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
