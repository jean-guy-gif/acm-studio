import type {
  ConfidenceLevel,
  DispersionLevel,
} from '@/features/price-positioning/types/price-positioning';
import type {
  PositioningSnapshot,
  SavedPricePositioning,
} from '@/features/price-positioning/types/saved-price-positioning';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

const CONFIDENCE_LEVELS: ConfidenceLevel[] = ['very_high', 'high', 'medium', 'low'];
const DISPERSIONS: DispersionLevel[] = ['low', 'medium', 'high'];

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

// Narrows the stored jsonb into a typed snapshot, tolerating older shapes.
function parseSnapshot(raw: unknown): PositioningSnapshot {
  const source = (raw ?? {}) as Record<string, unknown>;
  const dispersion = DISPERSIONS.includes(source.dispersion as DispersionLevel)
    ? (source.dispersion as DispersionLevel)
    : 'low';
  const confidenceLevel = CONFIDENCE_LEVELS.includes(source.confidenceLevel as ConfidenceLevel)
    ? (source.confidenceLevel as ConfidenceLevel)
    : 'low';
  const width = source.widthPercentage === 6 ? 6 : source.widthPercentage === 10 ? 10 : 3;
  return {
    engineVersion: typeof source.engineVersion === 'number' ? source.engineVersion : 0,
    totalEligible: Number(source.totalEligible) || 0,
    usedCount: Number(source.usedCount) || 0,
    outlierCount: Number(source.outlierCount) || 0,
    excludedOutlierCount: Number(source.excludedOutlierCount) || 0,
    outliersReintroduced: source.outliersReintroduced === true,
    dispersion,
    widthPercentage: width,
    confidenceScore: Number(source.confidenceScore) || 0,
    confidenceLevel,
    influentialComparableIds: asStringArray(source.influentialComparableIds),
    reasons: asStringArray(source.reasons),
  };
}

// Returns the saved positioning for a project (scoped to the caller's agency), or
// null. Includes a minimal author identity, never extra profile data.
export async function getSavedPricePositioning(
  projectId: string,
): Promise<SavedPricePositioning | null> {
  const profile = await getProfile();
  if (!profile) {
    return null;
  }

  const supabase = await createClient();

  const { data } = await supabase
    .from('project_price_positionings')
    .select('*')
    .eq('project_id', projectId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();

  if (!data) {
    return null;
  }

  let validatedByName: string | null = null;
  const { data: author } = await supabase
    .from('profiles')
    .select('first_name, last_name')
    .eq('id', data.validated_by)
    .maybeSingle();
  if (author) {
    validatedByName = `${author.first_name} ${author.last_name}`.trim() || null;
  }

  return {
    id: data.id,
    projectId: data.project_id,
    advisorPrice: data.advisor_price,
    sellerPrice: data.seller_price,
    rangeLow: data.range_low,
    rangeCentral: data.range_central,
    rangeHigh: data.range_high,
    confidenceScore: data.confidence_score,
    confidenceLevel: CONFIDENCE_LEVELS.includes(data.confidence_level as ConfidenceLevel)
      ? (data.confidence_level as ConfidenceLevel)
      : 'low',
    justification: data.justification,
    snapshot: parseSnapshot(data.calculation_snapshot),
    validatedAt: data.validated_at,
    validatedBy: data.validated_by,
    validatedByName,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}
