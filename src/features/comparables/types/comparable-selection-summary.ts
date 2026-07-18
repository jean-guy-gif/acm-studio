// Deterministic summary of the RETAINED comparables (is_selected = true).
// This structure is produced by a reusable service and will be reused later in
// the Live module — it must never depend on React or on the database client.

export type ComparableSelectionWarningType =
  | 'too_few_comparables'
  | 'too_many_comparables'
  | 'high_price_dispersion'
  | 'incomplete_comparable';

export type ComparableSelectionWarning = {
  type: ComparableSelectionWarningType;
  message: string;
  // Set only for per-comparable warnings (incomplete_comparable).
  comparableId?: string;
};

export type ComparableSelectionSummary = {
  selectedCount: number;

  averagePrice: number | null;
  medianPrice: number | null;

  averagePricePerSquareMeter: number | null;
  medianPricePerSquareMeter: number | null;

  averageSurfaceArea: number | null;

  minimumPrice: number | null;
  maximumPrice: number | null;

  warnings: ComparableSelectionWarning[];
};
