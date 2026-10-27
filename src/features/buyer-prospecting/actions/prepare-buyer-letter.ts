'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { locateDemoBuyerProspects } from '@/features/buyer-prospecting/actions/buyer-prospect-locations';
import {
  comparableFacts,
  prospectFacts,
} from '@/features/buyer-prospecting/services/prospect-facts';
import { buyerLetterHref } from '@/features/buyer-prospecting/services/buyer-letter-href';
import { visitAction } from '@/features/buyer-prospecting/services/visit-action';
import { listingIdentityKey } from '@/features/comparable-import/utils/extract-listing-key';
import { poolFromLabels } from '@/features/competitor-search/services/stream-estate-features';
import { isDemoAgency } from '@/features/demo/services/is-demo-agency';
import type { SelectionSource } from '@/features/ideal-properties/types';
import { getProspectingCards } from '@/features/prospecting/queries/prospecting-card-store';
import { getProfile } from '@/lib/auth/get-profile';
import type { Json } from '@/lib/supabase/database.types';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export type PrepareBuyerLetterResult = { ok: true; href: string } | { ok: false; error: string };

const FAILURE = 'Le courrier n’a pas pu être préparé. Réessayez.';
const NOT_A_LETTER = 'Ce bien ne demande pas de courrier au propriétaire.';

type Imported = {
  listingUrl?: unknown;
  soldBy?: unknown;
  exclusivity?: unknown;
  listingFeatures?: unknown;
};

const COMPARABLE_COLUMNS =
  'id, listing_url, sold_by, exclusivity, property_type, surface_area, rooms_count, land_area, outdoor_spaces, parking_types, listing_features, energy_rating, district, city, price, photo_urls';

