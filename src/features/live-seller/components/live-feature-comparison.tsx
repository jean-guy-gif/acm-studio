'use client';

import { DpeLetter } from '@/features/dpe/components/dpe-letter';
import { dpeClass } from '@/features/dpe/services/dpe';
import {
  comparisonBadgeClass,
  comparisonValueClass,
  statLabel,
} from '@/features/live-seller/components/live-stage';
import { useLiveTexts } from '@/features/live-seller/components/live-texts';
import type { FeatureComparison } from '@/features/live-seller/types';

// Colour convention, read from the SELLER's side (Jean-Guy, 05/11, as on the Point marché):
//   competitor_advantage -> orange        (avantage pour lui : attention)
//   same                 -> neutral grey  (équivalent)
//   competitor_weakness  -> green         (avantage pour vous)
//   unknown              -> NOT SHOWN     (filtered out below; the engine still
//                                          produces it for the advisor report)
export function LiveFeatureComparison({ items }: { items: FeatureComparison[] }) {
  const { language, texts } = useLiveTexts();
  const t = texts.common.grid;
  // Product decision (Laurent) : the seller must not see the holes in our data.
  // `unknown` criteria are hidden here — the engine keeps producing them so a
  // later advisor report can say "surface non comparable" without recomputing.
  const visibleItems = items.filter((item) => item.comparisonStatus !== 'unknown');

  if (visibleItems.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <span className={statLabel}>{t.title}</span>
        <p className="text-sm text-zinc-500 stage:text-white/60">{t.empty}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className={statLabel}>{t.title}</span>
        <span className="text-xs text-zinc-400 stage:text-white/40">
          <span className="font-semibold text-emerald-600 stage:text-emerald-300">
            {t.legend.green}
          </span>{' '}
          = {t.legend.forYou} ·{' '}
          <span className="font-semibold text-zinc-500 stage:text-white/70">{t.legend.grey}</span> ={' '}
          {t.legend.equivalent} ·{' '}
          <span className="font-semibold text-amber-600 stage:text-amber-300">
            {t.legend.orange}
          </span>{' '}
          = {t.legend.forThem}
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
        {visibleItems.map((item) => {
          const value = item.comparableValues?.[language] ?? item.comparableValue;
          return (
            <div
              key={item.criterion}
              className={`flex flex-col gap-1 rounded-xl border px-3.5 py-2.5 ${comparisonBadgeClass[item.comparisonStatus]}`}
            >
              <dt className="text-[0.68rem] font-semibold tracking-[0.12em] uppercase opacity-70">
                {t.criteria[item.criterion]}
              </dt>
              <dd className="flex flex-col">
                <span
                  className={`font-title text-lg leading-tight ${comparisonValueClass[item.comparisonStatus]}`}
                >
                  {/* Mission 80 — le DPE s'affiche en lettre colorée (A vert → G rouge). */}
                  {item.criterion === 'energy_rating' && dpeClass(value) ? (
                    <DpeLetter letter={dpeClass(value)!} size="md" />
                  ) : (
                    (value ?? '—')
                  )}
                </span>
                <span className="text-[0.68rem] opacity-70">{t.status[item.comparisonStatus]}</span>
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
