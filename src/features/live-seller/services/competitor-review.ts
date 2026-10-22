import type { SellerComparable } from '@/features/live-seller/services/project-live-for-seller';

// Mission 113 — « Revoir » un concurrent sur l'écran du plus dangereux. Ce que la fiche peut
// montrer se décide ici, pas dans le composant : un concurrent jugé « Non » n'a jamais eu son
// prix ni sa durée révélés (M41, M104) — même si son prix a voyagé parce que le « Non » est venu
// après la révélation (M108), la fiche n'en dit rien.
export type CompetitorReviewFacts = {
  price: number | null;
  pricePerSquareMeter: number | null;
  // Durée en vente, seulement si la durée a été devinée puis révélée pendant le Live.
  marketDays: number | null;
};

const NOTHING: CompetitorReviewFacts = { price: null, pricePerSquareMeter: null, marketDays: null };

export function competitorReviewFacts(entry: SellerComparable): CompetitorReviewFacts {
  if (!entry.authorized || entry.response?.seller_serious_competitor === 'no') {
    return NOTHING;
  }
  const duration = entry.marketDuration;
  return {
    price: entry.price,
    pricePerSquareMeter: entry.pricePerSquareMeter,
    marketDays: duration?.available ? duration.days : null,
  };
}
