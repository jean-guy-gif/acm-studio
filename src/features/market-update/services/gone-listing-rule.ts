import { clientTexts, type TextLanguage } from '@/lib/client-texts';
import { FRENCH_TEXTS } from '@/lib/client-texts/fr';
// Mission 127 — la règle des annonces disparues (règle ACM, décidée par Jean-Guy le 29/10), d'après
// les jours de commercialisation au jour où l'annonce a disparu. Pur.
//   • plus de 300 jours   : « Retiré du marché sans vente » ;
//   • de 200 à 300 jours  : « Vente probable, négociation estimée de 10 à 15 % » ;
//   • de 100 à 199 jours  : « Vente probable, négociation estimée de 5 à 10 % » ;
//   • moins de 100 jours  : « Vente probable, négociation estimée de 0 à 5 % ».
// Le prix de vente estimé est une fourchette (prix du jour du retrait moins la négociation), jamais
// un chiffre seul, toujours dit « estimé » : rien dans la base ne dit que le bien est vendu.

export type GoneListingConclusion =
  | { kind: 'withdrawn' }
  | {
      kind: 'probable_sale';
      negotiationMinPercent: number;
      negotiationMaxPercent: number;
      // Le prix de vente estimé, au millier près : du plus bas (négociation maximale) au plus haut.
      estimatedMin: number;
      estimatedMax: number;
    };

export const WITHDRAWN_ABOVE_DAYS = 300;

const NEGOTIATION_BANDS: { fromDays: number; min: number; max: number }[] = [
  { fromDays: 200, min: 10, max: 15 },
  { fromDays: 100, min: 5, max: 10 },
  { fromDays: 0, min: 0, max: 5 },
];

const thousand = (value: number): number => Math.round(value / 1000) * 1000;

export function goneListingConclusion(
  daysOnMarketAtGone: number,
  priceAtGone: number,
): GoneListingConclusion {
  const days = Math.max(0, Math.floor(daysOnMarketAtGone));
  if (days > WITHDRAWN_ABOVE_DAYS) return { kind: 'withdrawn' };
  const band = NEGOTIATION_BANDS.find((item) => days >= item.fromDays)!;
  return {
    kind: 'probable_sale',
    negotiationMinPercent: band.min,
    negotiationMaxPercent: band.max,
    estimatedMin: thousand(priceAtGone * (1 - band.max / 100)),
    estimatedMax: thousand(priceAtGone * (1 - band.min / 100)),
  };
}

export const WITHDRAWN_LABEL = FRENCH_TEXTS.documents.marketUpdate.withdrawnLabel;

// « Vente probable, négociation estimée de 5 à 10 % » — jamais le nom « estimation » (M105).
// Mission 140 — dans la langue du vendeur (le français par défaut).
export function goneConclusionLabel(
  conclusion: Pick<GoneListingConclusion, 'kind'> & {
    negotiationMinPercent?: number | null;
    negotiationMaxPercent?: number | null;
  },
  language: TextLanguage = 'fr',
): string {
  const t = clientTexts(language).documents.marketUpdate;
  return conclusion.kind === 'withdrawn'
    ? t.withdrawnLabel
    : t.probableSaleLabel(
        conclusion.negotiationMinPercent ?? 0,
        conclusion.negotiationMaxPercent ?? 0,
      );
}
