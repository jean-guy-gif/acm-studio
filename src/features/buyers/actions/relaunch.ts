'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { createDossierLink } from '@/features/buyer-dossier/actions/dossier-links';
import { presentedItems } from '@/features/buyer-presentation/queries/load-presentation';
import { getRelaunchFacts } from '@/features/buyers/queries/get-relaunch-facts';
import { toBuyer } from '@/features/buyers/services/buyer-row';
import {
  bestBien,
  relaunchDue,
  relaunchMessage,
  RELAUNCH_CONTACT_FAILED,
  RELAUNCH_FAILED,
  RELAUNCH_NOT_DUE,
} from '@/features/buyers/services/link-relaunch';
import type { Buyer } from '@/features/buyers/types';
import { toSelection } from '@/features/ideal-properties/services/ideal-selection';
import { recordAppError } from '@/lib/app-errors/record';
import { getProfile } from '@/lib/auth/get-profile';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export type PrepareRelaunchResult =
  | { ok: true; message: string; phone: string | null; email: string | null }
  | { ok: false; error: string };
export type PlainRelaunchResult = { ok: true } | { ok: false; error: string };

async function activeBuyer(
  buyerId: unknown,
): Promise<
  | { ok: true; agencyId: string; profileId: string; firstName: string | null; buyer: Buyer }
  | { ok: false; error: string }
> {
  const profile = await getProfile();
  if (!profile || profile.removed_at || !z.uuid().safeParse(buyerId).success) {
    return { ok: false, error: RELAUNCH_FAILED };
  }
  const { data } = await createServiceRoleClient()
    .from('buyers')
    .select('*')
    .eq('id', buyerId as string)
    .eq('agency_id', profile.agency_id)
    .is('archived_at', null)
    .maybeSingle();
  if (!data) return { ok: false, error: RELAUNCH_FAILED };
  return {
    ok: true,
    agencyId: profile.agency_id,
    profileId: profile.id,
    firstName: profile.first_name ?? null,
    buyer: toBuyer(data),
  };
}

// La relance due de cet acquéreur, relue au serveur (jamais crue du navigateur).
async function dueFor(agencyId: string, buyer: Buyer) {
  const client = createServiceRoleClient();
  const { facts, failed } = await getRelaunchFacts(client, agencyId, [buyer]);
  const own = facts.get(buyer.id) ?? null;
  return { failed, own, due: own ? relaunchDue(own, new Date()) : null };
}

// Mission 135 (§ 2, 3) — « Préparer le message » : un lien neuf vers la même sélection (la base ne
// garde que le condensat du jeton : le premier lien n'est pas redonnable, il continue de marcher),
// et le message — le bien qui coche le plus de ses ★, ce qu'il a de ce qu'il cherche, jamais un
// prix ni « disponible ». Préparé par son propre geste ; les partages suivent dans le geste d'après.
export async function prepareRelaunch(buyerId: unknown): Promise<PrepareRelaunchResult> {
  const active = await activeBuyer(buyerId);
  if (!active.ok) return active;
  const { agencyId, buyer, firstName } = active;
  const { failed, own, due } = await dueFor(agencyId, buyer);
  if (failed) return { ok: false, error: RELAUNCH_FAILED };
  if (!own || !due) return { ok: false, error: RELAUNCH_NOT_DUE };

  const client = createServiceRoleClient();
  const [{ data: selectionRow }, { data: itemRows }] = await Promise.all([
    client
      .from('buyer_selections')
      .select('*')
      .eq('id', own.selectionId)
      .eq('agency_id', agencyId)
      .maybeSingle(),
    client
      .from('buyer_selection_items')
      .select('*')
      .eq('selection_id', own.selectionId)
      .eq('agency_id', agencyId)
      .order('position'),
  ]);
  if (!selectionRow) return { ok: false, error: RELAUNCH_FAILED };
  const selection = toSelection(selectionRow, itemRows ?? []);
  const shown = await presentedItems(client, selection.items, agencyId);
  const best = bestBien(
    buyer,
    shown.map((item) => ({
      price: item.price,
      property: {
        propertyType: item.propertyType,
        roomsCount: item.roomsCount,
        surfaceArea: item.surfaceArea,
        city: item.city,
        bedroomsCount: item.bedroomsCount,
        floor: item.floor,
        hasElevator: item.hasElevator,
        hasPool: item.hasPool,
        outdoorSpaces: item.outdoor,
        parkingTypes: item.parking,
        energyRating: item.energyRating,
        generalCondition: item.condition,
      },
    })),
  );
  const link = await createDossierLink(buyer.id, false);
  if (!link.ok) return { ok: false, error: link.error };
  return {
    ok: true,
    message: relaunchMessage({
      buyer,
      bien: best?.bien ?? null,
      fits: best?.fits === true,
      sentOn: due.sentOn,
      url: link.url,
      advisorFirstName: firstName,
    }),
    phone: buyer.phone,
    email: buyer.email,
  };
}

