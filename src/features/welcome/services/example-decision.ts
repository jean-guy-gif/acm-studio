import type { Comparable } from '@/features/comparables/types';
import { buildPositioningSnapshot } from '@/features/price-positioning/services/build-positioning-snapshot';
import { calculatePricePositioning } from '@/features/price-positioning/services/calculate-price-positioning';
import type { Database } from '@/lib/supabase/database.types';

type PositioningInsert = Database['public']['Tables']['project_price_positionings']['Insert'];

// Mission 110 — le dossier d'exemple est livré avec une DÉCISION DE PRIX, pour montrer un parcours
// complet : prêt, dans la liste du Live, avec un « Prix des concurrents » devant le vendeur (M109)
// et une synthèse. Rien n'est inventé à la main : la plage, la confiance et l'instantané sont ceux
// du moteur de l'outil, calculés sur les concurrents fictifs ; le prix retenu est le centre de la
// plage, à mille euros près. La justification dit qu'elle est un exemple (M97).
// Mission 113 — « Votre analyse de valeur » aussi, arrondie au millier comme M110 le dit : sans
// elle, la conclusion figeait une analyse vide et l'exemple ne montrait pas « Analyse du conseiller ».
export const EXAMPLE_JUSTIFICATION =
  'Exemple\u00a0: le bien se place au milieu des cinq concurrents, de surface et de nombre de pièces proches. Son balcon et son garage le distinguent\u202f; son DPE D est dans la moyenne.';

export function exampleDecisionRow(input: {
  projectId: string;
  agencyId: string;
  validatedBy: string;
  sellerSurface: number;
  comparables: Comparable[];
  now: Date;
}): PositioningInsert | null {
  const computed = calculatePricePositioning({
    comparables: input.comparables,
    sellerProperty: { surfaceArea: input.sellerSurface },
    advisorPrice: null,
  });
  if (computed.status !== 'ready' || computed.recommendedRange == null) {
    return null;
  }
  const advisorPrice = Math.round(computed.recommendedRange.central / 1000) * 1000;
  // L'instantané d'une décision porte le prix retenu : on le recalcule avec lui.
  const positioning = calculatePricePositioning({
    comparables: input.comparables,
    sellerProperty: { surfaceArea: input.sellerSurface },
    advisorPrice,
  });
  const snapshot = buildPositioningSnapshot(positioning);
  if (positioning.status !== 'ready' || positioning.recommendedRange == null || snapshot == null) {
    return null;
  }
  const at = input.now.toISOString();
  return {
    project_id: input.projectId,
    agency_id: input.agencyId,
    advisor_price: advisorPrice,
    advisor_comparative_market_price: advisorPrice,
    range_low: positioning.recommendedRange.low,
    range_central: positioning.recommendedRange.central,
    range_high: positioning.recommendedRange.high,
    confidence_score: positioning.confidence.score,
    confidence_level: positioning.confidence.level,
    justification: EXAMPLE_JUSTIFICATION,
    calculation_snapshot: snapshot as unknown as PositioningInsert['calculation_snapshot'],
    validated_by: input.validatedBy,
    validated_at: at,
    updated_at: at,
  };
}
