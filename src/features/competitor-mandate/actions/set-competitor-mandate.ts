'use server';

import { revalidatePath } from 'next/cache';

import {
  advisorCorrection,
  type MandateField,
} from '@/features/competitor-mandate/services/mandate-columns';
import { withoutField } from '@/features/imported-fields/services/fields-to-verify';
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
  // Mission 101 — indiquer le vendeur ou l'exclusivité, c'est l'avoir vérifié : la pastille
  // « À vérifier » de ce champ (posée par une création depuis la recherche) part avec la réponse.
  const { data: current } = await supabase
    .from('comparables')
    .select('fields_to_verify')
    .eq('id', competitorId)
    .eq('project_id', projectId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  const stillToVerify = current?.fields_to_verify?.includes(field)
    ? { fields_to_verify: withoutField(current.fields_to_verify, field) }
    : {};
  const { data, error } = await supabase
    .from('comparables')
    .update({ ...patch, ...stillToVerify })
    .eq('id', competitorId)
    .eq('project_id', projectId)
    .eq('agency_id', profile.agency_id)
    .select('id');
  if (error || !data || data.length === 0) {
    return { ok: false, error: FAILURE };
  }

  revalidatePath(`/builder/${projectId}/comparables`);
  revalidatePath(`/builder/${projectId}`);
  revalidatePath('/prospection/tournee');
  revalidatePath('/prospection');
  return { ok: true };
}
