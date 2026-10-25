import {
  derivePriceChange,
  type DatedObservation,
} from '@/features/comparable-import/services/derive-price-change';

// Mission 122 (décision de Jean-Guy, 25/10) — une baisse de prix observée par l'agence (M47), datée
// de la PREMIÈRE observation au nouveau prix : 349 000 € le 1er, 335 000 € le 3, encore 335 000 €
// relu le 25 → baisse de 14 000 € le 3, jamais « aujourd'hui ». Pas de baisse : null.
export function observedDrop(
  observations: DatedObservation[],
): { amount: number; at: string } | null {
  const change = derivePriceChange(observations);
  if (!change || change.amount <= 0) return null;
  const sorted = [...observations].sort((a, b) => a.observedOn.localeCompare(b.observedOn));
  let at = change.toDate;
  for (let index = sorted.length - 1; index >= 0; index -= 1) {
    if (sorted[index]!.price !== change.toPrice) break;
    at = sorted[index]!.observedOn;
  }
  return { amount: change.amount, at };
}
