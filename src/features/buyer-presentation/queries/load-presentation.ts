import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { observedPriceDrops } from '@/features/buyer-presentation/queries/observed-price-drops';
import { agencyPriceForBuyer } from '@/features/buyer-presentation/services/agency-price';
import {
  listingOutdoor,
  listingParking,
} from '@/features/buyer-presentation/services/listing-facts';
import type { PresentedItemInput } from '@/features/buyer-presentation/types';
import type { IdealSelectionItem } from '@/features/ideal-properties/types';
import { signPropertyPhotos } from '@/features/subject-property-photos/services/property-photo-storage';
import type { Database, Json } from '@/lib/supabase/database.types';

export type PresentationClient = SupabaseClient<Database>;

const PHOTO_TTL_SECONDS = 60 * 60;

const strings = (value: Json | null | undefined): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
const httpsOnly = (urls: string[]): string[] => urls.filter((url) => /^https:\/\//i.test(url));
const num = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;
const str = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value : null;
const bool = (value: unknown): boolean | null => (typeof value === 'boolean' ? value : null);

const list = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];

// Mission 119 — ce que la présentation reçoit, par source, en LISTE D'AUTORISATION : ni titre, ni
// adresse, ni lien, ni « Vendu par », ni exclusivité, ni fourchette, ni prix convenu (M75, M83,
// M107). Le prix est celui figé à la sélection (M111). Les photos : celles du bien vendeur par
// liens signés d'une heure (M37, M113), celles de l'annonce du concurrent ou de l'annonce du marché
// telles que publiées (M58).
// Mission 119 (partie B) — le même chargement sert la présentation (client du conseiller, RLS) et
// le dossier acquéreur, à l'écran du conseiller comme sur son lien public (clé de service, après
// vérification du jeton) : le client est passé par l'appelant, et chaque lecture est cadrée sur
// l'agence de la fiche, clé de service comprise (décision de Jean-Guy, 25/10).
export async function presentedItems(
  supabase: PresentationClient,
  items: IdealSelectionItem[],
  agencyId: string,
): Promise<PresentedItemInput[]> {
  const projectIds = items
    .filter((item) => item.source === 'project')
    .map((item) => item.reference);
  const competitorIds = items
    .filter((item) => item.source === 'competitor')
    .map((item) => item.reference);
  const [{ data: properties }, { data: competitors }, { data: rawItems }, { data: conclusions }] =
    await Promise.all([
      projectIds.length > 0
        ? supabase
            .from('subject_properties')
            .select(
              'project_id, city, district, surface_area, rooms_count, bedrooms_count, outdoor_spaces, parking_types, energy_rating, photo_urls, property_type, floor, has_pool, has_elevator, general_condition',
            )
            .eq('agency_id', agencyId)
            .in('project_id', projectIds)
        : Promise.resolve({ data: [] as never[] }),
      competitorIds.length > 0
        ? supabase
            .from('comparables')
            .select(
              'id, city, district, surface_area, rooms_count, bedrooms_count, outdoor_spaces, parking_types, energy_rating, photo_urls, property_type, general_condition, listing_published_at',
            )
            .eq('agency_id', agencyId)
            .in('id', competitorIds)
        : Promise.resolve({ data: [] as never[] }),
      supabase
        .from('buyer_selection_items')
        .select('id, snapshot, imported')
        .eq('agency_id', agencyId)
        .in(
          'id',
          items.map((item) => item.id),
        ),
      // Décision de Jean-Guy (24/10) : seul un mandat SIGNÉ montre son prix ; l'issue est relue ici.
      projectIds.length > 0
        ? supabase
            .from('project_meeting_conclusions')
            .select('project_id, outcome')
            .eq('agency_id', agencyId)
            .in('project_id', projectIds)
        : Promise.resolve({ data: [] as never[] }),
    ]);
  const outcomeByProject = new Map((conclusions ?? []).map((row) => [row.project_id, row.outcome]));
  const propertyByProject = new Map((properties ?? []).map((row) => [row.project_id, row]));
  const competitorById = new Map((competitors ?? []).map((row) => [row.id, row]));
  const dataById = new Map((rawItems ?? []).map((row) => [row.id, row]));

  // Mission 122 — la baisse de prix, datée par les seules observations de l'agence (M47).
  const drops = await observedPriceDrops(supabase, items, agencyId);
  // Les photos du bien vendeur : des chemins du stockage, signés une heure.
  const propertyPaths = (properties ?? []).flatMap((row) => strings(row.photo_urls));
  const signed = new Map(
    (await signPropertyPhotos(supabase, propertyPaths, PHOTO_TTL_SECONDS)).map((photo) => [
      photo.path,
      photo.url,
    ]),
  );

  return items.map((item): PresentedItemInput => {
    const base = {
      itemId: item.id,
      position: item.position,
      source: item.source,
      category: item.category,
      label: item.label,
      price: item.listedPrice,
      priceSeenOn: item.priceSeenOn,
      gaps: item.gaps,
    };
    if (item.source === 'project') {
      const property = propertyByProject.get(item.reference);
      return {
        ...base,
        price: agencyPriceForBuyer(outcomeByProject.get(item.reference), item.listedPrice),
        city: property?.city ?? null,
        district: property?.district ?? null,
        surfaceArea: property?.surface_area ?? null,
        roomsCount: property?.rooms_count ?? null,
        bedroomsCount: property?.bedrooms_count ?? null,
        outdoor: property?.outdoor_spaces ?? [],
        parking: property?.parking_types ?? [],
        energyRating: property?.energy_rating ?? null,
        photos: strings(property?.photo_urls)
          .map((path) => signed.get(path) ?? null)
          .filter((url): url is string => url != null),
        propertyType: property?.property_type ?? null,
        floor: property?.floor ?? null,
        hasPool: property?.has_pool ?? null,
        hasElevator: property?.has_elevator ?? null,
        condition: property?.general_condition ?? null,
        // Un bien de l'agence n'a pas d'annonce publiée : aucun fait daté.
        listedSince: null,
        priceDrop: null,
      };
    }
    if (item.source === 'competitor') {
      const competitor = competitorById.get(item.reference);
      return {
        ...base,
        city: competitor?.city ?? null,
        district: competitor?.district ?? null,
        surfaceArea: competitor?.surface_area ?? null,
        roomsCount: competitor?.rooms_count ?? null,
        bedroomsCount: competitor?.bedrooms_count ?? null,
        outdoor: competitor?.outdoor_spaces ?? [],
        parking: competitor?.parking_types ?? [],
        energyRating: competitor?.energy_rating ?? null,
        photos: httpsOnly(strings(competitor?.photo_urls)),
        propertyType: competitor?.property_type ?? null,
        floor: null,
        hasPool: null,
        hasElevator: null,
        condition: competitor?.general_condition ?? null,
        listedSince: competitor?.listing_published_at ?? null,
        priceDrop: drops.get(item.id) ?? null,
      };
    }
    // Une annonce du marché : ce que l'import en a lu, sinon ce que la recherche en a dit.
    const row = dataById.get(item.id);
    const imported = (row?.imported ?? null) as Record<string, unknown> | null;
    const snapshot = (row?.snapshot ?? null) as Record<string, unknown> | null;
    const features = (snapshot?.features ?? null) as Record<string, unknown> | null;
    const outdoorFeature = (features?.outdoor ?? null) as { present?: unknown } | null;
    const streamEstate = (snapshot?.streamEstate ?? null) as Record<string, unknown> | null;
    const features122 = features ?? {};
    return {
      ...base,
      city: str(imported?.city) ?? str(snapshot?.city),
      district: str(imported?.district) ?? str(features?.district),
      surfaceArea: num(imported?.surfaceArea) ?? num(snapshot?.surfaceArea),
      roomsCount: num(imported?.roomsCount) ?? num(snapshot?.roomsCount),
      bedroomsCount: num(imported?.bedroomsCount) ?? num(streamEstate?.bedrooms),
      // Extérieur et parking connus comme absents : « ✗ », jamais « à vérifier » (M118).
      outdoor: listingOutdoor(imported, outdoorFeature),
      parking: listingParking(imported, features),
      energyRating: str(imported?.energyRating) ?? str(snapshot?.energyClass),
      photos: httpsOnly(imported ? list(imported.photoUrls) : list(snapshot?.photoUrls)),
      propertyType: str(imported?.propertyType) ?? str(snapshot?.propertyType),
      floor: num(imported?.floor) ?? num(features122.floor),
      hasPool: bool(features122.hasPool),
      hasElevator: bool(features122.hasElevator),
      condition: str(imported?.generalCondition) ?? str(features122.condition),
      // La date de mise en vente que l'annonce publie (M47) ; jamais le premier passage de Stream
      // Estate, qui n'est pas la date du portail (M101).
      listedSince: str(imported?.listingPublishedAt),
      priceDrop: drops.get(item.id) ?? null,
    };
  });
}
