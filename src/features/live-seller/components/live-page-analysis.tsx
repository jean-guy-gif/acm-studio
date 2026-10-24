'use client';

import {
  bigValue,
  panel,
  panelSoft,
  question,
  questionHint,
  statLabel,
  statValue,
} from '@/features/live-seller/components/live-stage';
import {
  bandPosition,
  competitorPriceBasisLabel,
  type MarketReading,
} from '@/features/live-seller/services/market-reading';
import type { LivePriceGaps, PriceGap } from '@/features/live-seller/types';
import { formatEuro, formatNumber, formatPercent } from '@/lib/format';

const euro = (value: number | null): string => (value != null ? formatEuro(value) : '—');

function GapRow({ label, gap }: { label: string; gap: PriceGap }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-zinc-100 py-2.5 text-base last:border-0 stage:border-white/10">
      <span className="text-zinc-500 stage:text-white/60">{label}</span>
      <span className="font-title font-semibold text-zinc-900 stage:text-white">
        {gap.amount != null ? formatEuro(gap.amount, { signed: true }) : '—'}
        {gap.percentage != null ? ` (${formatPercent(gap.percentage, { signed: true })})` : ''}
      </span>
    </div>
  );
}

// Mission 94 — la bande des prix : chaque concurrent révélé en point, et les deux repères du
// vendeur. Aucun prix non révélé n'y figure (la lecture vient du serveur, sur les seuls révélés).
// Mission 104 — le « Prix des concurrents » y est placé aussi, comme les prix du vendeur : le
// vendeur voit où il tombe parmi les biens qu'il a vus.
// Mission 115 — trois repères nommés, « Au début », « Après le marché » et « Le plus dangereux
// selon vous » (le prix affiché du concurrent désigné, M110) : ce dernier se voit au premier
// regard, libellé et couleur de l'agence, plus un point muet. Absent sans désignation, et jamais
// pour un « Non » (M41) : seul un concurrent RÉVÉLÉ est sur la bande.
const MARKER_COLORS: Record<string, string> = {
  start: 'bg-zinc-900 stage:bg-white',
  revised: 'bg-brand',
  dangerous: 'bg-brand-deep stage:bg-brand',
  competitors: 'bg-amber-500',
};
export const DANGEROUS_MARKER_LABEL = 'Le plus dangereux selon vous';

