'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { saveLiveComparableResponse } from '@/features/live-seller/actions/save-live-comparable-response';
import { saveLiveSellerSummary } from '@/features/live-seller/actions/save-live-seller-summary';
import { LivePageAnalysis } from '@/features/live-seller/components/live-page-analysis';
import { LivePageCompetition } from '@/features/live-seller/components/live-page-competition';
import { LivePageConclusion } from '@/features/live-seller/components/live-page-conclusion';
import { LivePageDangerous } from '@/features/live-seller/components/live-page-dangerous';
import { LivePageDuration } from '@/features/live-seller/components/live-page-duration';
import { LivePageIntro } from '@/features/live-seller/components/live-page-intro';
import { LivePagePerceived } from '@/features/live-seller/components/live-page-perceived';
import { LivePagePrice } from '@/features/live-seller/components/live-page-price';
import { buildLivePages } from '@/features/live-seller/services/build-live-pages';
import { canAdvanceLivePage } from '@/features/live-seller/services/can-advance-live-page';
import type { SellerPresentation } from '@/features/seller-presentation/types/seller-presentation';

// Live comparative reader. Client-only navigation state (current page + fullscreen).
// Nothing about the source data is editable here; only the seller's Live answers
// are persisted through server actions.
export function LiveComparativeShell({
  projectId,
  presentation,
}: {
  projectId: string;
  presentation: SellerPresentation;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const live = presentation.live;
  const pages = useMemo(() => buildLivePages(live), [live]);
  const page = pages[Math.min(index, pages.length - 1)];
  const entry =
    page.comparableId != null
      ? (live?.comparables.find((c) => c.id === page.comparableId) ?? null)
      : null;
  const canAdvance = canAdvanceLivePage(page.type, entry);
  // Garde de progression : on lit la valeur courante via une ref pour que `go`
  // reste référentiellement stable (react-hooks/preserve-manual-memoization) tout
  // en respectant la dernière valeur de `canAdvance` au moment de l'appel.
  const canAdvanceRef = useRef(canAdvance);
  useEffect(() => {
    canAdvanceRef.current = canAdvance;
  }, [canAdvance]);

  const go = useCallback(
    (delta: number) => {
      if (delta > 0 && !canAdvanceRef.current) return;
      setIndex((i) => Math.max(0, Math.min(pages.length - 1, i + delta)));
    },
    [pages.length],
  );

  const toggleFullscreen = useCallback(() => {
    const element = rootRef.current;
    try {
      if (typeof document !== 'undefined' && document.fullscreenElement) {
        void document.exitFullscreen?.();
      } else if (element?.requestFullscreen) {
        void element.requestFullscreen().catch(() => {});
      }
    } catch {
      // Fullscreen API unavailable or refused — never break the presentation.
    }
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        return; // never hijack typing
      }
      // The photo lightbox owns the keyboard while it is open.
      if (document.body.dataset.lightbox === 'open') {
        return;
      }
      if (event.key === 'f' || event.key === 'F') {
        toggleFullscreen();
      } else if (event.key === 'ArrowLeft') {
        go(-1);
      } else if (event.key === 'ArrowRight') {
        go(1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [go, toggleFullscreen]);

  const saveResponse = entry ? saveLiveComparableResponse.bind(null, projectId, entry.id) : null;
  const saveSummary = saveLiveSellerSummary.bind(null, projectId);

  return (
    <div
      ref={rootRef}
      className="flex min-h-[70vh] flex-col gap-6 bg-white p-2 text-zinc-900 sm:p-4 dark:bg-zinc-950 dark:text-zinc-100"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Présentation vendeur</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleFullscreen}
            className="rounded border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            {isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
          </button>
          <Link
            href={`/builder/${projectId}/presentation`}
            className="rounded border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Quitter Live
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-zinc-500">
        <div>
          {page.comparableIndex != null && live
            ? `Concurrent ${page.comparableIndex} sur ${live.comparables.length} · Étape ${page.step} sur 3`
            : page.title}
        </div>
        <div>
          Page {index + 1} / {pages.length}
        </div>
      </div>

      <div className="min-h-[40vh]">
        {page.type === 'intro' ? (
          <LivePageIntro live={live} sellerName={presentation.project.name} />
        ) : page.type === 'comparable_competition' && entry && saveResponse ? (
          <LivePageCompetition entry={entry} saveAction={saveResponse} />
        ) : page.type === 'comparable_price' && entry && saveResponse ? (
          <LivePagePrice entry={entry} saveAction={saveResponse} />
        ) : page.type === 'comparable_duration' && entry && saveResponse ? (
          <LivePageDuration entry={entry} saveAction={saveResponse} />
        ) : page.type === 'dangerous_competitor' && live ? (
          <LivePageDangerous
            comparables={live.comparables}
            summary={live.sellerSummary}
            saveAction={saveSummary}
          />
        ) : page.type === 'seller_perceived_price' && live ? (
          <LivePagePerceived live={live} summary={live.sellerSummary} saveAction={saveSummary} />
        ) : page.type === 'price_analysis' && live ? (
          <LivePageAnalysis live={live} summary={live.sellerSummary} saveAction={saveSummary} />
        ) : page.type === 'conclusion' && live ? (
          <LivePageConclusion live={live} />
        ) : (
          <p className="text-zinc-500">
            Contenu indisponible : préparez le dossier vendeur et ses concurrents dans le Builder.
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={index === 0}
          className="rounded border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Précédent
        </button>
        <button
          type="button"
          onClick={() => setIndex(0)}
          className="rounded border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Sommaire
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={index >= pages.length - 1 || !canAdvance}
          className="rounded border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Suivant
        </button>
      </div>
    </div>
  );
}
