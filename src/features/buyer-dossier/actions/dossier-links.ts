'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { loadBuyerDossier } from '@/features/buyer-dossier/queries/load-buyer-dossier';
import {
  dossierPath,
  hashDossierToken,
  newDossierToken,
} from '@/features/buyer-dossier/services/dossier-token';
import { getProfile } from '@/lib/auth/get-profile';
import { siteUrl } from '@/lib/site-url';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export type CreateDossierLinkResult =
  { ok: true; url: string; linkId: string; expiresAt: string } | { ok: false; error: string };
export type PlainResult = { ok: true } | { ok: false; error: string };

const FAILURE = 'Le lien n’a pas pu être créé. Réessayez.';

// Mission 119 (partie B) — « Créer un lien pour l'acquéreur » : valable 30 jours, jamais indexé,
// retirable ; un membre non retiré de l'agence, sur une fiche de son agence qui a une sélection.
// Le jeton n'est montré qu'ici, une fois ; la base n'en garde que le condensat.
export async function createDossierLink(buyerId: string): Promise<CreateDossierLinkResult> {
  const profile = await getProfile();
  if (!profile || profile.removed_at || !z.uuid().safeParse(buyerId).success) {
    return { ok: false, error: FAILURE };
  }
  const dossier = await loadBuyerDossier(
    await createClient(),
    buyerId,
    profile.agency_id,
    null,
    profile.id,
  );
  if (!dossier) return { ok: false, error: 'Pas de dossier sans sélection retenue.' };
  const token = newDossierToken();
  const { data, error } = await createServiceRoleClient()
    .from('buyer_dossier_links')
    .insert({
      agency_id: profile.agency_id,
      buyer_id: buyerId,
      selection_id: dossier.selectionId,
      created_by: profile.id,
      token_hash: hashDossierToken(token),
    })
    .select('id, expires_at')
    .single();
  if (error || !data) return { ok: false, error: FAILURE };
  revalidatePath(`/acquereurs/${buyerId}/dossier`);
  return {
    ok: true,
    url: `${siteUrl()}${dossierPath(token)}`,
    linkId: data.id,
    expiresAt: data.expires_at,
  };
}

// « Retirer le lien » : inutilisable tout de suite (la ligne est supprimée).
export async function removeDossierLink(buyerId: string, linkId: string): Promise<PlainResult> {
  const profile = await getProfile();
  if (
    !profile ||
    profile.removed_at ||
    !z.uuid().safeParse(buyerId).success ||
    !z.uuid().safeParse(linkId).success
  ) {
    return { ok: false, error: 'Le lien n’a pas pu être retiré.' };
  }
  const { data, error } = await createServiceRoleClient()
    .from('buyer_dossier_links')
    .delete()
    .eq('id', linkId)
    .eq('buyer_id', buyerId)
    .eq('agency_id', profile.agency_id)
    .select('id');
  if (error || !data || data.length === 0)
    return { ok: false, error: 'Le lien n’a pas pu être retiré.' };
  revalidatePath(`/acquereurs/${buyerId}/dossier`);
  return { ok: true };
}

// « Sans photo » par bien : la photo quitte le document ET le lien ; le choix est gardé en base.
export async function setDossierPhoto(
  buyerId: string,
  itemId: string,
  hidden: unknown,
): Promise<PlainResult> {
  const profile = await getProfile();
  if (
    !profile ||
    profile.removed_at ||
    typeof hidden !== 'boolean' ||
    !z.uuid().safeParse(buyerId).success ||
    !z.uuid().safeParse(itemId).success
  ) {
    return { ok: false, error: 'Le choix n’a pas pu être enregistré.' };
  }
  const client = createServiceRoleClient();
  const { data: item } = await client
    .from('buyer_selection_items')
    .select('id, buyer_selections!inner(buyer_id)')
    .eq('id', itemId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  const owner = (item?.buyer_selections as unknown as { buyer_id: string } | null)?.buyer_id;
  if (!item || owner !== buyerId)
    return { ok: false, error: 'Le choix n’a pas pu être enregistré.' };
  const { error } = await client
    .from('buyer_selection_items')
    .update({ dossier_hide_photo: hidden })
    .eq('id', itemId)
    .eq('agency_id', profile.agency_id);
  if (error) return { ok: false, error: 'Le choix n’a pas pu être enregistré.' };
  revalidatePath(`/acquereurs/${buyerId}/dossier`);
  return { ok: true };
}
