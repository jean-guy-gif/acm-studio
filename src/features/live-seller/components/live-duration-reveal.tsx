'use client';

import { useLiveTexts } from '@/features/live-seller/components/live-texts';
import { bigValue, revealValue, statLabel } from '@/features/live-seller/components/live-stage';
import type { MarketDuration, PriceHistory } from '@/features/live-seller/types';
import { formatEuro, formatNumber, formatPercent } from '@/lib/format';

// La durée observée et les baisses de prix d'un concurrent, RÉVÉLÉES après la devinette de durée.
// Partagé par l'écran « Pourquoi toujours en vente ? » et par l'écran 2 du rythme accéléré
// (mission 95). Ces données n'arrivent du serveur qu'une fois la durée devinée enregistrée.
export function LiveDurationReveal({
  marketDuration,
  priceHistory,
  estimatedDays,
}: {
  marketDuration: MarketDuration;
  priceHistory: PriceHistory | null;
  estimatedDays: number | null;
}) {
  const observed = marketDuration.available ? marketDuration.days : null;
  const { language, texts } = useLiveTexts();
  const t = texts.live.duration;
  const euro = (value: number | null): string =>
    value != null ? formatEuro(value, { language }) : '—';
  const n = (value: number) => formatNumber(value, { language });
  // Mission 148 — les deux durées côte à côte, la révélée plus grande ; la phrase et l'historique
  // des prix en une ligne dessous (planche 4). « Observé sur le marché depuis N jours » ne se
  // répète plus sous la grande valeur, qui dit déjà ces N jours.
  return (
    <>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
        {estimatedDays != null ? (
          <div>
            <div className={statLabel}>{texts.common.yourAnswer}</div>
            <div className={bigValue}>{t.days(estimatedDays)}</div>
          </div>
        ) : null}
        <div>
          <div className={statLabel}>{t.observed}</div>
          <div className={revealValue}>
            {observed != null ? t.observedDays(observed) : t.unavailable}
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-0.5 text-sm text-zinc-500 stage:text-white/60">
        {observed != null && estimatedDays != null && observed !== estimatedDays ? (
          <span className="font-medium text-zinc-600 stage:text-white/75">
            {observed > estimatedDays
              ? t.more(n(observed - estimatedDays), n(estimatedDays))
              : t.less(n(estimatedDays - observed), n(estimatedDays))}
          </span>
        ) : null}
        {priceHistory?.available ? (
          <span className="flex flex-wrap items-baseline gap-x-4">
            <span>
              <span className={statLabel}>{t.initialPrice}</span>{' '}
              <b className="font-title text-zinc-900 stage:text-white">
                {euro(priceHistory.initialPrice)}
              </b>
            </span>
            <span>
              <span className={statLabel}>{t.drop}</span>{' '}
              <b className="font-title text-zinc-900 stage:text-white">
                {euro(priceHistory.totalDropAmount)}
                {priceHistory.totalDropPercentage != null
                  ? ` (${formatPercent(priceHistory.totalDropPercentage, { language })})`
                  : ''}
              </b>
            </span>
          </span>
        ) : (
          <span>{t.noHistory}</span>
        )}
      </div>
    </>
  );
}
