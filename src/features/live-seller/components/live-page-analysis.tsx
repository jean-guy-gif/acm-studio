'use client';

import { useLiveTexts } from '@/features/live-seller/components/live-texts';
import {
  figureCard,
  panelSoft,
  question,
  questionHint,
  screen,
  screenHead,
  statLabel,
} from '@/features/live-seller/components/live-stage';
import {
  bandPosition,
  competitorPriceBasisLabel,
  type MarketReading,
} from '@/features/live-seller/services/market-reading';
import type { LivePriceGaps, PriceGap } from '@/features/live-seller/types';
import { FRENCH_TEXTS } from '@/lib/client-texts/fr';
import { formatEuro, formatNumber, formatPercent } from '@/lib/format';

function GapRow({ label, gap }: { label: string; gap: PriceGap }) {
  const { language } = useLiveTexts();
  return (
    <div className="flex items-baseline justify-between gap-3 py-0.5 text-sm">
      <span className="text-zinc-500 stage:text-white/60">{label}</span>
      <span className="font-title font-semibold text-zinc-900 stage:text-white">
        {gap.amount != null ? formatEuro(gap.amount, { signed: true, language }) : '—'}
        {gap.percentage != null
          ? ` (${formatPercent(gap.percentage, { signed: true, language })})`
          : ''}
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
export const DANGEROUS_MARKER_LABEL = FRENCH_TEXTS.live.analysis.band.dangerous;

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
  const { language, texts } = useLiveTexts();
  const t = texts.live.analysis.band;
  const euro = (value: number) => formatEuro(value, { language });
  const dangerousPrice =
    dangerousId != null
      ? (reading.revealed.find((entry) => entry.id === dangerousId)?.price ?? null)
      : null;
  const markers = [
    { key: 'start', label: t.start, value: startPrice },
    { key: 'revised', label: t.revised, value: revisedPrice },
    { key: 'dangerous', label: t.dangerous, value: dangerousPrice },
    { key: 'competitors', label: t.competitors, value: competitorPrice },
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
    <div className={`${panelSoft} flex shrink-0 flex-col gap-2`} data-price-band>
      <div className={statLabel}>{t.title}</div>
      <div className="px-3">
        <div className="relative mt-4 h-12">
          <div className="absolute inset-x-0 top-1/2 h-px bg-zinc-300 stage:bg-white/25" />
          {reading.prices.map((price, index) => (
            <span
              key={`${index}-${price}`}
              data-band-dot
              className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-zinc-500 stage:border-brand-deep stage:bg-white/70"
              style={{ left: left(price) }}
              title={euro(price)}
            />
          ))}
          {markers.map((marker) => (
            <span
              key={marker.key}
              data-band-marker={marker.key}
              className={`absolute h-full w-1 -translate-x-1/2 rounded-full ${MARKER_COLORS[marker.key]}`}
              style={{ left: left(marker.value) }}
              title={t.marker(marker.label, euro(marker.value))}
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
        <span>{euro(low)}</span>
        <span>{euro(high)}</span>
      </div>
      <ul className="flex flex-wrap gap-x-5 gap-y-0.5 text-xs text-zinc-600 sm:text-sm stage:text-white/70">
        <li className="flex items-center gap-2">
          <span className="size-3 rounded-full bg-zinc-500 stage:bg-white/70" aria-hidden />
          {t.dot}
        </li>
        {markers.map((marker) => (
          <li key={marker.key} className="flex items-center gap-2">
            <span className={`h-4 w-1 rounded-full ${MARKER_COLORS[marker.key]}`} aria-hidden />
            {t.marker(marker.label, euro(marker.value))}
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
  const { language, texts } = useLiveTexts();
  const t = texts.live.analysis;
  const euro = (value: number | null): string =>
    value != null ? formatEuro(value, { language }) : '—';
  const figures: { label: string; value: string }[] = [];
  if (reading.lowestPrice != null && reading.highestPrice != null) {
    figures.push({
      label: t.listed,
      value:
        reading.lowestPrice === reading.highestPrice
          ? euro(reading.lowestPrice)
          : t.range(euro(reading.lowestPrice), euro(reading.highestPrice)),
    });
  }
  if (reading.medianPrice != null) {
    figures.push({ label: t.median, value: euro(reading.medianPrice) });
  }
  if (reading.droppedCount != null) {
    figures.push({
      label: t.dropped,
      value: t.droppedValue(reading.droppedCount, reading.revealedCount),
    });
  }
  if (reading.medianDaysOnMarket != null) {
    figures.push({
      label: t.medianDays,
      value: t.medianDaysValue(
        formatNumber(reading.medianDaysOnMarket, { language }),
        reading.medianDaysOnMarket,
      ),
    });
  }

  // Mission 148 — l'écran tient sur la tablette (planche 5) : le chemin du vendeur à côté du titre,
  // les chiffres sur une rangée, la bande des prix, les écarts en une ligne chacun.
  const cards: { key: string; label: string; value: string; note?: string; reveal?: boolean }[] =
    [];
  if (gaps.sellerPerceivedPrice != null) {
    cards.push({ key: 'perceived', label: t.perceived, value: euro(gaps.sellerPerceivedPrice) });
  }
  // Mission 109 — sans prix des concurrents (aucune décision, ou calcul impossible), ni la case ni
  // « Calculé sur N ». Mission 89 — un seul nom devant le vendeur : « Prix des concurrents ».
  if (gaps.competitiveMarketCentral != null) {
    cards.push({
      key: 'competitors',
      label: t.competitorPrice,
      value: euro(gaps.competitiveMarketCentral),
      // Mission 94 — ce sur quoi il porte ; un prix ajusté ne se dit pas « observé ».
      note: competitorPriceBasisLabel(reading, language),
      reveal: true,
    });
  }
  cards.push({ key: 'advisor', label: t.advisor, value: euro(gaps.advisorComparativePrice) });
  if (reading.prices.length > 0) {
    for (const figure of figures) {
      cards.push({ key: figure.label, label: figure.label, value: figure.value });
    }
  }

  return (
    <div className={screen}>
      <div className="flex shrink-0 flex-col gap-1.5 md:flex-row md:items-end md:justify-between md:gap-6">
        <div className={screenHead}>
          <h2 className={question}>{t.title}</h2>
          {/* Mission 131 — en présentation directe, aucun prix n'a été demandé au vendeur : rien ne
              lui dit qu'il n'a pas répondu. */}
          <p className={questionHint}>
            {gaps.sellerPerceivedPrice != null ? t.hintWithPrice : t.hintDirect}
          </p>
        </div>
        {gaps.sellerPerceivedPrice != null ? (
          <p
            className="font-title text-lg font-semibold text-zinc-900 sm:text-xl md:text-right stage:text-white"
            data-seller-path
          >
            {t.pathStart(euro(gaps.sellerPerceivedPrice))}
            {revisedPrice != null ? t.pathAfter(euro(revisedPrice)) : null}
          </p>
        ) : null}
      </div>

      <div className="grid shrink-0 grid-cols-[repeat(auto-fit,minmax(8.5rem,1fr))] gap-2">
        {cards.map((card) => (
          <div key={card.key} className={`${figureCard} ${card.reveal ? 'live-reveal-pop' : ''}`}>
            <div className={statLabel}>{card.label}</div>
            <div className="font-title text-base leading-tight font-bold text-zinc-900 sm:text-lg stage:text-white">
              {card.value}
            </div>
            {card.note ? (
              <div className="text-[0.7rem] leading-snug text-zinc-500 stage:text-white/60">
                {card.note}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {reading.prices.length > 0 ? (
        <PriceBand
          reading={reading}
          startPrice={gaps.sellerPerceivedPrice}
          revisedPrice={revisedPrice}
          competitorPrice={gaps.competitiveMarketCentral}
          dangerousId={dangerousId}
        />
      ) : null}

      <div className={`${figureCard} shrink-0`}>
        <div className={statLabel}>{t.gaps}</div>
        <div className="grid grid-cols-1 gap-x-6 md:landscape:grid-cols-3">
          {gaps.competitiveMarketCentral != null ? (
            <GapRow label={t.gapSellerMarket} gap={gaps.sellerVsMarket} />
          ) : null}
          <GapRow label={t.gapSellerAdvisor} gap={gaps.sellerVsAdvisor} />
          {gaps.competitiveMarketCentral != null ? (
            <GapRow label={t.gapMarketAdvisor} gap={gaps.marketVsAdvisor} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
