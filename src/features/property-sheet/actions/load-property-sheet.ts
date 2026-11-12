'use server';

import { z } from 'zod';

import { extractListingKey } from '@/features/comparable-import/utils/extract-listing-key';
import {
  buildPropertySheet,
  type PropertySheet,
  type SheetFacts,
} from '@/features/property-sheet/services/property-sheet';
import {
  sheetFactsFromCompetitor,
  sheetFactsFromMandate,
  sheetFactsFromSelectionListing,
  type ObservedPrice,
} from '@/features/property-sheet/services/sheet-sources';
import { readPhotoPaths } from '@/features/subject-property-photos/services/get-property-photos';
import { signPropertyPhotos } from '@/features/subject-property-photos/services/property-photo-storage';
import { SHEET_NOT_FOUND, SHEET_UNREADABLE } from '@/features/property-sheet/sheet-messages';
import { getProfile } from '@/lib/auth/get-profile';
import { reportServerError } from '@/lib/app-errors/report-server-error';
import { createClient } from '@/lib/supabase/server';

// Mission 152 (partie B) — la fiche complète d'un bien, à l'ouverture, pour le conseiller SEUL
// (Jean-Guy, 11/11) : un concurrent, un mandat de l'agence, ou un bien d'une sélection. Tout est
// lu dans l'agence du conseiller (un membre retiré ne lit rien, M105) ; une autre agence, un dossier
// archivé ou une ligne inconnue rendent « introuvable ». Rien n'est écrit ; rien n'en part vers un
// acquéreur : ni le dossier acquéreur, ni la présentation ne lisent cette action.

export type PropertySheetTarget =
  | { kind: 'competitor'; id: string }
  | { kind: 'project'; id: string }
  | { kind: 'selection-item'; id: string };

export type LoadPropertySheetResult =
  { ok: true; sheet: PropertySheet } | { ok: false; error: string };

// Les liens signés des photos du mandat : le temps de regarder la fiche.
const PHOTO_TTL_SECONDS = 30 * 60;

const targetSchema = z.object({
  kind: z.enum(['competitor', 'project', 'selection-item']),
  id: z.string().uuid(),
});

type Client = Awaited<ReturnType<typeof createClient>>;
type Loaded = { facts: SheetFacts } | { error: string };

const COMPETITOR_COLUMNS =
  'property_type, rooms_count, surface_area, city, land_area, bedrooms_count, bathrooms_count, energy_rating, ges_rating, outdoor_spaces, parking_types, heating_type, construction_year, general_condition, exposure, listing_features, listing_description, listing_published_at, listing_url, photo_urls, price, price_drop_amount, first_seen_on, created_at, projects!inner(status)';

async function competitorFacts(client: Client, agencyId: string, id: string): Promise<Loaded> {
  const { data, error } = await client
    .from('comparables')
    .select(COMPETITOR_COLUMNS)
    .eq('id', id)
    .eq('agency_id', agencyId)
    .neq('projects.status', 'archived')
    .maybeSingle();
  if (error) {
    await reportServerError('loadPropertySheet', error);
    return { error: SHEET_UNREADABLE };
  }
  if (!data) return { error: SHEET_NOT_FOUND };
  const identity = data.listing_url ? extractListingKey(data.listing_url) : null;
  let observations: ObservedPrice[] = [];
  if (identity) {
    const read = await client
      .from('listing_observations')
      .select('observed_on, price')
      .eq('agency_id', agencyId)
      .eq('portal', identity.portal)
      .eq('listing_key', identity.listingKey)
      .order('observed_on', { ascending: true })
      .limit(200);
    // Les relevés illisibles : la fiche reste, sans dates relues (M98 : rien n'est inventé).
    if (read.error) await reportServerError('loadPropertySheet', read.error);
    observations = (read.data ?? []).map((row) => ({
      observed_on: row.observed_on,
      price: Number(row.price),
    }));
  }
  return { facts: sheetFactsFromCompetitor(data, observations) };
}

async function mandateFacts(client: Client, agencyId: string, projectId: string): Promise<Loaded> {
  const property = await client
    .from('subject_properties')
    .select(
      'property_type, rooms_count, surface_area, city, land_area, bedrooms_count, bathrooms_count, energy_rating, ges_rating, outdoor_spaces, parking_types, has_pool, has_elevator, floor, heating_type, construction_year, general_condition, exposure, strengths, description, photo_urls, projects!inner(status)',
    )
    .eq('project_id', projectId)
    .eq('agency_id', agencyId)
    .neq('projects.status', 'archived')
    .maybeSingle();
  const conclusion = await client
    .from('project_meeting_conclusions')
    .select('commercialization_price')
    .eq('project_id', projectId)
    .eq('agency_id', agencyId)
    .maybeSingle();
  if (property.error || conclusion.error) {
    await reportServerError('loadPropertySheet', property.error ?? conclusion.error);
    return { error: SHEET_UNREADABLE };
  }
  if (!property.data) return { error: SHEET_NOT_FOUND };
  const paths = readPhotoPaths(property.data.photo_urls ?? null);
  const photos = (await signPropertyPhotos(client, paths, PHOTO_TTL_SECONDS))
    .map((photo) => photo.url)
    .filter((url): url is string => url != null);
  const price = conclusion.data?.commercialization_price;
  return {
    facts: sheetFactsFromMandate(property.data, photos, price != null ? Number(price) : null),
  };
}

async function selectionItemFacts(client: Client, agencyId: string, id: string): Promise<Loaded> {
  const { data, error } = await client
    .from('buyer_selection_items')
    .select('source, reference, label, listed_price, price_seen_on, imported, snapshot')
    .eq('id', id)
    .eq('agency_id', agencyId)
    .maybeSingle();
  if (error) {
    await reportServerError('loadPropertySheet', error);
    return { error: SHEET_UNREADABLE };
  }
  if (!data) return { error: SHEET_NOT_FOUND };
  const uuid = z.string().uuid();
  if (data.source === 'project') {
    return uuid.safeParse(data.reference).success
      ? mandateFacts(client, agencyId, data.reference)
      : { error: SHEET_NOT_FOUND };
  }
  if (data.source === 'competitor') {
    return uuid.safeParse(data.reference).success
      ? competitorFacts(client, agencyId, data.reference)
      : { error: SHEET_NOT_FOUND };
  }
  return {
    facts: sheetFactsFromSelectionListing({
      label: data.label,
      reference: data.reference,
      listedPrice: data.listed_price != null ? Number(data.listed_price) : null,
      priceSeenOn: data.price_seen_on,
      imported: data.imported,
      snapshot: data.snapshot,
    }),
  };
}

export async function loadPropertySheet(
  target: PropertySheetTarget,
): Promise<LoadPropertySheetResult> {
  const parsed = targetSchema.safeParse(target);
  if (!parsed.success) return { ok: false, error: SHEET_NOT_FOUND };
  const profile = await getProfile();
  if (!profile || profile.removed_at) return { ok: false, error: SHEET_NOT_FOUND };
  const client = await createClient();
  const { kind, id } = parsed.data;
  try {
    const loaded =
      kind === 'competitor'
        ? await competitorFacts(client, profile.agency_id, id)
        : kind === 'project'
          ? await mandateFacts(client, profile.agency_id, id)
          : await selectionItemFacts(client, profile.agency_id, id);
    if ('error' in loaded) return { ok: false, error: loaded.error };
    return { ok: true, sheet: buildPropertySheet(loaded.facts) };
  } catch (error) {
    await reportServerError('loadPropertySheet', error);
    return { ok: false, error: SHEET_UNREADABLE };
  }
}
