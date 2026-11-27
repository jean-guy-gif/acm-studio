'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { btnSecondary } from '@/components/ui/styles';
import { EXTENSION_RETRY_LABEL } from '@/features/browser-extension/install-url';
import { priceRefreshSummary } from '@/features/competitor-refresh/services/price-refresh';
import { readCompetitorListings } from '@/features/competitor-refresh/services/read-competitor-listings';
import { useDemoMode } from '@/features/demo/components/demo-mode-provider';
import {
  recordMarketUpdate,
  type RecordMarketUpdateResult,
} from '@/features/market-update/actions/record-market-update';
import {
  MarketUpdateCompetitorLines,
  shortDay,
} from '@/features/market-update/components/market-update-panel';
import type { MarketUpdateSummary } from '@/features/market-update/services/market-update-summary';

export const NO_EXTENSION_FOR_REFRESH = 'Installez ou activez l’extension ACM, puis réessayez.';
// Mission 130 — le bouton dit ce qu'il fait : relire, puis écrire le point.
export const REFRESH_BUTTON_LABEL = 'Faire le point marché';

// Mission 105 — sur le Suivi d'un dossier : relire, par l'extension, les annonces des concurrents
// retenus. Aucun appel payant ; le serveur relit chaque page et décide.
// Mission 114 — en démonstration, pas d'extension : le serveur relit les prix du jeu de données.
// Mission 127 — « Mettre à jour les concurrents » enchaîne, en le disant : (a) la relecture, puis
// (b) le point daté qui conclut (baisses, ventes probables, retraits) ; la recherche des nouveaux
// venus (c) viendra en 127 B. Une relecture acquise sans point écrit se dit, et se réessaie.
export function RefreshPricesButton({
  projectId,
  latest = null,
  label = REFRESH_BUTTON_LABEL,
  buttonClassName = `${btnSecondary} whitespace-nowrap`,
  autoRun = false,
  onStarted,
}: {
  projectId: string;
  label?: string;
  buttonClassName?: string;
  // Mission 130 — « Faire le point marché », prochaine étape de la carte, ouvre ce bloc et le lance
  // aussitôt : le bouton fait ce qu'il dit.
  autoRun?: boolean;
  // Prévenu dès que la relecture part : le parent désarme `autoRun` (un remontage ne relance rien).
  onStarted?: () => void;
  // Mission 127 B — le dernier point relu en base : après « Retenir » un nouveau venu, le point du
  // jour est réécrit et le bloc « Point du … enregistré » suit, sans rechargement.
  latest?: { id: string; madeAt: string; line: string; summary: MarketUpdateSummary } | null;
}) {
  const router = useRouter();
  const demo = useDemoMode();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [point, setPoint] = useState<Extract<RecordMarketUpdateResult, { ok: true }> | null>(null);
  // Le point affiché : celui de la session, mis à jour par sa relecture en base si elle est plus
  // récente (même point, réécrit).
  const shownPoint =
    point && latest && latest.id === point.updateId
      ? { ...point, madeAt: latest.madeAt, line: latest.line, summary: latest.summary }
      : point;
  const [pointError, setPointError] = useState<string | null>(null);
  // Mission 108 — sans extension, le message vient tout de suite ; « Réessayer » redétecte.
  const [missingExtension, setMissingExtension] = useState(false);

  const conclude = async () => {
    setProgress('Préparation du Point marché…');
    const result = await recordMarketUpdate(projectId);
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
      const outcomes = await readCompetitorListings(projectId, {
        demo,
        force,
        onProgress: setProgress,
      });
      if (outcomes === 'no_extension') {
        setMessage(NO_EXTENSION_FOR_REFRESH);
        setMissingExtension(true);
        return;
      }
      setMessage(priceRefreshSummary(outcomes));
      await conclude();
      router.refresh();
    } catch {
      setMessage('La mise à jour s’est interrompue\u00a0: réessayez.');
    } finally {
      setProgress(null);
      setBusy(false);
    }
  };

  const started = useRef(false);
  useEffect(() => {
    if (autoRun && !started.current) {
      started.current = true;
      onStarted?.();
      void run();
    }
    // `run` change à chaque rendu : seul `autoRun` décide, une fois.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun]);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          data-testid="refresh-prices"
          className={buttonClassName}
          disabled={busy}
          onClick={() => void run()}
        >
          {busy ? (progress ?? 'Préparation du Point marché…') : label}
        </button>
        {busy ? (
          <span className="text-xs text-zinc-500 stage:text-white/60">
            {demo
              ? 'Ne compte pas dans le forfait.'
              : 'Ne compte pas dans le forfait. Gardez cet onglet ouvert pendant la relecture.'}
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
      {shownPoint ? (
        <div
          className="mt-1 flex flex-col gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 stage:border-emerald-400/30 stage:bg-emerald-500/10"
          data-testid="market-update-recorded"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-title text-sm font-bold text-zinc-900 stage:text-white">
              Point marché du {shortDay(shownPoint.madeAt)} prêt
            </span>
            <Link
              href={`/builder/${projectId}/point-marche?point=${shownPoint.updateId}`}
              className={`${btnSecondary} text-xs whitespace-nowrap`}
            >
              Ouvrir le Point marché →
            </Link>
          </div>
          <span className="text-xs text-zinc-600 stage:text-white/70">{shownPoint.line}</span>
          <MarketUpdateCompetitorLines summary={shownPoint.summary} madeAt={shownPoint.madeAt} />
          {/* Mission 127 B — la proposition (c) suit, portée par la liste « Points marché » (un seul
              bouton payant sur la ligne, relu en base après le point). */}
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
