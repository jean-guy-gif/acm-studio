'use server';

import { loadSearchCriteria } from '@/features/competitor-search/queries/load-search-criteria';
import {
  parseKeptResult,
  type KeptResult,
} from '@/features/competitor-search/services/kept-result';
import { searchFingerprint } from '@/features/competitor-search/services/paid-search-guard';
import { reportServerError } from '@/lib/app-errors/report-server-error';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

// Mission 105 — le dernier résultat payé, sur le dossier (`stream_estate_results`, une ligne par
// dossier, cloisonnée par agence). L'empreinte est TOUJOURS calculée ici, depuis la base : un
// résultat dont le bien, la fourchette ou les réglages ont changé est jeté, jamais rendu.

async function currentFingerprint(projectId: string) {
  const profile = await getProfile();
  if (!profile || profile.removed_at) return null;
  const loaded = await loadSearchCriteria(projectId);
  if (!loaded.ok) return null;
  return {
    profile,
    fingerprint: searchFingerprint(loaded.criteria, loaded.address, loaded.settings),
  };
}

export async function keepStreamEstateResult(
  projectId: string,
  raw: unknown,
): Promise<{ ok: boolean }> {
  const current = await currentFingerprint(projectId);
  const kept = parseKeptResult(raw);
  if (!current || !kept) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.from('stream_estate_results').upsert(
    {
      agency_id: current.profile.agency_id,
      project_id: projectId,
      saved_by: current.profile.id,
      fingerprint: current.fingerprint,
      result: kept as never,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'project_id' },
  );
  if (error) {
    await reportServerError('keepStreamEstateResult', error);
    return { ok: false };
  }
  return { ok: true };
}

export async function recallStreamEstateResult(projectId: string): Promise<KeptResult | null> {
  const current = await currentFingerprint(projectId);
  if (!current) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from('stream_estate_results')
    .select('fingerprint, result')
    .eq('project_id', projectId)
    .eq('agency_id', current.profile.agency_id)
    .maybeSingle();
  if (!data) return null;
  const kept = parseKeptResult(data.result);
  if (data.fingerprint !== current.fingerprint || !kept) {
    // Le bien, la fourchette ou les réglages ont changé : un résultat périmé ne s'affiche jamais.
    await forgetStreamEstateResult(projectId);
    return null;
  }
  return kept;
}

export async function forgetStreamEstateResult(projectId: string): Promise<void> {
  const profile = await getProfile();
  if (!profile || profile.removed_at) return;
  const supabase = await createClient();
  await supabase
    .from('stream_estate_results')
    .delete()
    .eq('project_id', projectId)
    .eq('agency_id', profile.agency_id);
}
