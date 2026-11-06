import { clientTexts, type TextLanguage } from '@/lib/client-texts';
import { formatEuro } from '@/lib/format';

// Mission 94 — « Sur quel prix partons-nous ? » : dès qu'un montant est saisi, une ligne dit où
// ce prix placerait le bien parmi les biens comparés — les concurrents dont le prix a été révélé,
// et le bien du vendeur lui-même. Un REPÈRE : aucun conseil, aucune alerte, aucune pression
// (M85). Pur ; ne lit que des prix déjà montrés au vendeur.

export type PricePosition =
  | { kind: 'cheapest' | 'most_expensive' | 'among_cheapest' | 'among_most_expensive' | 'middle' }
  | { kind: 'rank'; rank: number };

// Rang du bien parmi `total` = concurrents révélés + lui.
export function pricePosition(
  price: number,
  competitorPrices: readonly number[],
): PricePosition | null {
  const prices = competitorPrices.filter((value) => Number.isFinite(value) && value > 0);
  if (!Number.isFinite(price) || price <= 0 || prices.length === 0) {
    return null;
  }
  const cheaper = prices.filter((value) => value < price).length;
  const dearer = prices.filter((value) => value > price).length;
  if (cheaper === prices.length) {
    return { kind: 'most_expensive' };
  }
  if (dearer === prices.length) {
    return { kind: 'cheapest' };
  }
  // À égalité avec le plus cher, ou avec le moins cher : il n'est pas seul à cette place.
  if (dearer === 0) {
    return { kind: 'among_most_expensive' };
  }
  if (cheaper === 0) {
    return { kind: 'among_cheapest' };
  }
  // Autant de biens moins chers que de biens plus chers : au milieu.
  if (cheaper === dearer) {
    return { kind: 'middle' };
  }
  return { kind: 'rank', rank: cheaper + 1 };
}

// « À 380 000 €, votre bien serait le plus cher des 7 biens comparés. » Mission 140 — dans la
// langue du vendeur (le français par défaut).
export function pricePositionSentence(
  price: number,
  competitorPrices: readonly number[],
  language: TextLanguage = 'fr',
): string | null {
  const position = pricePosition(price, competitorPrices);
  if (!position) {
    return null;
  }
  const t = clientTexts(language).common.pricePosition;
  const total = competitorPrices.filter((value) => Number.isFinite(value) && value > 0).length + 1;
  const where = (() => {
    switch (position.kind) {
      case 'most_expensive':
        return t.mostExpensive(total);
      case 'cheapest':
        return t.cheapest(total);
      case 'among_most_expensive':
        return t.amongMostExpensive(total);
      case 'among_cheapest':
        return t.amongCheapest(total);
      case 'middle':
        return t.middle(total);
      case 'rank':
        return t.rank(position.rank, total);
    }
  })();
  return t.sentence(formatEuro(price, { language }), where);
}
