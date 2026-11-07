'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { createDossierLink } from '@/features/buyer-dossier/actions/dossier-links';
import { loadAgencyBuyers } from '@/features/buyers/queries/get-property-buyers';
import { loadLoopCatalog } from '@/features/buyers/queries/get-loop-properties';
import {
  loopBuyers,
  PROPOSAL_FAILED,
  PROPOSAL_NOT_MATCHING,
  PROPOSAL_UNKNOWN_PROPERTY,
  type LoopProperty,
} from '@/features/buyers/services/loop-properties';
import { MAX_IDEAL_SELECTION } from '@/features/ideal-properties/types';
import { negotiationNote } from '@/features/meeting-conclusion/services/buyer-rules';
import { parisDay } from '@/features/meeting-conclusion/services/follow-up-contacts';
import { getProfile } from '@/lib/auth/get-profile';
import type { Json } from '@/lib/supabase/database.types';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export type PrepareProposalResult =
  { ok: true; url: string; selectionItemId: string } | { ok: false; error: string };
export type RecordProposalResult = { ok: true; sentAt: string } | { ok: false; error: string };

const KEY = z.string().min(3).max(2100);

// Le bien et l'acquéreur, relus au serveur : le bien est l'un de ceux de l'agence (la boucle,
// M134), l'acquéreur une fiche active qui lui correspond aujourd'hui (la règle de la 133).
async function resolve(
  buyerId: unknown,
  propertyKey: unknown,
): Promise<
  | {
      ok: true;
      agencyId: string;
      profileId: string;
      item: LoopProperty;
      buyerIdOk: string;
      // Mission 145 — les mandats proposables aujourd'hui (le catalogue de la boucle).
      proposableKeys: Set<string>;
    }
  | { ok: false; error: string }
> {
  const profile = await getProfile();
  if (!profile || profile.removed_at) return { ok: false, error: PROPOSAL_FAILED };
  if (!z.uuid().safeParse(buyerId).success || !KEY.safeParse(propertyKey).success) {
    return { ok: false, error: PROPOSAL_FAILED };
  }
  const now = new Date();
  const [agency, catalog] = await Promise.all([
    loadAgencyBuyers(profile.agency_id),
    loadLoopCatalog(profile.agency_id, now),
  ]);
  if (agency.failed || catalog.failed) return { ok: false, error: PROPOSAL_FAILED };
  const item = catalog.items.find((entry) => entry.key === propertyKey);
  if (!item) return { ok: false, error: PROPOSAL_UNKNOWN_PROPERTY };
  const loop = loopBuyers(item, agency.buyers, agency.progress, catalog.contacts, now);
  const matching = [...loop.ready, ...loop.others].some(({ buyer }) => buyer.id === buyerId);
  if (!matching) return { ok: false, error: PROPOSAL_NOT_MATCHING };
  return {
    ok: true,
    agencyId: profile.agency_id,
    profileId: profile.id,
    item,
    buyerIdOk: buyerId as string,
    proposableKeys: new Set(catalog.items.map((entry) => entry.key)),
  };
}

