'use server';

import { revalidatePath } from 'next/cache';

import {
  advisorAddressPatch,
  type AdvisorAddressInput,
} from '@/features/competitor-locator/services/advisor-address';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

export type ConfirmCompetitorAddressResult = { ok: true } | { ok: false; error: string };

const FAILURE = 'L’adresse n’a pas été enregistrée. Réessayez.';

// Mission 84 — le conseiller confirme l'adresse d'un concurrent retenu : celle que le
// Localisateur propose (« C'est la bonne adresse ») ou celle qu'il saisit. Le mode et le texte
// viennent du navigateur : revalidés ici ; l'adresse proposée est relue en base, jamais reçue.
// L'écriture est cadrée sur l'agence de l'appelant.
export async function confirmCompetitorAddress(
  projectId: string,
  competitorId: string,
  raw: unknown,
): Promise<ConfirmCompetitorAddressResult> {
  const profile = await getProfile();
  if (!profile || profile.removed_at) {
    return { ok: false, error: 'Vous devez être connecté.' };
  }
  const candidate = raw as { mode?: unknown; address?: unknown } | null;
  let input: AdvisorAddressInput;
  if (candidate?.mode === 'accept') {
    input = { mode: 'accept' };
  } else if (candidate?.mode === 'typed') {
    input = { mode: 'typed', address: candidate.address };
  } else {
    return { ok: false, error: FAILURE };
  }

  const supabase = await createClient();
  const { data: row } = await supabase
    .from('comparables')
    .select('locator_address, locator_confirmed, locator_source')
    .eq('id', competitorId)
    .eq('project_id', projectId)
    .eq('agency_id', profile.agency_id)
    .eq('is_selected', true)
    .maybeSingle();
  if (!row) {
    return { ok: false, error: FAILURE };
  }

  const result = advisorAddressPatch(row, input);
  if (!result.ok) {
    return result;
  }
  const { data, error } = await supabase
    .from('comparables')
    .update(result.patch)
    .eq('id', competitorId)
    .eq('project_id', projectId)
    .eq('agency_id', profile.agency_id)
    .select('id');
  if (error || !data || data.length === 0) {
    return { ok: false, error: FAILURE };
  }

  revalidatePath(`/builder/${projectId}`);
  revalidatePath(`/builder/${projectId}/comparables`);
  revalidatePath(`/builder/${projectId}/prospection`);
  return { ok: true };
}