export function PriceBand({
  reading,
  startPrice,
  revisedPrice,
  competitorPrice,
  dangerousId = null,
}: {
  reading: MarketReading;
  startPrice: number | null;
  revisedPrice: number | null;
  competitorPrice: number | null;
  // Mission 115 — le concurrent désigné « le plus dangereux » ; null tant qu'aucun ne l'est.
  dangerousId?: string | null;
}) {
  const dangerousPrice =
    dangerousId != null
      ? (reading.revealed.find((entry) => entry.id === dangerousId)?.price ?? null)
      : null;
  const markers = [
    { key: 'start', label: 'Au début', value: startPrice },
    { key: 'revised', label: 'Après le marché', value: revisedPrice },
    { key: 'dangerous', label: DANGEROUS_MARKER_LABEL, value: dangerousPrice },
    { key: 'competitors', label: 'Prix des concurrents', value: competitorPrice },
  ].filter(
    (marker): marker is { key: string; label: string; value: number } => marker.value != null,
  );
  const all = [...reading.prices, ...markers.map((marker) => marker.value)];
  const low = Math.min(...all);
  const high = Math.max(...all);
  const left = (value: number) => `${bandPosition(value, all) * 100}%`;
  // Le libellé du plus dangereux s'ancre du côté où il a la place : centré sur son repère, sauf
  // près d'un bord de la bande (il sortait de l'écran sur tablette quand le concurrent désigné
  // était le moins cher).
  const labelAnchor = (value: number): string => {
    const position = bandPosition(value, all);
    if (position < 0.3) return 'left-0';
    if (position > 0.7) return 'right-0 text-right';
    return 'left-1/2 -translate-x-1/2';
  };

  return (
    <div className={`${panelSoft} flex flex-col gap-3`} data-price-band>
      <div className={statLabel}>Les prix affichés des biens que vous avez vus</div>
      <div className="px-3">
        <div className="relative mt-5 h-16">
          <div className="absolute inset-x-0 top-1/2 h-px bg-zinc-300 stage:bg-white/25" />
          {reading.prices.map((price, index) => (
            <span
              key={`${index}-${price}`}
              data-band-dot
              className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-zinc-500 stage:border-brand-deep stage:bg-white/70"
              style={{ left: left(price) }}
              title={formatEuro(price)}
            />
          ))}
          {markers.map((marker) => (
            <span
              key={marker.key}
              data-band-marker={marker.key}
              className={`absolute h-full w-1 -translate-x-1/2 rounded-full ${MARKER_COLORS[marker.key]}`}
              style={{ left: left(marker.value) }}
              title={`${marker.label} : ${formatEuro(marker.value)}`}
            >
              {marker.key === 'dangerous' ? (
                <span
                  className={`absolute -top-5 text-xs font-semibold whitespace-nowrap text-brand-deep stage:text-brand ${labelAnchor(marker.value)}`}
                >
                  {marker.label}
                </span>
              ) : null}
            </span>
          ))}
        </div>
      </div>
      <div className="flex justify-between gap-3 text-xs text-zinc-500 stage:text-white/50">
        <span>{formatEuro(low)}</span>
        <span>{formatEuro(high)}</span>
      </div>
      <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-zinc-600 stage:text-white/70">
        <li className="flex items-center gap-2">
          <span className="size-3 rounded-full bg-zinc-500 stage:bg-white/70" aria-hidden />
          Un bien concurrent
        </li>
        {markers.map((marker) => (
          <li key={marker.key} className="flex items-center gap-2">
            <span className={`h-4 w-1 rounded-full ${MARKER_COLORS[marker.key]}`} aria-hidden />
            {marker.label} : {formatEuro(marker.value)}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Mission 58 — les trois repères sont AFFICHÉS, jamais saisis : l'analyse du conseiller a été
// préparée à froid au positionnement. Plus aucun champ de saisie conseiller devant le vendeur.
// ACM Studio ne calcule jamais l'analyse du conseiller ; les écarts sont montrés sans jugement.
// MISSION 82 — c'est ICI que le marché se révèle, face au prix que le vendeur a donné en début
// de rendez-vous.
// MISSION 94 — le chemin du vendeur (au début → après avoir vu le marché), la lecture du marché
// sur les concurrents révélés, et ce sur quoi porte le « Prix des concurrents ».
export function LivePageAnalysis({
  priceGaps,
  reading,
  revisedPrice,
  dangerousId = null,
}: {
  priceGaps: LivePriceGaps;
  reading: MarketReading;
  // Le prix reformulé par le vendeur ; null si l'écran a été passé.
  revisedPrice: number | null;
  // Mission 115 — le concurrent désigné « le plus dangereux », nommé sur la bande.
  dangerousId?: string | null;
}) {
  const gaps = priceGaps;
  const figures: { label: string; value: string }[] = [];
  if (reading.lowestPrice != null && reading.highestPrice != null) {
    figures.push({
      label: 'Prix affichés',
      value:
        reading.lowestPrice === reading.highestPrice
          ? formatEuro(reading.lowestPrice)
          : `${formatEuro(reading.lowestPrice)} à ${formatEuro(reading.highestPrice)}`,
    });
  }
  if (reading.medianPrice != null) {
    figures.push({ label: 'Prix médian', value: formatEuro(reading.medianPrice) });
  }
  if (reading.droppedCount != null) {
    figures.push({
      label: 'Baisse de prix connue',
      value: `${reading.droppedCount} sur ${reading.revealedCount}`,
    });
  }
  if (reading.medianDaysOnMarket != null) {
    figures.push({
      label: 'En vente depuis (médiane)',
      value: `${formatNumber(reading.medianDaysOnMarket)} jour${reading.medianDaysOnMarket > 1 ? 's' : ''}`,
    });
  }

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <div className="flex flex-col gap-3">
        <h2 className={question}>Analyse des prix</h2>
        <p className={questionHint}>Voici le marché, face au prix que vous aviez en tête.</p>
        {gaps.sellerPerceivedPrice != null ? (
          <p
            className="font-title text-xl font-semibold text-zinc-900 sm:text-2xl stage:text-white"
            data-seller-path
          >
            Au début&nbsp;: {formatEuro(gaps.sellerPerceivedPrice)}
            {revisedPrice != null ? (
              <> → Après avoir vu le marché&nbsp;: {formatEuro(revisedPrice)}</>
            ) : null}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className={`${panel} flex flex-col gap-1.5`}>
          <div className={statLabel}>Votre valeur perçue</div>
          <div className={bigValue}>{euro(gaps.sellerPerceivedPrice)}</div>
        </div>
        {/* Mission 109 — sans prix des concurrents (aucune décision, ou calcul impossible),
            ni le panneau ni « Calculé sur N ». */}
        {gaps.competitiveMarketCentral != null ? (
          <div className={`${panel} live-reveal-pop flex flex-col gap-1.5`}>
            {/* Mission 89 — un seul nom devant le vendeur : « Prix des concurrents ». */}
            <div className={statLabel}>Prix des concurrents</div>
            <div className={bigValue}>{euro(gaps.competitiveMarketCentral)}</div>
            {/* Mission 94 — ce sur quoi il porte ; un prix ajusté ne se dit pas « observé ». */}
            <div className="text-sm text-zinc-500 stage:text-white/60">
              {competitorPriceBasisLabel(reading)}
            </div>
          </div>
        ) : null}
        <div className={`${panel} flex flex-col gap-1.5`}>
          <div className={statLabel}>Analyse du conseiller</div>
          <div className={bigValue}>{euro(gaps.advisorComparativePrice)}</div>
        </div>
      </div>

      {reading.prices.length > 0 ? (
        <div className="flex flex-col gap-4">
          {figures.length > 0 ? (
            <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {figures.map((figure) => (
                <div key={figure.label} className={`${panelSoft} flex flex-col gap-1`}>
                  <dt className={statLabel}>{figure.label}</dt>
                  <dd className={statValue}>{figure.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          <PriceBand
            reading={reading}
            startPrice={gaps.sellerPerceivedPrice}
            revisedPrice={revisedPrice}
            competitorPrice={gaps.competitiveMarketCentral}
            dangerousId={dangerousId}
          />
        </div>
      ) : null}

      <div className={`${panelSoft} h-fit`}>
        <div className={`${statLabel} mb-2`}>Écarts observés</div>
        {gaps.competitiveMarketCentral != null ? (
          <GapRow label="Votre valeur perçue vs prix des concurrents" gap={gaps.sellerVsMarket} />
        ) : null}
        <GapRow label="Votre valeur perçue vs analyse du conseiller" gap={gaps.sellerVsAdvisor} />
        {gaps.competitiveMarketCentral != null ? (
          <GapRow
            label="Prix des concurrents vs analyse du conseiller"
            gap={gaps.marketVsAdvisor}
          />
        ) : null}
      </div>
    </div>
  );
}
