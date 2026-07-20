'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import { FullscreenButton } from '@/features/live-presentation/components/fullscreen-button';
import { LiveAdvisorDecisionSection } from '@/features/live-presentation/components/live-advisor-decision-section';
import { LiveComparablesSection } from '@/features/live-presentation/components/live-comparables-section';
import { LiveMarketAnalysisSection } from '@/features/live-presentation/components/live-market-analysis-section';
import { LiveOverview } from '@/features/live-presentation/components/live-overview';
import { LivePricePositioningSection } from '@/features/live-presentation/components/live-price-positioning-section';
import { LivePropertySection } from '@/features/live-presentation/components/live-property-section';
import { LiveSectionNavigation } from '@/features/live-presentation/components/live-section-navigation';
import { LiveSellerPriceSection } from '@/features/live-presentation/components/live-seller-price-section';
import { LiveUnavailableSection } from '@/features/live-presentation/components/live-unavailable-section';
import { LiveWarningsSection } from '@/features/live-presentation/components/live-warnings-section';
import { filterLiveWarnings } from '@/features/live-presentation/services/filter-live-warnings';
import {
  getFirstNavigableKey,
  getLiveSections,
  getNavigablePosition,
  getSequentialSectionKey,
} from '@/features/live-presentation/services/get-live-sections';
import type { LiveMode } from '@/features/live-presentation/types/live-presentation';
import type {
  SellerPresentation,
  SellerPresentationSectionKey,
} from '@/features/seller-presentation/types/seller-presentation';

// Live reader shell. Client-only navigation state (mode / active section /
// fullscreen). Nothing is persisted: a reload returns to the summary.
export function LivePresentationShell({
  projectId,
  presentation,
}: {
  projectId: string;
  presentation: SellerPresentation;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [mode, setMode] = useState<LiveMode>('overview');
  const [activeKey, setActiveKey] = useState<SellerPresentationSectionKey | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { all, navigable } = getLiveSections(presentation.sections);
  const liveWarnings = filterLiveWarnings(presentation.warnings);

  const openSection = useCallback((key: SellerPresentationSectionKey) => {
    setActiveKey(key);
    setMode('presentation');
  }, []);

  const start = useCallback(() => {
    const first = getFirstNavigableKey(presentation.sections);
    if (first) {
      openSection(first);
    }
  }, [presentation.sections, openSection]);

  const goSummary = useCallback(() => {
    setMode('overview');
    setActiveKey(null);
  }, []);

  const goDirection = useCallback(
    (direction: 'prev' | 'next') => {
      const target = getSequentialSectionKey(presentation.sections, activeKey, direction);
      if (target) {
        setActiveKey(target);
      }
    },
    [presentation.sections, activeKey],
  );

  // Fullscreen — client API only, gracefully guarded (unavailable/refused/exit).
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
      if (event.key === 'f' || event.key === 'F') {
        toggleFullscreen();
        return;
      }
      if (event.key === 'Escape') {
        if (typeof document !== 'undefined' && document.fullscreenElement) {
          void document.exitFullscreen?.();
        }
        return;
      }
      if (mode !== 'presentation') {
        return;
      }
      if (event.key === 'ArrowLeft') {
        goDirection('prev');
      } else if (event.key === 'ArrowRight') {
        goDirection('next');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mode, goDirection, toggleFullscreen]);

  const activeSection = all.find((section) => section.key === activeKey) ?? null;

  return (
    <div
      ref={rootRef}
      className="flex min-h-[70vh] flex-col gap-6 bg-white p-2 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100"
    >
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Présentation vendeur</h1>
        <Link
          href={`/builder/${projectId}/presentation`}
          className="rounded border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Quitter Live
        </Link>
      </div>

      {mode === 'overview' || activeSection == null ? (
        <LiveOverview
          status={presentation.status}
          sections={all}
          warnings={liveWarnings}
          hasNavigable={navigable.length > 0}
          onOpenSection={openSection}
          onStart={start}
        />
      ) : (
        <div className="flex flex-col gap-6">
          <LiveSectionNavigation
            title={activeSection.title}
            position={getNavigablePosition(presentation.sections, activeKey)}
            total={navigable.length}
            canGoPrevious={
              getSequentialSectionKey(presentation.sections, activeKey, 'prev') != null
            }
            canGoNext={getSequentialSectionKey(presentation.sections, activeKey, 'next') != null}
            onPrevious={() => goDirection('prev')}
            onNext={() => goDirection('next')}
            onSummary={goSummary}
            fullscreenButton={
              <FullscreenButton isFullscreen={isFullscreen} onToggle={toggleFullscreen} />
            }
          />

          <div className="min-h-[40vh]">
            {activeSection.status !== 'available' ? (
              <LiveUnavailableSection section={activeSection} />
            ) : activeSection.key === 'property' ? (
              <LivePropertySection property={presentation.property} />
            ) : activeSection.key === 'comparables' ? (
              <LiveComparablesSection comparables={presentation.comparables} />
            ) : activeSection.key === 'market_analysis' ? (
              <LiveMarketAnalysisSection analysis={presentation.marketAnalysis} />
            ) : activeSection.key === 'price_positioning' ? (
              <LivePricePositioningSection positioning={presentation.currentPositioning} />
            ) : activeSection.key === 'advisor_decision' ? (
              <LiveAdvisorDecisionSection
                saved={presentation.savedPositioning}
                positioningStatus={presentation.positioningStatus}
              />
            ) : activeSection.key === 'seller_price' ? (
              <LiveSellerPriceSection saved={presentation.savedPositioning} />
            ) : (
              <LiveWarningsSection warnings={liveWarnings} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
