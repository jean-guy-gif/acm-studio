import { median } from '@/features/comparables/services/calculate-comparable-summary';
import { neutralComparableLabel } from '@/features/live-seller/utils/neutral-comparable-label';
import type { SellerSynthesis } from '@/features/seller-synthesis/types';
import { formatPercent } from '@/lib/format';

// Mission 110 — la synthèse au vendeur, construite depuis des lignes lues par listes de colonnes
// autorisées (queries/load-seller-synthesis.ts). Pur. Aucune donnée d'annonce n'entre ici : le
// type d'entrée ne reçoit ni adresse, ni titre, ni lien, ni « Vendu par ».

export type SynthesisCompetitorRow = {
  id: string;
  price: number | null;
  property_type: string | null;
  rooms_count: number | null;
  surface_area: number | null;
  city: string | null;
  district: string | null;
  is_selected: boolean;
};

export type SynthesisResponseRow = {
  comparable_id: string | null;
  seller_estimated_listing_price: number | null;
  seller_serious_competitor: string | null;
  revealed_listing_price: number | null;
};

export type SynthesisInput = {
  sellerName: string;
  concludedAt: string | null;
  competitors: SynthesisCompetitorRow[];
  responses: SynthesisResponseRow[];
  summary: {
    seller_perceived_property_price: number | null;
    seller_revised_property_price: number | null;
  } | null;
  decision: {
    advisor_price: number | null;
    advisor_comparative_market_price: number | null;
    justification: string | null;
  } | null;
  // Mission 111 — les montants figés à la conclusion ; null tant que le dossier n'est pas conclu.
  frozen: { advisor_price: number | null; advisor_analysis: number | null } | null;
  commercializationPrice: number | null;
  agency: SellerSynthesis['agency'];
};

const round = (value: number): number => Math.round(value * 10) / 10;

// Mission 111 — après la conclusion, les montants figés : une décision changée ensuite (elle ne
// peut plus l'être, mais un lien vit 30 jours) ne change pas ce que dit la synthèse. Avant, la
// décision en cours. Un montant absent n'a pas de ligne.
function synthesisDecision(input: SynthesisInput): SellerSynthesis['decision'] {
  const justification = input.decision?.justification?.trim() || null;
  const competitorPrice = input.frozen
    ? input.frozen.advisor_price
    : (input.decision?.advisor_price ?? null);
  const advisorAnalysis = input.frozen
    ? input.frozen.advisor_analysis
    : (input.decision?.advisor_comparative_market_price ?? null);
  if (competitorPrice == null && advisorAnalysis == null && justification == null) return null;
  return { competitorPrice, advisorAnalysis, justification };
}

export function buildSellerSynthesis(input: SynthesisInput): SellerSynthesis {
  const byId = new Map(input.competitors.map((row) => [row.id, row]));
  // Les biens révélés pendant le Live : une réponse donnée, et pas écartés par « non » (M94, M108).
  const revealed = input.responses
    .filter(
      (response) =>
        response.seller_estimated_listing_price != null &&
        response.seller_serious_competitor !== 'no',
    )
    .map((response) => {
      const competitor = response.comparable_id ? byId.get(response.comparable_id) : undefined;
      // Le prix révélé, figé à la devinette (M96) ; à défaut (Live d'avant), le prix affiché.
      const price = response.revealed_listing_price ?? competitor?.price ?? null;
      return competitor && price != null && price > 0
        ? { competitor, price, guess: response.seller_estimated_listing_price as number }
        : null;
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry != null);

  // L'écart de chaque réponse, en % de la réponse (comme au Live, M96) ; une réponse à 0 ne compte pas.
  const gaps = revealed
    .filter((entry) => entry.guess > 0)
    .map((entry) => ((entry.price - entry.guess) / entry.guess) * 100);
  const prices = revealed.map((entry) => entry.price).sort((a, b) => a - b);
  const medianPrice = median(prices);

  return {
    sellerName: input.sellerName,
    meetingDate: input.concludedAt,
    sellerSaid: {
      perceivedPrice: input.summary?.seller_perceived_property_price ?? null,
      revisedPrice: input.summary?.seller_revised_property_price ?? null,
      averageGuessGapPercent:
        gaps.length > 0 ? round(gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length) : null,
    },
    market: {
      competitors: revealed
        .map((entry) => ({
          label: neutralComparableLabel({
            propertyType: entry.competitor.property_type,
            roomsCount: entry.competitor.rooms_count,
            surfaceArea: entry.competitor.surface_area,
            city: entry.competitor.city,
            district: entry.competitor.district,
          }),
          price: entry.price,
        }))
        .sort((a, b) => a.price - b.price),
      lowestPrice: prices[0] ?? null,
      highestPrice: prices[prices.length - 1] ?? null,
      medianPrice: medianPrice == null ? null : Math.round(medianPrice),
    },
    decision: synthesisDecision(input),
    commercializationPrice: input.commercializationPrice,
    agency: input.agency,
  };
}

// « En moyenne, les prix affichés étaient 6 % au-dessus de vos réponses. »
export function guessGapSentence(percent: number | null): string | null {
  if (percent == null) {
    return null;
  }
  if (Math.abs(percent) < 1) {
    return 'En moyenne, vos réponses étaient très proches des prix affichés.';
  }
  const amount = Math.round(Math.abs(percent));
  return percent > 0
    ? `En moyenne, les prix affichés étaient ${formatPercent(amount)} au-dessus de vos réponses.`
    : `En moyenne, les prix affichés étaient ${formatPercent(amount)} en dessous de vos réponses.`;
}
