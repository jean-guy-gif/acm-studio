'use server';

import { revalidatePath } from 'next/cache';

import {
  advisorCorrection,
  type MandateField,
} from '@/features/competitor-mandate/services/mandate-columns';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

export type SetCompetitorMandateResult = { ok: true } | { ok: false; error: string };

const FAILURE = 'La correction n’a pas été enregistrée.';

// Mission 83 — le conseiller corrige « Vendu par » ou « Exclusivité » d'un concurrent, d'un clic.
// Le champ et la valeur viennent du navigateur : revalidés ici, sur une liste. L'écriture est
// cadrée sur l'agence de l'appelant ; elle porte la provenance « conseiller ».
export async function setCompetitorMandate(
  projectId: string,
  competitorId: string,
  field: MandateField,
  value: string | null,
): Promise<SetCompetitorMandateResult> {
  const profile = await getProfile();
  if (!profile) {
    return { ok: false, error: 'Vous devez être connecté.' };
  }
  if (field !== 'sold_by' && field !== 'exclusivity') {
    return { ok: false, error: FAILURE };
  }
  const patch = advisorCorrection(field, value);
  if (!patch) {
    return { ok: false, error: FAILURE };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('comparables')
    .update(patch)
    .eq('id', competitorId)
    .eq('project_id', projectId)
    .eq('agency_id', profile.agency_id)
    .select('id');
  if (error || !data || data.length === 0) {
    return { ok: false, error: FAILURE };
  }

  revalidatePath(`/builder/${projectId}/comparables`);
  revalidatePath(`/builder/${projectId}`);
  revalidatePath(`/builder/${projectId}/prospection`);
  return { ok: true };
}
