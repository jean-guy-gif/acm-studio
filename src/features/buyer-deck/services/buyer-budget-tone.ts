import type { PriceAlignmentTone } from '@/features/price-positioning/services/price-alignment';

// Essai de Jean-Guy (26/10) — le budget de l'acquéreur en couleur (précise M116 pour
// l'acquéreur) : vert dans son budget, orange au-dessus, « à négocier » jusqu'à +5 % ; jamais
// rouge, devant l'acquéreur comme pour le conseiller. Sans prix montré ou sans budget : rien. Pur.
export function buyerBudgetTone(
  price: number | null | undefined,
  budgetMax: number | null | undefined,
): Exclude<PriceAlignmentTone, 'red'> | null {
  if (price == null || budgetMax == null || budgetMax <= 0) return null;
  return price <= budgetMax ? 'green' : 'orange';
}
