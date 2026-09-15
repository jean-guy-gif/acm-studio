import type { ObservedPriceChange } from '@/features/comparable-import/types';

// Derives the price change CONSTATÉE between the FIRST and the LATEST observation of
// the same listing (Mission 47 §4). A constat, never an estimate: two prices ACM
// actually recorded, on two dates. `amount` > 0 is a drop (349 000 → 335 000 =
// +14 000 « de baisse »). Fewer than two dated observations, or no net change → null.
//
// Proposed to the advisor with its two dates; never written to price_drop_* in
// silence — the advisor validates.

export type DatedObservation = { observedOn: string; price: number };

export function derivePriceChange(observations: DatedObservation[]): ObservedPriceChange {
  const dated = observations.filter((o) => typeof o.price === 'number' && o.observedOn);
  if (dated.length < 2) {
    return null;
  }
  const sorted = [...dated].sort((a, b) => a.observedOn.localeCompare(b.observedOn));
  const first = sorted[0];
  const latest = sorted[sorted.length - 1];

  if (first.observedOn === latest.observedOn || first.price === latest.price) {
    return null; // same day, or no net change between first and latest
  }

  const amount = first.price - latest.price; // > 0 = drop
  const percentage = first.price > 0 ? Math.round((amount / first.price) * 1000) / 10 : 0;

  return {
    fromPrice: first.price,
    fromDate: first.observedOn,
    toPrice: latest.price,
    toDate: latest.observedOn,
    amount,
    percentage,
  };
}
