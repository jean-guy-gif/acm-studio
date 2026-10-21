'use server';

import { loadSearchCriteria } from '@/features/competitor-search/queries/load-search-criteria';
import {
  parseKeptResult,
  type KeptResult,
} from '@/features/competitor-search/services/kept-result';
import {
  legacySearchFingerprint,
  searchFingerprint,
} from '@/features/competitor-search/services/paid-search-guard';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

// Mission 105 — le dernier résultat payé, sur le dossier (`stream_estate_results`, une ligne par
// dossier, cloisonnée par agence). L'empreinte est TOUJOURS calculée ici, depuis la base : un
// résultat dont le bien, la fourchette ou les réglages ont changé est jeté, jamais rendu.
// Mission 112 — c'est la recherche elle-même qui le garde (`keepPaidSearchResult`), plus l'écran.

async function currentFingerprint(projectId: string) {
  const profile = await getProfile();
  if (!profile || profile.removed_at) return null;
  const loaded = await loadSearchCriteria(projectId);
  if (!loaded.ok) return null;
  return {
    profile,
    fingerprint: searchFingerprint(loaded.criteria, loaded.address, loaded.settings),
    // Mission 112 — l'empreinte d'avant, avec le quartier : ce qui était gardé se rouvre.
    legacy: legacySearchFingerprint(loaded.criteria, loaded.address, loaded.settings),
  };
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
  const matches = data.fingerprint === current.fingerprint || data.fingerprint === current.legacy;
  if (!matches || !kept) {
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