// Mission 134 (§ 6) — le lien du dossier acquéreur (M119, M122 B) avec CE bien en tête : une
// nouvelle sélection — ce bien, puis les deux premiers biens encore retenus de la sélection
// actuelle, sa phrase « Vous m'avez dit » reprise — et un lien qui la porte, le précédent cessant
// de marcher (M122 B), ce que l'écran dit avant « Préparer son lien ». Rien n'est noté ici : seul
// « Envoyé, suivant » note l'envoi. Mission 145 — seul un mandat signé sans offre acceptée se
// propose : un bien de l'agence de la sélection actuelle qui ne l'est plus (vendeur à relancer,
// mandat sous offre) n'est pas recopié dans le lien. Une sélection illisible n'est jamais lue comme
// vide (M98) ; si le lien échoue, la nouvelle sélection est retirée.
export async function prepareProposalLink(
  buyerId: unknown,
  propertyKey: unknown,
): Promise<PrepareProposalResult> {
  const resolved = await resolve(buyerId, propertyKey);
  if (!resolved.ok) return resolved;
  const { agencyId, profileId, item, buyerIdOk, proposableKeys } = resolved;
  const client = createServiceRoleClient();

  const { data: buyerRow } = await client
    .from('buyers')
    .select('budget_max')
    .eq('id', buyerIdOk)
    .eq('agency_id', agencyId)
    .maybeSingle();
  const { data: previous, error: previousError } = await client
    .from('buyer_selections')
    .select('id, buyer_words')
    .eq('buyer_id', buyerIdOk)
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (previousError || !buyerRow) return { ok: false, error: PROPOSAL_FAILED };
  const { data: previousItems, error: itemsReadError } = previous?.id
    ? await client
        .from('buyer_selection_items')
        .select(
          'source, reference, label, listed_price, price_seen_on, category, gaps, snapshot, imported, pitch, dossier_hide_photo',
        )
        .eq('selection_id', previous.id)
        .eq('agency_id', agencyId)
        .is('removed_at', null)
        .order('position', { ascending: true })
    : { data: [], error: null };
  if (itemsReadError) return { ok: false, error: PROPOSAL_FAILED };
  const kept = (previousItems ?? [])
    .filter((row) => !item.selectionRefs.includes(`${row.source}:${row.reference}`))
    .filter((row) => row.source !== 'project' || proposableKeys.has(`project:${row.reference}`))
    .slice(0, MAX_IDEAL_SELECTION - 1);

  const { data: selection, error } = await client
    .from('buyer_selections')
    .insert({
      agency_id: agencyId,
      buyer_id: buyerIdOk,
      created_by: profileId,
      buyer_words: previous?.buyer_words ?? null,
    })
    .select('id')
    .single();
  if (error || !selection) return { ok: false, error: PROPOSAL_FAILED };

  const note =
    item.price != null
      ? negotiationNote(
          {
            propertyType: null,
            roomsCount: null,
            surfaceArea: null,
            budgetMin: null,
            budgetMax: buyerRow.budget_max,
            city: null,
          },
          {
            roomsCount: item.property.roomsCount,
            surfaceArea: item.property.surfaceArea,
            city: item.property.city,
            price: item.price,
          },
        )
      : null;
  const head = {
    source: item.source,
    reference: item.reference,
    label: item.label,
    listed_price: item.price,
    // Une annonce : « affiché le » du jour (M118) et ses faits publiés, relus par la liste
    // d'autorisation (M120), pour que son dossier montre ses photos et ses caractéristiques.
    price_seen_on: item.source === 'listing' ? parisDay(new Date()) : null,
    category: 'agency',
    gaps: note ? [note] : [],
    snapshot: null,
    imported: (item.source === 'listing' ? (item.facts ?? null) : null) as Json | null,
    pitch: null,
    dossier_hide_photo: false,
  };
  const rows = [head, ...kept].map((row, index) => ({
    ...row,
    agency_id: agencyId,
    selection_id: selection.id,
    position: index + 1,
  }));
  const { data: inserted, error: insertError } = await client
    .from('buyer_selection_items')
    .insert(rows)
    .select('id, position');
  const headId = inserted?.find((row) => row.position === 1)?.id ?? null;
  if (insertError || !headId) {
    await client.from('buyer_selections').delete().eq('id', selection.id);
    return { ok: false, error: PROPOSAL_FAILED };
  }
  const link = await createDossierLink(buyerIdOk, true);
  if (!link.ok) {
    await client.from('buyer_selections').delete().eq('id', selection.id);
    return { ok: false, error: link.error };
  }
  revalidatePath(`/acquereurs/${buyerIdOk}`);
  return { ok: true, url: link.url, selectionItemId: headId };
}

// Mission 134 (§ 6, 7) — « Envoyé, suivant » : le bien est noté proposé à cet acquéreur, une fois,
// à l'heure de la base (`buyer_proposals`) ; ce n'est pas un échange (seul ce qui vient de
// l'acquéreur en est un, décision du 06/11) ; il se lit sur sa fiche et la tâche du bien
// s'en vide. ACM n'envoie rien : il note. « Passer » n'appelle pas cette action.
export async function recordProposal(
  buyerId: unknown,
  propertyKey: unknown,
  selectionItemId: unknown,
): Promise<RecordProposalResult> {
  const resolved = await resolve(buyerId, propertyKey);
  if (!resolved.ok) return resolved;
  const { agencyId, profileId, item, buyerIdOk } = resolved;
  const itemId = z.uuid().safeParse(selectionItemId).success ? (selectionItemId as string) : null;
  const client = createServiceRoleClient();
  const { error } = await client.from('buyer_proposals').upsert(
    {
      agency_id: agencyId,
      buyer_id: buyerIdOk,
      property_key: item.key,
      source: item.source,
      reference: item.reference,
      project_id: item.projectId,
      origin: item.origin,
      label: item.label,
      selection_item_id: itemId,
      sent_by: profileId,
    },
    { onConflict: 'buyer_id,property_key', ignoreDuplicates: true },
  );
  if (error) return { ok: false, error: PROPOSAL_FAILED };
  const { data: row } = await client
    .from('buyer_proposals')
    .select('sent_at')
    .eq('buyer_id', buyerIdOk)
    .eq('property_key', item.key)
    .eq('agency_id', agencyId)
    .maybeSingle();
  revalidatePath(`/acquereurs/${buyerIdOk}`);
  revalidatePath('/suivi');
  return { ok: true, sentAt: row?.sent_at ?? new Date().toISOString() };
}
