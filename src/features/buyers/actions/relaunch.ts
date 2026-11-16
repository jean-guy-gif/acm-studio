'use server';

import { clientTexts, textLanguage } from '@/lib/client-texts';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { readPropertyLivingLinks } from '@/features/academia/queries/read-property-living-links';
import {
  deckLetter,
  LIVING_HERE_UNREAD_SHARE,
} from '@/features/academia/services/living-here-info';
import { livingHereEverywhereOpen } from '@/features/academia/services/living-here-switch';
import { createDossierLink } from '@/features/buyer-dossier/actions/dossier-links';
import { presentedItems } from '@/features/buyer-presentation/queries/load-presentation';
import { getRelaunchFacts } from '@/features/buyers/queries/get-relaunch-facts';
import { toBuyer } from '@/features/buyers/services/buyer-row';
import {
  bestBien,
  relaunchDue,
  relaunchMessage,
  RELAUNCH_FAILED,
  RELAUNCH_NOT_DUE,
} from '@/features/buyers/services/link-relaunch';
import type { Buyer } from '@/features/buyers/types';
import { toSelection } from '@/features/ideal-properties/services/ideal-selection';
import { getProfile } from '@/lib/auth/get-profile';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

// Mission 156 — `livingHereLetters` : les biens hors mandat dont le lien « Vivre ici » part avec le
// lien de la sélection ; l'écran dit la ligne d'information au-dessus des boutons de partage.
export type PrepareRelaunchResult =
  | {
      ok: true;
      message: string;
      phone: string | null;
      email: string | null;
      subject: string;
      livingHereLetters: string[];
    }
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
  // Mission 156 — les liens « Vivre ici » des biens hors mandat, lus AVANT de créer le lien : la
  // page de l'acquéreur les relit à son ouverture. Une lecture en échec ne crée rien et le dit :
  // jamais un lien hors mandat parti sans la ligne d'information (Jean-Guy, 16/11).
  const living = livingHereEverywhereOpen()
    ? await readPropertyLivingLinks(client, agencyId, selection.items)
    : null;
  if (living && !living.ok) return { ok: false, error: LIVING_HERE_UNREAD_SHARE };
  const link = await createDossierLink(buyer.id, false);
  if (!link.ok) return { ok: false, error: link.error };
  // Les lettres du déroulé : celles des biens montrés (un concurrent supprimé depuis n'en a pas).
  const sources = new Map(selection.items.map((item) => [item.id, item.source]));
  const livingHereLetters = living?.ok
    ? shown.flatMap((item, index) =>
        sources.get(item.itemId) !== 'project' && living.links.has(item.itemId)
          ? [deckLetter(index)]
          : [],
      )
    : [];
  return {
    ok: true,
    message: relaunchMessage({
      buyer,
      bien: best?.bien ?? null,
      fits: best?.fits === true,
      sentOn: due.sentOn,
      url: link.url,
      advisorFirstName: firstName,
      language: textLanguage(buyer.language),
    }),
    subject: clientTexts(buyer.language).buyer.messages.relaunch.subject,
    phone: buyer.phone,
    email: buyer.email,
    livingHereLetters,
  };
}

// « J'ai relancé » : la relance notée sur sa sélection (deux au plus, la base le garantit). Ce n'est
// pas un échange avec lui : seul ce qui vient de l'acquéreur en est un (décision du 06/11).
export async function recordBuyerRelaunch(buyerId: unknown): Promise<PlainRelaunchResult> {
  const active = await activeBuyer(buyerId);
  if (!active.ok) return active;
  const { agencyId, profileId, buyer } = active;
  const { failed, own, due } = await dueFor(agencyId, buyer);
  if (failed) return { ok: false, error: RELAUNCH_FAILED };
  if (!own || !due) return { ok: false, error: RELAUNCH_NOT_DUE };
  const client = createServiceRoleClient();
  const { error } = await client.from('buyer_events').insert({
    agency_id: agencyId,
    buyer_id: buyer.id,
    kind: 'relaunch',
    selection_id: own.selectionId,
    created_by: profileId,
  });
  if (error) return { ok: false, error: RELAUNCH_FAILED };
  revalidatePath('/suivi');
  revalidatePath('/aujourdhui');
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
