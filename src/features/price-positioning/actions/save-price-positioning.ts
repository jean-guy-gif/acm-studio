'use server';

import { revalidatePath } from 'next/cache';

import { getComparables } from '@/features/comparables/queries/get-comparables';
import { parseDecisionInput } from '@/features/price-positioning/actions/parse-decision-input';
import { buildPositioningSnapshot } from '@/features/price-positioning/services/build-positioning-snapshot';
import { calculatePricePositioning } from '@/features/price-positioning/services/calculate-price-positioning';
import { getSubjectProperty } from '@/features/subject-property/queries/get-subject-property';
import { getProfile } from '@/lib/auth/get-profile';
import type { Database } from '@/lib/supabase/database.types';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export type SavePositioningResult = { ok: true } | { ok: false; error: string };

type PositioningInsert = Database['public']['Tables']['project_price_positionings']['Insert'];

// The client may only send advisorPrice, sellerPrice and justification. Every
// other persisted value (agency_id, range, confidence, snapshot, validated_by,
// validated_at, updated_at) is imposed by the server. Authentication and agency /
// project authorisation run with the USER client (RLS); only the final UPSERT
// uses the server-only service-role client, after those checks.
export async function savePricePositioning(
  projectId: string,
  formData: FormData,
): Promise<SavePositioningResult> {
  const profile = await getProfile();
  if (!profile) {
    return { ok: false, error: 'Vous devez être connecté.' };
  }

  // Only these three fields are ever read from the browser.
  const parsed = parseDecisionInput(formData);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }
  const { advisorPrice, sellerPrice, justification } = parsed.input;

  // Authorisation: the project must belong to the caller's agency (RLS-scoped).
  const userClient = await createClient();
  const { data: project } = await userClient
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  if (!project) {
    return { ok: false, error: 'Projet introuvable pour votre agence.' };
  }

  // Recompute everything server-side from the current project data.
  const [comparables, subjectProperty] = await Promise.all([
    getComparables(projectId),
    getSubjectProperty(projectId),
  ]);
  const positioning = calculatePricePositioning({
    comparables,
    sellerProperty: { surfaceArea: subjectProperty?.surface_area ?? null },
    advisorPrice,
    sellerPrice,
  });
  const snapshot = buildPositioningSnapshot(positioning);
  if (positioning.status !== 'ready' || positioning.recommendedRange == null || snapshot == null) {
    return {
      ok: false,
      error: 'Le positionnement ne peut pas être enregistré : données insuffisantes.',
    };
  }

  const now = new Date().toISOString();
  const row: PositioningInsert = {
    project_id: projectId,
    agency_id: profile.agency_id, // server-imposed
    advisor_price: advisorPrice,
    seller_price: sellerPrice,
    range_low: positioning.recommendedRange.low, // server-imposed
    range_central: positioning.recommendedRange.central, // server-imposed
    range_high: positioning.recommendedRange.high, // server-imposed
    confidence_score: positioning.confidence.score, // server-imposed
    confidence_level: positioning.confidence.level, // server-imposed
    justification,
    calculation_snapshot: snapshot as unknown as PositioningInsert['calculation_snapshot'],
    validated_by: profile.id, // server-imposed
    validated_at: now, // server-imposed
    updated_at: now, // server-imposed
  };

  // Atomic UPSERT on project_id via the server-only service role client (bypasses
  // RLS only after the checks above). UNIQUE(project_id) + ON CONFLICT guarantee a
  // single row even under concurrent saves.
  const serviceClient = createServiceRoleClient();
  const { error } = await serviceClient
    .from('project_price_positionings')
    .upsert(row, { onConflict: 'project_id' });
  if (error) {
    return { ok: false, error: 'L’enregistrement a échoué. Vérifiez les données et réessayez.' };
  }

  revalidatePath(`/builder/${projectId}/comparables/positioning`);
  return { ok: true };
}
