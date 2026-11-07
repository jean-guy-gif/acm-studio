'use server';

import { revalidatePath } from 'next/cache';

import {
  parseBuyerInput,
  parseQuickBuyerInput,
  readBuyerFormData,
} from '@/features/buyers/schemas/buyer-input';
import { buyerColumns, toBuyer } from '@/features/buyers/services/buyer-row';
import { isBuyerStatusMove, nextBuyerStatus } from '@/features/buyers/services/buyer-status';
import { BUYER_FINANCINGS, type Buyer, type BuyerFinancing } from '@/features/buyers/types';
import type { BuyerFormErrors } from '@/features/buyers/schemas/buyer-input';
import { getProfile } from '@/lib/auth/get-profile';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export type SaveBuyerResult =
  { ok: true; buyerId: string } | { ok: false; error: string; errors?: BuyerFormErrors };
export type BuyerActionResult = { ok: true; buyer: Buyer } | { ok: false; error: string };

const NOT_CONNECTED = 'Vous devez être connecté.';
const NOT_FOUND = 'Cette fiche acquéreur n’existe plus.';
const NOT_SAVED = 'La fiche n’a pas pu être enregistrée. Réessayez.';

// Mission 117 — le serveur seul écrit `buyers` (le navigateur n'a que la lecture) : chaque action
// relit le profil, exige un membre non retiré, et n'écrit que dans son agence.
async function activeProfile() {
  const profile = await getProfile();
  return profile && !profile.removed_at ? profile : null;
}

function revalidateBuyers(buyerId?: string): void {
  revalidatePath('/acquereurs');
  if (buyerId) revalidatePath(`/acquereurs/${buyerId}`);
}

async function ownBuyer(
  client: ReturnType<typeof createServiceRoleClient>,
  buyerId: string,
  agencyId: string,
) {
  const { data, error } = await client
    .from('buyers')
    .select('*')
    .eq('id', buyerId)
    .eq('agency_id', agencyId)
    .is('archived_at', null)
    .maybeSingle();
  return error || !data ? null : data;
}

// Créer ou modifier une fiche : tout est validé avant la première écriture.
export async function saveBuyer(
  buyerId: string | null,
  formData: FormData,
): Promise<SaveBuyerResult> {
  const profile = await activeProfile();
  if (!profile) return { ok: false, error: NOT_CONNECTED };
  const parsed = parseBuyerInput(readBuyerFormData(formData));
  if (!parsed.ok) return { ok: false, error: parsed.error, errors: parsed.errors };

  const client = createServiceRoleClient();
  const now = new Date().toISOString();
  if (buyerId) {
    const existing = await ownBuyer(client, buyerId, profile.agency_id);
    if (!existing) return { ok: false, error: NOT_FOUND };
    const { error } = await client
      .from('buyers')
      .update({ ...buyerColumns(parsed.input), updated_at: now })
      .eq('id', buyerId)
      .eq('agency_id', profile.agency_id);
    if (error) return { ok: false, error: NOT_SAVED };
    revalidateBuyers(buyerId);
    return { ok: true, buyerId };
  }
  const { data, error } = await client
    .from('buyers')
    .insert({
      ...buyerColumns(parsed.input),
      agency_id: profile.agency_id,
      advisor_id: profile.id,
    })
    .select('id')
    .single();
  if (error || !data) return { ok: false, error: NOT_SAVED };
  revalidateBuyers(data.id);
  return { ok: true, buyerId: data.id };
}

// Le statut, un cran à la fois ; chaque changement est daté.
export async function moveBuyerStatus(buyerId: string, move: unknown): Promise<BuyerActionResult> {
  const profile = await activeProfile();
  if (!profile) return { ok: false, error: NOT_CONNECTED };
  if (!isBuyerStatusMove(move)) return { ok: false, error: 'Ce changement n’est pas permis.' };
  const client = createServiceRoleClient();
  const existing = await ownBuyer(client, buyerId, profile.agency_id);
  if (!existing) return { ok: false, error: NOT_FOUND };
  const next = nextBuyerStatus(toBuyer(existing).status, move);
  if (!next) return { ok: false, error: 'Ce changement n’est pas permis depuis ce statut.' };
  const now = new Date().toISOString();
  const { data, error } = await client
    .from('buyers')
    .update({ status: next, status_changed_at: now, updated_at: now })
    .eq('id', buyerId)
    .eq('agency_id', profile.agency_id)
    .select('*')
    .single();
  if (error || !data)
    return { ok: false, error: 'Le statut n’a pas pu être enregistré. Réessayez.' };
  revalidateBuyers(buyerId);
  return { ok: true, buyer: toBuyer(data) };
}

