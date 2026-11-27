'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { buildBuyerProspectRow } from '@/features/buyer-prospecting/services/buyer-prospect-row';
import type { BuyerProspectRecord } from '@/features/buyer-prospecting/types';
import {
  advisorAddressPatch,
  type AdvisorAddressInput,
} from '@/features/competitor-locator/services/advisor-address';
import { recognizedTypedAddress } from '@/features/competitor-locator/services/recognized-typed-address';
import { advisorCorrection } from '@/features/competitor-mandate/services/mandate-columns';
import { getOppositions } from '@/features/prospecting/queries/get-oppositions';
import { insertOppositions } from '@/features/prospecting/queries/insert-oppositions';
import { addressKey } from '@/features/prospecting/services/address-key';
import { OPPOSED_MESSAGE } from '@/features/prospecting/services/opposition';
import {
  applyProspectingMove,
  isProspectingMove,
} from '@/features/prospecting/services/prospecting-status';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export type BuyerProspectResult = { ok: true } | { ok: false; error: string };

const NOT_FOUND = 'Bien introuvable pour votre agence.';

function revalidate() {
  revalidatePath('/prospection');
  revalidatePath('/visites');
  revalidatePath('/acquereurs', 'layout');
}

// Le bien démarché de l'agence de l'appelant, relu en base, avec sa ligne (statut, opposition).
async function load(prospectId: unknown) {
  const profile = await getProfile();
  if (!profile || profile.removed_at || !z.uuid().safeParse(prospectId).success) {
    return null;
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from('buyer_prospects')
    .select('*')
    .eq('id', prospectId as string)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  if (!data) {
    return null;
  }
  const prospect = data as BuyerProspectRecord;
  const oppositions = await getOppositions(supabase, profile.agency_id);
  return { profile, supabase, prospect, row: buildBuyerProspectRow(prospect, oppositions) };
}

// Mission 120 — faire avancer (ou reculer d'un cran) la prospection d'un bien démarché depuis une
// recherche acquéreur : les mêmes faits datés, la même règle qu'un concurrent (M86, M98, M115).
// Le geste vient du navigateur : confronté au statut COURANT relu en base. Une adresse « Ne plus
// solliciter » ne bouge plus.
export async function setBuyerProspectStatus(
  prospectId: unknown,
  move: unknown,
): Promise<BuyerProspectResult> {
  if (!isProspectingMove(move)) {
    return { ok: false, error: 'Le statut n’a pas été enregistré. Réessayez.' };
  }
  const loaded = await load(prospectId);
  if (!loaded) {
    return { ok: false, error: NOT_FOUND };
  }
  const { profile, prospect, row } = loaded;
  if (row.opposedOn != null) {
    return { ok: false, error: `${OPPOSED_MESSAGE}.` };
  }
  const result = applyProspectingMove(
    row.status,
    move,
    new Date().toISOString(),
    row.step,
    row.collaborationDeclinedAt != null,
  );
  if (!result.ok) {
    return result;
  }
  const { data, error } = await createServiceRoleClient()
    .from('buyer_prospects')
    .update({ ...result.patch, updated_at: new Date().toISOString() })
    .eq('id', prospect.id)
    .eq('agency_id', profile.agency_id)
    .select('id');
  if (error || !data || data.length !== 1) {
    return { ok: false, error: 'Le statut n’a pas été enregistré. Réessayez.' };
  }
  revalidate();
  return { ok: true };
}

// Mission 120 — le conseiller confirme l'adresse d'un bien démarché : celle que le Localisateur
// propose, ou celle qu'il saisit, avec une commune reconnue (M84, M103, M108). L'adresse proposée
// est relue en base, jamais reçue ; un bien « Ne plus solliciter » ne se confirme ni ne se corrige.
export async function confirmBuyerProspectAddress(
  prospectId: unknown,
  raw: unknown,
): Promise<BuyerProspectResult> {
  const candidate = raw as { mode?: unknown; address?: unknown } | null;
  let input: AdvisorAddressInput;
  if (candidate?.mode === 'accept') {
    input = { mode: 'accept' };
  } else if (candidate?.mode === 'typed') {
    input = { mode: 'typed', address: candidate.address };
  } else {
    return { ok: false, error: 'L’adresse n’a pas été enregistrée. Réessayez.' };
  }
  const loaded = await load(prospectId);
  if (!loaded) {
    return { ok: false, error: NOT_FOUND };
  }
  const { profile, prospect, row } = loaded;
  if (row.opposedOn != null) {
    return { ok: false, error: `${OPPOSED_MESSAGE}.` };
  }
  if (input.mode === 'typed') {
    const typed = await recognizedTypedAddress(input.address);
    if (!typed.ok) {
      return typed;
    }
    input = { mode: 'typed', address: typed.address };
  }
  const result = advisorAddressPatch(prospect, input);
  if (!result.ok) {
    return result;
  }
  const { data, error } = await createServiceRoleClient()
    .from('buyer_prospects')
    .update({ ...result.patch, updated_at: new Date().toISOString() })
    .eq('id', prospect.id)
    .eq('agency_id', profile.agency_id)
    .select('id');
  if (error || !data || data.length !== 1) {
    return { ok: false, error: 'L’adresse n’a pas été enregistrée. Réessayez.' };
  }
  revalidate();
  return { ok: true };
}

// Mission 120 (décision du 28/10) — « Vendu par » et « Exclusivité » d'une carte acquéreur se
// posent d'un clic, comme sur un concurrent (M83) : le champ et la valeur sont relus sur une
// liste, la provenance « conseiller » est gardée, pour qu'un concurrent la reprenne (fusion).
export async function setBuyerProspectMandate(
  prospectId: unknown,
  field: unknown,
  value: unknown,
): Promise<BuyerProspectResult> {
  const failure = { ok: false as const, error: 'La correction n’a pas été enregistrée.' };
  if (field !== 'sold_by' && field !== 'exclusivity') {
    return failure;
  }
  if (value !== null && typeof value !== 'string') {
    return failure;
  }
  const patch = advisorCorrection(field, value);
  if (!patch) {
    return failure;
  }
  const loaded = await load(prospectId);
  if (!loaded) {
    return { ok: false, error: NOT_FOUND };
  }
  const { data, error } = await createServiceRoleClient()
    .from('buyer_prospects')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', loaded.prospect.id)
    .eq('agency_id', loaded.profile.agency_id)
    .select('id');
  if (error || !data || data.length !== 1) {
    return failure;
  }
  revalidate();
  return { ok: true };
}

// Mission 120 — « Ne plus solliciter » sur une carte acquéreur : l'adresse confirmée et l'annonce
// entrent dans la liste d'opposition de l'agence (M98, M102, M107), comme pour un concurrent. Rien
// n'est reçu du navigateur que l'identifiant de la carte.
export async function addBuyerProspectOpposition(
  prospectId: unknown,
): Promise<BuyerProspectResult> {
  const loaded = await load(prospectId);
  if (!loaded) {
    return { ok: false, error: NOT_FOUND };
  }
  const { profile, supabase, row } = loaded;
  const addressKeys = row.confirmed ? [addressKey(row.address)].flatMap((key) => key ?? []) : [];
  const inserted = await insertOppositions(
    supabase,
    { agencyId: profile.agency_id, profileId: profile.id },
    { addressKey: null, addressKeys, listingKeys: row.listingKey ? [row.listingKey] : [] },
  );
  if (!inserted) {
    return {
      ok: false,
      error:
        'L’inscription n’a pas été confirmée\u00a0: l’adresse n’est pas sur la liste «\u00a0Ne plus solliciter\u00a0». Réessayez.',
    };
  }
  revalidate();
  return { ok: true };
}
