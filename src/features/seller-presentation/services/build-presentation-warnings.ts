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
  // Diagnostics (Mission 22).
  dpeNotDone: boolean;
  electricityAnomaly: boolean;
  gasAnomaly: boolean;
  asbestosPositive: boolean;
  leadPositive: boolean;
  termitesPositive: boolean;
  erpUnknown: boolean;
  diagnosticsInProgress: boolean;
  diagnosticsValidityNear: boolean;
  // Condominium (Mission 22).
  condoOngoingProcedures: boolean;
  condoVotedWorks: boolean;
  condoUnpaidCharges: boolean;
  condoMissingAnnualCharges: boolean;
  condoIncomplete: boolean;
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
    // Vigilance — diagnostics.
    {
      include: context.dpeNotDone,
      code: 'dpe_not_done',
      severity: 'warning',
      message: 'Le DPE n’est pas encore réalisé.',
    },
    {
      include: context.electricityAnomaly,
      code: 'electricity_anomaly',
      severity: 'warning',
      message: 'Une anomalie électrique est signalée.',
    },
    {
      include: context.gasAnomaly,
      code: 'gas_anomaly',
      severity: 'warning',
      message: 'Une anomalie gaz est signalée.',
    },
    {
      include: context.asbestosPositive,
      code: 'asbestos_positive',
      severity: 'warning',
      message: 'Le diagnostic amiante est positif.',
    },
    {
      include: context.leadPositive,
      code: 'lead_positive',
      severity: 'warning',
      message: 'Le diagnostic plomb est positif.',
    },
    {
      include: context.termitesPositive,
      code: 'termites_positive',
      severity: 'warning',
      message: 'Le diagnostic termites est positif.',
    },
    {
      include: context.erpUnknown,
      code: 'erp_unknown',
      severity: 'warning',
      message: 'L’état des risques et pollutions est inconnu.',
    },
    // Vigilance — condominium.
    {
      include: context.condoOngoingProcedures,
      code: 'condo_ongoing_procedures',
      severity: 'warning',
      message: 'Une procédure de copropriété est en cours.',
    },
    {
      include: context.condoVotedWorks,
      code: 'condo_voted_works',
      severity: 'warning',
      message: 'Des travaux ont été votés en copropriété.',
    },
    {
      include: context.condoUnpaidCharges,
      code: 'condo_unpaid_charges',
      severity: 'warning',
      message: 'Des impayés de charges sont connus.',
    },
    {
      include: context.condoMissingAnnualCharges,
      code: 'condo_missing_annual_charges',
      severity: 'warning',
      message: 'Les charges annuelles ne sont pas renseignées sur ce bien en copropriété.',
    },
    // Informative.
    {
      include: context.diagnosticsInProgress,
      code: 'diagnostics_in_progress',
      severity: 'info',
      message: 'Certains diagnostics sont en cours de réalisation.',
    },
    {
      include: context.condoIncomplete,
      code: 'condo_incomplete',
      severity: 'info',
      message: 'Les données de copropriété sont incomplètes.',
    },
    {
      include: context.diagnosticsValidityNear,
      code: 'diagnostics_validity_near',
      severity: 'info',
      message: 'La date de validité des diagnostics approche.',
    },
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
