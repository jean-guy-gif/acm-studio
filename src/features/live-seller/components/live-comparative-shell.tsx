'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Logo } from '@/components/brand/logo';
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
import {
  chromeBtn,
  ctaPrimary,
  navBtn,
  stageGlow,
  stageRoot,
} from '@/features/live-seller/components/live-stage';
import { buildLivePages } from '@/features/live-seller/services/build-live-pages';
import { canAdvanceLivePage } from '@/features/live-seller/services/can-advance-live-page';
import type { SellerPresentation } from '@/features/seller-presentation/types/seller-presentation';

export type LiveStageTheme = 'dark' | 'light';

// Live comparative reader — mode présentation. Client-only navigation state
// (page courante, plein écran, thème scène sombre/clair au choix du conseiller).
// Nothing about the source data is editable here; only the seller's Live answers
// are persisted through server actions.
export function LiveComparativeShell({
  projectId,
  presentation,
  initialIndex = 0,
  initialStage = 'dark',
}: {
  projectId: string;
  presentation: SellerPresentation;
  // Réservés à l'aperçu design (« /design-preview ») : jamais fournis en Live réel.
  initialIndex?: number;
  initialStage?: LiveStageTheme;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(initialIndex);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [stage, setStage] = useState<LiveStageTheme>(initialStage);

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

  const isIntro = page.type === 'intro';
  const stepLabel =
    page.comparableIndex != null && live
      ? `Concurrent ${page.comparableIndex} sur ${live.comparables.length} · Étape ${page.step} sur 3`
      : page.title;

  return (
    <div ref={rootRef} data-stage={stage} className={stageRoot}>
      <div className={stageGlow} aria-hidden />

      {/* Chrome supérieur : identité + réglages, volontairement discret. */}
      <header className="relative flex items-center justify-between gap-3 px-4 pt-4 sm:px-8 sm:pt-5">
        <div className="flex items-center gap-3">
          <Logo onDark={stage === 'dark'} className="h-8 sm:h-9" />
          <span className="hidden text-sm font-medium text-zinc-400 sm:inline stage:text-white/50">
            Rendez-vous vendeur
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setStage((s) => (s === 'dark' ? 'light' : 'dark'))}
            className={chromeBtn}
            aria-label={stage === 'dark' ? 'Passer en thème clair' : 'Passer en thème sombre'}
          >
            {stage === 'dark' ? 'Clair' : 'Sombre'}
          </button>
          <button type="button" onClick={toggleFullscreen} className={chromeBtn}>
            {isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
          </button>
          <Link href={`/builder/${projectId}/presentation`} className={chromeBtn}>
            Quitter
          </Link>
        </div>
      </header>

      {/* Progression : fine, élégante, jamais envahissante. */}
      {!isIntro ? (
        <div className="relative mx-auto mt-4 flex w-full max-w-5xl flex-col gap-1.5 px-4 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold tracking-[0.25em] uppercase text-brand-deep/70 stage:text-brand">
              {stepLabel}
            </span>
            <span className="text-xs text-zinc-400 stage:text-white/40">
              {index + 1} / {pages.length}
            </span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-zinc-200 stage:bg-white/10">
            <div
              className="h-full rounded-full bg-brand transition-all duration-500"
              style={{ width: `${((index + 1) / pages.length) * 100}%` }}
            />
          </div>
        </div>
      ) : null}

      {/* La fiche courante. */}
      <main
        key={page.key}
        className="live-fade-up relative mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-8 sm:py-8"
      >
        {page.type === 'intro' ? (
          <LivePageIntro
            live={live}
            sellerName={presentation.project.name}
            address={
              [presentation.property?.address, presentation.property?.city]
                .filter(Boolean)
                .join(', ') || null
            }
            onStart={() => setIndex((i) => Math.min(pages.length - 1, i + 1))}
          />
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
          <p className="text-zinc-500 stage:text-white/60">
            Contenu indisponible : préparez le dossier vendeur et ses concurrents dans la
            Préparation.
          </p>
        )}
      </main>

      {/* Navigation : Suivant en évidence, verrouillé tant que la réponse
          attendue n'est pas enregistrée. */}
      {!isIntro ? (
        <footer className="relative mx-auto flex w-full max-w-5xl items-center justify-between gap-3 border-t border-zinc-200 px-4 py-4 sm:px-8 stage:border-white/10">
          <button type="button" onClick={() => go(-1)} disabled={index === 0} className={navBtn}>
            ← Précédent
          </button>
          <button type="button" onClick={() => setIndex(0)} className={chromeBtn}>
            Sommaire
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            disabled={index >= pages.length - 1 || !canAdvance}
            className={ctaPrimary}
            title={!canAdvance ? 'Enregistrez la réponse du vendeur pour continuer' : undefined}
          >
            Suivant →
          </button>
        </footer>
      ) : null}
    </div>
  );
}