// « Archiver » : suppression douce (M93), invisible partout ; rien n'est effacé.
export async function archiveBuyer(
  buyerId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const profile = await activeProfile();
  if (!profile) return { ok: false, error: NOT_CONNECTED };
  const client = createServiceRoleClient();
  const existing = await ownBuyer(client, buyerId, profile.agency_id);
  if (!existing) return { ok: false, error: NOT_FOUND };
  const now = new Date().toISOString();
  const { error } = await client
    .from('buyers')
    .update({ archived_at: now, updated_at: now })
    .eq('id', buyerId)
    .eq('agency_id', profile.agency_id);
  if (error) return { ok: false, error: 'La fiche n’a pas pu être archivée. Réessayez.' };
  revalidateBuyers(buyerId);
  return { ok: true };
}

// Mission 132 — la saisie rapide : une fiche neuve en un écran (nom, téléphone, type, secteur,
// budget plafond, deux ★ au plus). Création seulement ; le reste se complète par la fiche.
export async function saveQuickBuyer(formData: FormData): Promise<SaveBuyerResult> {
  const profile = await activeProfile();
  if (!profile) return { ok: false, error: NOT_CONNECTED };
  const parsed = parseQuickBuyerInput(readBuyerFormData(formData));
  if (!parsed.ok) return { ok: false, error: parsed.error, errors: parsed.errors };
  const client = createServiceRoleClient();
  const { data, error } = await client
    .from('buyers')
    .insert({
      ...buyerColumns(parsed.input),
      agency_id: profile.agency_id,
      advisor_id: profile.id,
    })
    .select('id')
    .single();
  if (error || !data) return { ok: false, error: NOT_SAVED };
  revalidateBuyers(data.id);
  return { ok: true, buyerId: data.id };
}

// Mission 132 — le financement (validé, en cours, inconnu) : un geste à part, daté ; jamais écrit
// par le formulaire de la fiche (`buyerColumns` ne le porte pas).
export async function setBuyerFinancing(
  buyerId: string,
  financing: unknown,
): Promise<BuyerActionResult> {
  const profile = await activeProfile();
  if (!profile) return { ok: false, error: NOT_CONNECTED };
  if (
    typeof financing !== 'string' ||
    !(BUYER_FINANCINGS as readonly string[]).includes(financing)
  ) {
    return { ok: false, error: 'Ce financement n’existe pas.' };
  }
  const client = createServiceRoleClient();
  const existing = await ownBuyer(client, buyerId, profile.agency_id);
  if (!existing) return { ok: false, error: NOT_FOUND };
  const now = new Date().toISOString();
  const { data, error } = await client
    .from('buyers')
    .update({
      financing: financing as BuyerFinancing,
      financing_changed_at: now,
      updated_at: now,
    })
    .eq('id', buyerId)
    .eq('agency_id', profile.agency_id)
    .select('*')
    .single();
  if (error || !data) return { ok: false, error: 'Le financement n’a pas pu être enregistré.' };
  revalidateBuyers(buyerId);
  return { ok: true, buyer: toBuyer(data) };
}

// Mission 132 — « J'ai eu l'acquéreur aujourd'hui » : le dernier contact, à l'heure du serveur,
// jamais choisi (modèle des relances, M96). Il remet la fiche en tête de la liste (`updated_at`).
export async function markBuyerContacted(buyerId: string): Promise<BuyerActionResult> {
  const profile = await activeProfile();
  if (!profile) return { ok: false, error: NOT_CONNECTED };
  const client = createServiceRoleClient();
  const existing = await ownBuyer(client, buyerId, profile.agency_id);
  if (!existing) return { ok: false, error: NOT_FOUND };
  const now = new Date().toISOString();
  const { data, error } = await client
    .from('buyers')
    .update({ contacted_at: now, updated_at: now })
    .eq('id', buyerId)
    .eq('agency_id', profile.agency_id)
    .select('*')
    .single();
  if (error || !data) return { ok: false, error: 'Le contact n’a pas pu être noté. Réessayez.' };
  revalidateBuyers(buyerId);
  revalidatePath('/suivi');
  revalidatePath('/aujourdhui');
  return { ok: true, buyer: toBuyer(data) };
}
