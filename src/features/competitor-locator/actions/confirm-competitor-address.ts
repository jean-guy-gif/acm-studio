'use server';

import { revalidatePath } from 'next/cache';

import {
  advisorAddressPatch,
  type AdvisorAddressInput,
} from '@/features/competitor-locator/services/advisor-address';
import {
  findCard,
  getProspectingCards,
} from '@/features/prospecting/queries/prospecting-card-store';
import { listingIdentityKey } from '@/features/comparable-import/utils/extract-listing-key';
import { getOppositions } from '@/features/prospecting/queries/get-oppositions';
import { OPPOSED_MESSAGE, opposedOn } from '@/features/prospecting/services/opposition';
import { recognizedTypedAddress } from '@/features/competitor-locator/services/recognized-typed-address';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

export type ConfirmCompetitorAddressResult = { ok: true } | { ok: false; error: string };

const FAILURE = 'L’adresse n’a pas été enregistrée. Réessayez.';

// Mission 84 — le conseiller confirme l'adresse d'un concurrent retenu : celle que le
// Localisateur propose (« C'est la bonne adresse ») ou celle qu'il saisit. Le mode et le texte
// viennent du navigateur : revalidés ici ; l'adresse proposée est relue en base, jamais reçue.
// L'écriture est cadrée sur l'agence de l'appelant.
// Mission 98 — une carte de Prospection, c'est UN bien : l'adresse confirmée ou corrigée vaut
// pour toutes les copies de ce bien (le même concurrent retenu dans plusieurs mandats signés).
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
    .select('locator_address, locator_confirmed, locator_source, listing_url')
    .eq('id', competitorId)
    .eq('project_id', projectId)
    .eq('agency_id', profile.agency_id)
    .eq('is_selected', true)
    .maybeSingle();
  if (!row) {
    return { ok: false, error: FAILURE };
  }

  // Mission 102 — l'adresse d'un bien « Ne plus solliciter » ne se confirme ni ne se corrige :
  // une autre écriture changerait sa clé et le ferait revenir dans les courriers. Le refus porte
  // sur le BIEN — ce concurrent (son adresse, son annonce) ou n'importe quelle copie de sa carte.
  const card = findCard(await getProspectingCards(), projectId, competitorId);
  const oppositions = await getOppositions(supabase, profile.agency_id);
  const opposed =
    card?.row.opposedOn != null ||
    opposedOn(
      { address: row.locator_address, listingKey: listingIdentityKey(row.listing_url) },
      oppositions,
    ) != null;
  if (opposed) {
    return { ok: false, error: `${OPPOSED_MESSAGE}.` };
  }

  // Mission 108 — une adresse saisie exige une commune reconnue, comme une opposition à la main :
  // sa clé est celle des oppositions (`addressKey` sur « rue, commune »).
  if (input.mode === 'typed') {
    const typed = await recognizedTypedAddress(input.address);
    if (!typed.ok) {
      return typed;
    }
    input = { mode: 'typed', address: typed.address };
  }

  const result = advisorAddressPatch(row, input);
  if (!result.ok) {
    return result;
  }
  const ids = card ? card.copies.map((copy) => copy.row.id) : [competitorId];
  const { data, error } = await supabase
    .from('comparables')
    .update(result.patch)
    .in('id', ids)
    .eq('agency_id', profile.agency_id)
    .eq('is_selected', true)
    .select('id');
  if (error || !data || !data.some((updated) => updated.id === competitorId)) {
    return { ok: false, error: FAILURE };
  }

  revalidatePath(`/builder/${projectId}`);
  revalidatePath(`/builder/${projectId}/comparables`);
  for (const seller of card?.sellers ?? []) {
    revalidatePath(`/builder/${seller.projectId}`);
  }
  revalidatePath('/prospection/tournee');
  revalidatePath('/prospection/courriers');
  revalidatePath('/prospection');
  revalidatePath('/suivi');
  revalidatePath('/aujourdhui');
  return { ok: true };
}
