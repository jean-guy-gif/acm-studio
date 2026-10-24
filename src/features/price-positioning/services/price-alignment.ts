import { calculatePriceDeviation } from '@/features/price-positioning/services/calculate-price-deviation';

// Mission 116 — le prix de commercialisation, en couleur face à l'analyse du conseiller (M89) :
// d'un coup d'œil, aligné, proche ou éloigné. Pur. La règle :
//   écart = (prix de commercialisation − analyse du conseiller) / analyse du conseiller
//   • vert   « Prix aligné sur le marché » : écart strictement inférieur à +5 % (tout prix sous
//     l'analyse compris) ;
//   • orange « Proche du marché »          : de +5 % inclus à strictement moins de +10 % ;
//   • rouge  « Éloigné du marché »         : +10 % inclus et au-delà.
// Les deux seuils sont ici, et nulle part ailleurs. Sans analyse du conseiller (M109), ou sans
// prix de commercialisation : null — aucune couleur, aucun libellé. Jamais la couleur seule : le
// libellé accompagne toujours la couleur.
//
// L'écart part de `calculatePriceDeviation` (l'écart absolu, les cas nuls et la référence à 0) ;
// le pourcentage y est arrondi au dixième, ce qui classerait 4,99 % comme 5 % : les seuils se
// comparent donc à l'écart exact, calculé sur l'écart absolu rendu.

export const ALIGNED_BELOW_PERCENT = 5;
export const CLOSE_BELOW_PERCENT = 10;

export type PriceAlignmentTone = 'green' | 'orange' | 'red';

export type PriceAlignment = {
  tone: PriceAlignmentTone;
  label: string;
  // L'écart exact, en %, non arrondi.
  percent: number;
};

export const PRICE_ALIGNMENT_LABELS: Record<PriceAlignmentTone, string> = {
  green: 'Prix aligné sur le marché',
  orange: 'Proche du marché',
  red: 'Éloigné du marché',
};

export function priceAlignment(
  commercializationPrice: number | null | undefined,
  advisorAnalysis: number | null | undefined,
): PriceAlignment | null {
  const deviation = calculatePriceDeviation(commercializationPrice, advisorAnalysis);
  if (deviation == null || deviation.percentage == null || !advisorAnalysis) {
    return null;
  }
  const percent = (deviation.absolute / advisorAnalysis) * 100;
  const tone: PriceAlignmentTone =
    percent < ALIGNED_BELOW_PERCENT ? 'green' : percent < CLOSE_BELOW_PERCENT ? 'orange' : 'red';
  return { tone, label: PRICE_ALIGNMENT_LABELS[tone], percent };
}

// Les classes de la couleur : lisibles sur fond clair comme sur la scène sombre du Live.
export const PRICE_ALIGNMENT_TEXT: Record<PriceAlignmentTone, string> = {
  green: 'text-emerald-700 stage:text-emerald-300',
  orange: 'text-amber-700 stage:text-amber-300',
  red: 'text-red-700 stage:text-red-300',
};
