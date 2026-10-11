import {
  bigValue,
  panelSoft,
  revealValue,
  statLabel,
} from '@/features/live-seller/components/live-stage';
import type { MarketDuration, PriceHistory } from '@/features/live-seller/types';
import { formatEuro, formatNumber, formatPercent } from '@/lib/format';

const euro = (value: number | null): string => (value != null ? formatEuro(value) : '—');

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
  return (
    <>
      <div>
        <div className={statLabel}>Durée observée sur le marché</div>
        <div className={revealValue}>
          {observed != null ? `${formatNumber(observed)} jours` : 'Non disponible'}
        </div>
        {marketDuration.available ? (
          <div className="mt-1 text-sm text-zinc-500 stage:text-white/60">
            {marketDuration.label}
          </div>
        ) : null}
        {observed != null && estimatedDays != null && observed !== estimatedDays ? (
          <div className="mt-1 text-sm font-medium text-zinc-600 stage:text-white/75">
            {observed > estimatedDays
              ? `Soit ${formatNumber(observed - estimatedDays)} jours de plus que votre estimation (${formatNumber(estimatedDays)} jours).`
              : `Soit ${formatNumber(estimatedDays - observed)} jours de moins que votre estimation (${formatNumber(estimatedDays)} jours).`}
          </div>
        ) : null}
      </div>

      {priceHistory?.available ? (
        <div className={`${panelSoft} flex flex-wrap items-baseline gap-x-6 gap-y-2`}>
          <div>
            <div className={statLabel}>Prix initial</div>
            <div className={bigValue}>{euro(priceHistory.initialPrice)}</div>
          </div>
          <div>
            <div className={statLabel}>Baisse constatée</div>
            <div className={bigValue}>
              {euro(priceHistory.totalDropAmount)}
              {priceHistory.totalDropPercentage != null
                ? ` (${formatPercent(priceHistory.totalDropPercentage)})`
                : ''}
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-zinc-400 stage:text-white/50">
          Historique de prix non disponible.
        </p>
      )}
    </>
  );
}
