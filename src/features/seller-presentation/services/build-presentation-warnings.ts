import type {
  PositioningStatus,
  SellerPresentationWarning,
} from '@/features/seller-presentation/types/seller-presentation';

export type PresentationWarningContext = {
  hasProperty: boolean;
  hasValidSellerSurface: boolean;
  exploitableCount: number;
  positioningReady: boolean;
  positioningStatus: PositioningStatus;
  hasSavedDecision: boolean;
  hasSellerPrice: boolean;
  propertyMainDataIncomplete: boolean;
  propertyHasPhoto: boolean;
  anyComparablePhoto: boolean;
  excludedOutlierCount: number;
  outliersReintroduced: boolean;
  lowConfidence: boolean;
  highDispersion: boolean;
};

// Deterministic preparation alerts. Factual, non-judgemental messages. Ordered
// blocking → warning → info, de-duplicated by code. Called only by
// buildSellerPresentation().
export function buildPresentationWarnings(
  context: PresentationWarningContext,
): SellerPresentationWarning[] {
  const candidates: Array<SellerPresentationWarning & { include: boolean }> = [
    // Blocking.
    {
      include: !context.hasProperty,
      code: 'no_property',
      severity: 'blocking',
      message: 'Aucun bien vendeur n’est renseigné.',
    },
    {
      include: context.hasProperty && !context.hasValidSellerSurface,
      code: 'no_seller_surface',
      severity: 'blocking',
      message: 'La surface du bien vendeur n’est pas renseignée.',
    },
    {
      include: context.exploitableCount === 0,
      code: 'no_comparable',
      severity: 'blocking',
      message: 'Aucun comparable retenu exploitable n’est disponible.',
    },
    {
      include: !context.positioningReady,
      code: 'positioning_unavailable',
      severity: 'blocking',
      message: 'Le positionnement prix ne peut pas être calculé avec les données actuelles.',
    },
    // Vigilance.
    {
      include: context.exploitableCount > 0 && context.exploitableCount < 3,
      code: 'few_comparables',
      severity: 'warning',
      message: 'Moins de trois comparables exploitables sont disponibles.',
    },
    {
      include: !context.hasSavedDecision,
      code: 'decision_not_saved',
      severity: 'warning',
      message: 'La décision de positionnement n’a pas encore été enregistrée.',
    },
    {
      include: context.positioningStatus === 'outdated',
      code: 'decision_outdated',
      severity: 'warning',
      message: 'La décision enregistrée diffère du calcul courant.',
    },
    {
      include: !context.hasSellerPrice,
      code: 'seller_price_missing',
      severity: 'warning',
      message: 'Aucun prix souhaité par le vendeur n’est renseigné.',
    },
    {
      include: context.hasProperty && context.propertyMainDataIncomplete,
      code: 'property_incomplete',
      severity: 'warning',
      message: 'Certaines informations principales du bien vendeur sont manquantes.',
    },
    {
      include: context.hasProperty && !context.propertyHasPhoto,
      code: 'property_no_photo',
      severity: 'warning',
      message: 'Aucun visuel n’est disponible pour le bien vendeur.',
    },
    {
      include: context.exploitableCount > 0 && !context.anyComparablePhoto,
      code: 'comparables_no_photo',
      severity: 'warning',
      message: 'Aucun visuel n’est disponible pour les comparables retenus.',
    },
    // Informative.
    {
      include: context.excludedOutlierCount > 0,
      code: 'outliers_excluded',
      severity: 'info',
      message: 'Des comparables atypiques ont été exclus du calcul.',
    },
    {
      include: context.outliersReintroduced,
      code: 'outliers_reintroduced',
      severity: 'info',
      message: 'Des comparables atypiques ont été réintégrés pour conserver un échantillon.',
    },
    {
      include: context.lowConfidence,
      code: 'low_confidence',
      severity: 'info',
      message: 'Le niveau de confiance du positionnement est faible.',
    },
    {
      include: context.highDispersion,
      code: 'high_dispersion',
      severity: 'info',
      message: 'Le marché observé présente une forte dispersion des prix.',
    },
  ];

  const seen = new Set<string>();
  const warnings: SellerPresentationWarning[] = [];
  for (const candidate of candidates) {
    if (candidate.include && !seen.has(candidate.code)) {
      seen.add(candidate.code);
      warnings.push({
        code: candidate.code,
        severity: candidate.severity,
        message: candidate.message,
      });
    }
  }
  return warnings;
}