// Mission 120 — « Préparer le courrier au propriétaire », depuis une visite demandée (Visites, fiche).
// La visite vient du navigateur : relue ici, dans l'agence, vivante, sur une fiche non archivée. Le
// courrier ne vaut que pour un concurrent ou une annonce du marché sans exclusivité, ou dont
// l'exclusivité n'est pas connue (le conseiller choisit le propriétaire, rien n'est supposé).
// Un même bien n'a qu'UNE carte de Prospection (M98, M111) : s'il y est déjà comme concurrent d'un
// mandat signé — même concurrent, ou même annonce publiée —, la carte existante reçoit l'origine
// « Recherche acquéreur » ; sinon un bien démarché naît, une fois par annonce et par agence. Pas de
// concurrent sans dossier vendeur (M118). Écrit par le serveur seul, après ce garde.
export async function prepareBuyerLetter(visitId: unknown): Promise<PrepareBuyerLetterResult> {
  const profile = await getProfile();
  if (!profile || profile.removed_at || !z.uuid().safeParse(visitId).success) {
    return { ok: false, error: FAILURE };
  }
  const agencyId = profile.agency_id;
  const client = createServiceRoleClient();
  const { data: visit } = await client
    .from('buyer_visit_requests')
    .select(
      'id, buyer_id, buyer_selection_item_id, cancelled_at, buyers!inner(archived_at), buyer_selection_items!inner(id, source, reference, imported, snapshot)',
    )
    .eq('id', visitId as string)
    .eq('agency_id', agencyId)
    .maybeSingle();
  const buyer = visit?.buyers as unknown as { archived_at: string | null } | undefined;
  const item = visit?.buyer_selection_items as unknown as
    | { id: string; source: SelectionSource; reference: string; imported: Json; snapshot: Json }
    | undefined;
  if (!visit || !buyer || !item || visit.cancelled_at != null || buyer.archived_at != null) {
    return { ok: false, error: FAILURE };
  }

  // Déjà préparé pour ce bien retenu : le même courrier.
  const { data: existing } = await client
    .from('buyer_prospect_origins')
    .select('id')
    .eq('selection_item_id', item.id)
    .eq('agency_id', agencyId)
    .maybeSingle();
  if (existing) {
    return { ok: true, href: buyerLetterHref(existing.id) };
  }

  const imported = (item.imported ?? null) as Imported | null;
  const snapshot = (item.snapshot ?? null) as Record<string, unknown> | null;
  let competitor: Record<string, unknown> | null = null;
  if (item.source === 'competitor') {
    const { data } = await client
      .from('comparables')
      .select(COMPARABLE_COLUMNS)
      .eq('id', item.reference)
      .eq('agency_id', agencyId)
      .maybeSingle();
    competitor = (data as Record<string, unknown> | null) ?? null;
    if (!competitor) {
      return { ok: false, error: FAILURE };
    }
  } else if (item.source !== 'listing') {
    return { ok: false, error: NOT_A_LETTER };
  }
  const exclusivity = competitor ? competitor.exclusivity : imported?.exclusivity;
  const action = visitAction({
    source: item.source,
    exclusivity: typeof exclusivity === 'string' ? exclusivity : null,
  });
  if (action.kind !== 'owner_letter' && action.kind !== 'choose') {
    return { ok: false, error: NOT_A_LETTER };
  }

  const listingUrl = competitor
    ? typeof competitor.listing_url === 'string'
      ? competitor.listing_url
      : null
    : item.reference;
  const listingKey = listingIdentityKey(listingUrl);

  // La carte existante : ce concurrent, ou un concurrent qui porte la même annonce publiée.
  const cards = await getProspectingCards();
  const card =
    cards.find((candidate) =>
      candidate.copies.some(
        (copy) =>
          (competitor != null && copy.row.id === competitor.id) ||
          (listingKey != null && copy.row.listingKey === listingKey),
      ),
    ) ?? null;

  let target: { prospect_id: string } | { comparable_id: string };
  if (card) {
    const copy =
      card.copies.find((entry) => competitor != null && entry.row.id === competitor.id) ??
      card.copies[0];
    target = { comparable_id: copy.row.id };
  } else {
    if (!listingUrl || !listingKey) {
      return {
        ok: false,
        error: 'Ce bien n’a pas d’annonce reconnue : le courrier ne peut pas se préparer.',
      };
    }
    const facts = competitor
      ? comparableFacts(competitor as unknown as Parameters<typeof comparableFacts>[0])
      : prospectFacts(
          {
            ...(imported as Record<string, unknown> | null),
            hasPool: Array.isArray(imported?.listingFeatures)
              ? poolFromLabels(imported.listingFeatures as string[])
              : null,
          },
          snapshot,
        );
    const soldBy = competitor ? competitor.sold_by : imported?.soldBy;
    // Une annonce déjà démarchée pour une autre recherche garde sa carte, ses faits et son statut.
    const known = async () =>
      (
        await client
          .from('buyer_prospects')
          .select('id')
          .eq('agency_id', agencyId)
          .eq('listing_key', listingKey)
          .maybeSingle()
      ).data;
    let prospect = await known();
    if (!prospect) {
      const { data, error } = await client
        .from('buyer_prospects')
        .insert({
          agency_id: agencyId,
          created_by: profile.id,
          listing_url: listingUrl,
          listing_key: listingKey,
          facts: facts as unknown as Json,
          sold_by: soldBy === 'agency' || soldBy === 'private' ? soldBy : null,
          exclusivity: exclusivity === 'yes' || exclusivity === 'no' ? exclusivity : null,
        })
        .select('id')
        .single();
      // Deux préparations au même instant : la seconde retrouve la carte de la première.
      prospect = error ? await known() : data;
    }
    if (!prospect) {
      return { ok: false, error: FAILURE };
    }
    target = { prospect_id: prospect.id };
  }

  const { data: origin, error: originError } = await client
    .from('buyer_prospect_origins')
    .insert({
      agency_id: agencyId,
      created_by: profile.id,
      buyer_id: visit.buyer_id,
      selection_item_id: item.id,
      letter_version: 'owner',
      ...target,
    })
    .select('id')
    .single();
  if (originError || !origin) {
    return { ok: false, error: FAILURE };
  }

  // Mission 114 — en démonstration, le Localisateur simulé confirme l'adresse tout de suite, par
  // le même chemin qu'une réponse du vrai Localisateur.
  if ('prospect_id' in target && (await isDemoAgency(agencyId))) {
    await locateDemoBuyerProspects();
  }

  revalidatePath('/visites');
  revalidatePath('/prospection');
  revalidatePath(`/acquereurs/${visit.buyer_id}`);
  return { ok: true, href: buyerLetterHref(origin.id) };
}
