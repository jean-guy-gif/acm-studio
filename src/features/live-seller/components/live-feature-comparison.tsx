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
export function LiveFeatureComparison({
  items,
  narrow = false,
}: {
  items: FeatureComparison[];
  // Mission 148 — dans une colonne (sous la photo) : trois pastilles par rangée.
  narrow?: boolean;
}) {
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
    <div className="flex shrink-0 flex-col gap-1.5" data-feature-chips>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <span className={statLabel}>{t.title}</span>
        <span className="text-[0.7rem] text-zinc-500 stage:text-white/50">
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
      {/* Mission 148 — une bande de pastilles compactes : la couleur porte le statut, et le libellé
          le dit (« · pour vous », « · pour lui ») ; « équivalent » reste gris, sans mot (la
          légende le dit). Jamais la couleur seule (M129). */}
      <dl className={`grid grid-cols-3 gap-1.5 ${narrow ? '' : 'md:landscape:grid-cols-5'}`}>
        {visibleItems.map((item) => {
          const value = item.comparableValues?.[language] ?? item.comparableValue;
          const chip =
            item.comparisonStatus === 'competitor_advantage' ||
            item.comparisonStatus === 'competitor_weakness'
              ? t.chipStatus[item.comparisonStatus]
              : null;
          return (
            <div
              key={item.criterion}
              data-chip-status={item.comparisonStatus}
              className={`flex min-w-0 flex-col rounded-lg border px-2.5 py-1 ${comparisonBadgeClass[item.comparisonStatus]}`}
            >
              {/* Jamais coupé : le libellé passe à la ligne, et le statut (« · pour vous ») reste
                  entier, sur la même ligne ou la suivante. */}
              <dt className="text-[0.6rem] leading-tight font-semibold tracking-[0.1em] break-words uppercase opacity-80">
                {t.criteria[item.criterion]}
                {chip ? <span className="whitespace-nowrap"> · {chip}</span> : null}
              </dt>
              <dd
                className={`font-title text-sm leading-tight break-words ${comparisonValueClass[item.comparisonStatus]}`}
              >
                {/* Mission 80 — le DPE s'affiche en lettre colorée (A vert → G rouge). */}
                {item.criterion === 'energy_rating' && dpeClass(value) ? (
                  <DpeLetter letter={dpeClass(value)!} />
                ) : (
                  (value ?? '—')
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
