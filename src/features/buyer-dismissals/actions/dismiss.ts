'use server';

import { revalidatePath } from 'next/cache';

import { isDismissReason } from '@/features/buyer-messages/report';
import {
  dismissalKey,
  type DismissTarget,
} from '@/features/buyer-dismissals/services/dismissal-key';
import { reportServerError } from '@/lib/app-errors/report-server-error';
import { getProfile } from '@/lib/auth/get-profile';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

// Mission 139 — « Écarter pour lui », sur les biens idéaux et « Nouveau cette semaine » : le bien
// sort de ses propositions et ne revient plus, veille comprise (une fois par fiche et par bien,
// `buyer_dismissals`). Tout est relu ici : la fiche de l'agence, non archivée ; la clé du bien
// recalculée au serveur (un dossier ou un concurrent de l'agence, une annonce par son identité) ; la
// raison dans la liste ; le libellé neutre borné. « Annuler » ne vaut que juste après le geste.

export type DismissResult = { ok: true; key: string } | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UNDO_WINDOW_MS = 15 * 60_000;

type Admin = ReturnType<typeof createServiceRoleClient>;

async function activeBuyer(admin: Admin, agencyId: string, buyerId: unknown) {
  if (typeof buyerId !== 'string' || !UUID.test(buyerId)) return null;
  const { data } = await admin
    .from('buyers')
    .select('id')
    .eq('id', buyerId)
    .eq('agency_id', agencyId)
    .is('archived_at', null)
    .maybeSingle();
  return data;
}

// La cible relue au serveur : jamais une clé reçue du navigateur.
async function serverTarget(
  admin: Admin,
  agencyId: string,
  raw: unknown,
): Promise<DismissTarget | null> {
  const value = (raw ?? {}) as { source?: unknown; reference?: unknown };
  if (typeof value.reference !== 'string') return null;
  if (value.source === 'listing') {
    return /^https:\/\//i.test(value.reference) && value.reference.length <= 2000
      ? { source: 'listing', url: value.reference }
      : null;
  }
  if (!UUID.test(value.reference)) return null;
  if (value.source === 'project') {
    const { data } = await admin
      .from('projects')
      .select('id')
      .eq('id', value.reference)
      .eq('agency_id', agencyId)
      .maybeSingle();
    return data ? { source: 'project', projectId: data.id } : null;
  }
  if (value.source === 'competitor') {
    const { data } = await admin
      .from('comparables')
      .select('id, listing_url')
      .eq('id', value.reference)
      .eq('agency_id', agencyId)
      .maybeSingle();
    return data
      ? { source: 'competitor', competitorId: data.id, listingUrl: data.listing_url }
      : null;
  }
  return null;
}

export async function dismissForBuyer(
  buyerId: unknown,
  target: unknown,
  rawLabel: unknown,
  reason: unknown,
): Promise<DismissResult> {
  const profile = await getProfile();
  if (!profile || profile.removed_at) return { ok: false, error: 'Vous devez être connecté.' };
  if (!isDismissReason(reason)) return { ok: false, error: 'Choisissez la raison.' };
  const label = typeof rawLabel === 'string' ? rawLabel.trim().slice(0, 200) : '';
  if (!label) return { ok: false, error: 'Bien introuvable.' };
  const admin = createServiceRoleClient();
  const buyer = await activeBuyer(admin, profile.agency_id, buyerId);
  if (!buyer) return { ok: false, error: 'Fiche introuvable.' };
  const resolved = await serverTarget(admin, profile.agency_id, target);
  if (!resolved) return { ok: false, error: 'Bien introuvable.' };
  const key = dismissalKey(resolved);
  const { error } = await admin.from('buyer_dismissals').insert({
    agency_id: profile.agency_id,
    buyer_id: buyer.id,
    property_key: key,
    label,
    reason,
    dismissed_by: profile.id,
  });
  // Déjà écarté (un second clic, un collègue) : c'est ce qui était demandé.
  if (error && error.code !== '23505') {
    await reportServerError('dismissForBuyer', error);
    return { ok: false, error: 'Le bien n’a pas pu être écarté. Réessayez.' };
  }
  revalidatePath(`/acquereurs/${buyer.id}/biens-ideaux`);
  revalidatePath('/suivi');
  return { ok: true, key };
}

// « Annuler », juste après le geste : seulement ce que le conseiller vient d'écarter lui-même.
export async function undoDismissal(buyerId: unknown, key: unknown): Promise<DismissResult> {
  const profile = await getProfile();
  if (!profile || profile.removed_at) return { ok: false, error: 'Vous devez être connecté.' };
  if (typeof key !== 'string' || key.length < 3 || key.length > 2100) {
    return { ok: false, error: 'Bien introuvable.' };
  }
  const admin = createServiceRoleClient();
  const buyer = await activeBuyer(admin, profile.agency_id, buyerId);
  if (!buyer) return { ok: false, error: 'Fiche introuvable.' };
  const { data, error } = await admin
    .from('buyer_dismissals')
    .delete()
    .eq('agency_id', profile.agency_id)
    .eq('buyer_id', buyer.id)
    .eq('property_key', key)
    .eq('dismissed_by', profile.id)
    .gte('dismissed_at', new Date(Date.now() - UNDO_WINDOW_MS).toISOString())
    .select('id');
  if (error || !data || data.length === 0) {
    return { ok: false, error: 'Il est trop tard pour annuler.' };
  }
  revalidatePath(`/acquereurs/${buyer.id}/biens-ideaux`);
  revalidatePath('/suivi');
  return { ok: true, key };
}
