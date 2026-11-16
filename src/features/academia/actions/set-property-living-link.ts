'use server';

import { revalidatePath } from 'next/cache';

import { livingHereKeys } from '@/features/academia/queries/read-property-living-links';
import { livingHereEverywhereOpen } from '@/features/academia/services/living-here-switch';
import { ACADEMIA_LIVING_HERE_ERROR, academiaLivingHereUrl } from '@/lib/academia';
import { reportServerError } from '@/lib/app-errors/report-server-error';
import { getProfile } from '@/lib/auth/get-profile';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

// Mission 156 — le lien client « Vivre ici » d'Academia d'un bien HORS MANDAT d'une sélection
// acquéreur, collé sur la page du dossier acquéreur (planche A3-1) : un lien par bien, pour toute
// l'agence (`property_living_here_links`, écrite par le serveur seul). Tout est relu ici : le
// conseiller (non retiré), l'interrupteur (éteint en production tant que le texte A3 de
// `/confidentialite` n'est pas en ligne), la fiche de l'agence non archivée, le bien de SA sélection,
// non retiré et hors mandat (le lien d'un mandat se colle sur son bien vendeur, M147 A), la clé du
// bien recalculée ici, et seulement un lien https://app.myacademia.ai/l/… (un lien vide le retire).
// La date du collage est l'heure de la base.

export type SetPropertyLivingLinkResult =
  { ok: true; url: string | null; pastedAt: string | null } | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NOT_FOUND = 'Bien introuvable dans sa sélection.';

export async function setPropertyLivingLink(
  buyerId: unknown,
  itemId: unknown,
  rawUrl: unknown,
): Promise<SetPropertyLivingLinkResult> {
  const profile = await getProfile();
  if (!profile || profile.removed_at) return { ok: false, error: 'Vous devez être connecté.' };
  if (!livingHereEverywhereOpen()) {
    return { ok: false, error: '« Vivre ici » sur un bien hors mandat n’est pas encore ouvert.' };
  }
  if (typeof buyerId !== 'string' || !UUID.test(buyerId)) {
    return { ok: false, error: 'Fiche introuvable.' };
  }
  if (typeof itemId !== 'string' || !UUID.test(itemId)) return { ok: false, error: NOT_FOUND };
  if (rawUrl !== null && typeof rawUrl !== 'string') {
    return { ok: false, error: ACADEMIA_LIVING_HERE_ERROR };
  }
  const empty = rawUrl === null || rawUrl.trim() === '';
  const url = empty ? null : academiaLivingHereUrl(rawUrl);
  if (!empty && !url) return { ok: false, error: ACADEMIA_LIVING_HERE_ERROR };

  const admin = createServiceRoleClient();
  const agencyId = profile.agency_id;
  const { data: buyer } = await admin
    .from('buyers')
    .select('id')
    .eq('id', buyerId)
    .eq('agency_id', agencyId)
    .is('archived_at', null)
    .maybeSingle();
  if (!buyer) return { ok: false, error: 'Fiche introuvable.' };
  const { data: item } = await admin
    .from('buyer_selection_items')
    .select('id, source, reference, removed_at, selection_id')
    .eq('id', itemId)
    .eq('agency_id', agencyId)
    .maybeSingle();
  if (!item || item.removed_at) return { ok: false, error: NOT_FOUND };
  const { data: selection } = await admin
    .from('buyer_selections')
    .select('id')
    .eq('id', item.selection_id)
    .eq('buyer_id', buyer.id)
    .eq('agency_id', agencyId)
    .maybeSingle();
  if (!selection) return { ok: false, error: NOT_FOUND };
  if (item.source === 'project') {
    return { ok: false, error: 'Le lien d’un mandat se colle sur son bien vendeur.' };
  }
  const resolved = await livingHereKeys(admin, agencyId, [item]);
  if (!resolved.ok) return { ok: false, error: 'Le bien n’a pas pu être lu. Réessayez.' };
  const key = resolved.keys.get(item.id);
  if (!key) return { ok: false, error: NOT_FOUND };

  if (url === null) {
    const { error } = await admin
      .from('property_living_here_links')
      .delete()
      .eq('agency_id', agencyId)
      .eq('property_key', key);
    if (error) {
      await reportServerError('academia:set-property-link', error);
      return { ok: false, error: 'Le lien n’a pas pu être retiré. Réessayez.' };
    }
    revalidate(buyer.id);
    return { ok: true, url: null, pastedAt: null };
  }
  const { data: written, error } = await admin
    .from('property_living_here_links')
    .upsert(
      { agency_id: agencyId, property_key: key, url, pasted_by: profile.id },
      { onConflict: 'agency_id,property_key' },
    )
    .select('url, pasted_at')
    .single();
  if (error || !written) {
    if (error) await reportServerError('academia:set-property-link', error);
    return { ok: false, error: 'Le lien n’a pas pu être enregistré. Réessayez.' };
  }
  revalidate(buyer.id);
  return { ok: true, url: written.url, pastedAt: written.pasted_at };
}

function revalidate(buyerId: string) {
  revalidatePath(`/acquereurs/${buyerId}/dossier`);
  revalidatePath(`/acquereurs/${buyerId}`);
  revalidatePath('/acquereurs/visites');
}
