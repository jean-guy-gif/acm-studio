'use client';

import { useLiveTexts } from '@/features/live-seller/components/live-texts';
import {
  bigValue,
  panelSoft,
  revealValue,
  statLabel,
} from '@/features/live-seller/components/live-stage';
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
  return (
    <>
      <div>
        <div className={statLabel}>{t.observed}</div>
        <div className={revealValue}>{observed != null ? t.days(observed) : t.unavailable}</div>
        {marketDuration.available && marketDuration.days != null ? (
          <div className="mt-1 text-sm text-zinc-500 stage:text-white/60">
            {t.observedSince(marketDuration.days)}
          </div>
        ) : null}
        {observed != null && estimatedDays != null && observed !== estimatedDays ? (
          <div className="mt-1 text-sm font-medium text-zinc-600 stage:text-white/75">
            {observed > estimatedDays
              ? t.more(n(observed - estimatedDays), n(estimatedDays))
              : t.less(n(estimatedDays - observed), n(estimatedDays))}
          </div>
        ) : null}
      </div>

      {priceHistory?.available ? (
        <div className={`${panelSoft} flex flex-wrap items-baseline gap-x-6 gap-y-2`}>
          <div>
            <div className={statLabel}>{t.initialPrice}</div>
            <div className={bigValue}>{euro(priceHistory.initialPrice)}</div>
          </div>
          <div>
            <div className={statLabel}>{t.drop}</div>
            <div className={bigValue}>
              {euro(priceHistory.totalDropAmount)}
              {priceHistory.totalDropPercentage != null
                ? ` (${formatPercent(priceHistory.totalDropPercentage, { language })})`
                : ''}
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-zinc-400 stage:text-white/50">{t.noHistory}</p>
      )}
    </>
  );
}