// « J'ai relancé » : la relance notée sur sa sélection (deux au plus, la base le garantit) et un
// échange avec lui (132, `contacted_at`, l'heure du serveur).
export async function recordBuyerRelaunch(buyerId: unknown): Promise<PlainRelaunchResult> {
  const active = await activeBuyer(buyerId);
  if (!active.ok) return active;
  const { agencyId, profileId, buyer } = active;
  const { failed, own, due } = await dueFor(agencyId, buyer);
  if (failed) return { ok: false, error: RELAUNCH_FAILED };
  if (!own || !due) return { ok: false, error: RELAUNCH_NOT_DUE };
  const client = createServiceRoleClient();
  const at = new Date().toISOString();
  const { error } = await client.from('buyer_events').insert({
    agency_id: agencyId,
    buyer_id: buyer.id,
    kind: 'relaunch',
    selection_id: own.selectionId,
    created_by: profileId,
  });
  if (error) return { ok: false, error: RELAUNCH_FAILED };
  const { error: contactError } = await client
    .from('buyers')
    .update({ contacted_at: at, updated_at: at })
    .eq('id', buyer.id)
    .eq('agency_id', agencyId);
  if (contactError) {
    // La relance est notée ; l'échange (132) a échoué : dit au journal, et à l'écran.
    await recordAppError({
      source: 'server',
      page: '/suivi',
      error: `Relance notée, échange non écrit : ${contactError.message}`,
      scope: '[recordBuyerRelaunch]',
      agencyId,
      userId: profileId,
    });
    revalidatePath('/suivi');
    return { ok: false, error: RELAUNCH_CONTACT_FAILED };
  }
  revalidatePath('/suivi');
  revalidatePath(`/acquereurs/${buyer.id}`);
  return { ok: true };
}

// Le premier partage du lien de sa dernière sélection, noté (Copier, SMS, WhatsApp, E-mail sur la
// page du dossier acquéreur) : c'est lui qui « envoie » la sélection. La première date est gardée
// (index unique de la base : un second partage ne change rien).
export async function recordLinkShared(buyerId: unknown): Promise<PlainRelaunchResult> {
  const active = await activeBuyer(buyerId);
  if (!active.ok) return active;
  const { agencyId, profileId, buyer } = active;
  const client = createServiceRoleClient();
  const { data: selection } = await client
    .from('buyer_selections')
    .select('id')
    .eq('buyer_id', buyer.id)
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!selection) return { ok: false, error: RELAUNCH_FAILED };
  // Un partage ne se note que pour une sélection qui a un lien valable.
  const { data: link } = await client
    .from('buyer_dossier_links')
    .select('id')
    .eq('selection_id', selection.id)
    .eq('agency_id', agencyId)
    .gt('expires_at', new Date().toISOString())
    .limit(1)
    .maybeSingle();
  if (!link) return { ok: false, error: RELAUNCH_FAILED };
  const { error } = await client.from('buyer_events').insert({
    agency_id: agencyId,
    buyer_id: buyer.id,
    kind: 'link_shared',
    selection_id: selection.id,
    created_by: profileId,
  });
  if (error && error.code !== '23505') return { ok: false, error: RELAUNCH_FAILED };
  return { ok: true };
}
