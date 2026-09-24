'use client';

import {
  bigValue,
  panel,
  panelSoft,
  question,
  questionHint,
  statLabel,
} from '@/features/live-seller/components/live-stage';
import type { LivePriceGaps, PriceGap } from '@/features/live-seller/types';

const euro = (value: number | null): string =>
  value != null ? `${Math.round(value).toLocaleString('fr-FR')}\u00A0€` : '—';

function GapRow({ label, gap }: { label: string; gap: PriceGap }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-zinc-100 py-2.5 text-base last:border-0 stage:border-white/10">
      <span className="text-zinc-500 stage:text-white/60">{label}</span>
      <span className="font-title font-semibold text-zinc-900 stage:text-white">
        {gap.amount != null
          ? `${gap.amount >= 0 ? '+' : ''}${gap.amount.toLocaleString('fr-FR')}\u00A0€`
          : '—'}
        {gap.percentage != null ? ` (${gap.percentage >= 0 ? '+' : ''}${gap.percentage} %)` : ''}
      </span>
    </div>
  );
}

// Mission 58 — les trois repères sont AFFICHÉS, jamais saisis : l'analyse du conseiller a été
// préparée à froid au positionnement. Plus aucun champ de saisie conseiller devant le vendeur.
// ACM Studio ne calcule jamais l'analyse du conseiller ; les écarts sont montrés sans jugement.
export function LivePageAnalysis({ priceGaps }: { priceGaps: LivePriceGaps }) {
  const gaps = priceGaps;

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <div className="flex flex-col gap-3">
        <h2 className={question}>Analyse des prix</h2>
        <p className={questionHint}>
          Trois repères, côte à côte : la valeur perçue, le marché calculé, l’analyse du conseiller.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className={`${panel} flex flex-col gap-1.5`}>
          <div className={statLabel}>Valeur perçue par le vendeur</div>
          <div className={bigValue}>{euro(gaps.sellerPerceivedPrice)}</div>
        </div>
        <div className={`${panel} flex flex-col gap-1.5`}>
          <div className={statLabel}>Marché calculé</div>
          <div className={bigValue}>{euro(gaps.competitiveMarketCentral)}</div>
        </div>
        <div className={`${panel} flex flex-col gap-1.5`}>
          <div className={statLabel}>Analyse du conseiller</div>
          <div className={bigValue}>{euro(gaps.advisorComparativePrice)}</div>
        </div>
      </div>

      <div className={`${panelSoft} h-fit`}>
        <div className={`${statLabel} mb-2`}>Écarts observés</div>
        <GapRow label="Valeur perçue vs marché calculé" gap={gaps.sellerVsMarket} />
        <GapRow label="Valeur perçue vs analyse du conseiller" gap={gaps.sellerVsAdvisor} />
        <GapRow label="Marché calculé vs analyse du conseiller" gap={gaps.marketVsAdvisor} />
      </div>
    </div>
  );
}
