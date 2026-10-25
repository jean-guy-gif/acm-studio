import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { getAgencyBranding } from '@/features/branding/queries/get-agency-branding';
import { agencyPriceForBuyer } from '@/features/buyer-presentation/services/agency-price';
import { buildBuyerPresentation } from '@/features/buyer-presentation/services/build-presentation';
import { toVisitRequest } from '@/features/buyer-presentation/services/visit-request-row';
import type {
  BuyerPresentation,
  PresentedItemInput,
  VisitRequest,
} from '@/features/buyer-presentation/types';
import { getBuyer } from '@/features/buyers/queries/get-buyers';
import { getIdealSelection } from '@/features/ideal-properties/queries/get-ideal-selection';
import type { IdealSelectionItem } from '@/features/ideal-properties/types';
import { signPropertyPhotos } from '@/features/subject-property-photos/services/property-photo-storage';
import { getAgency } from '@/lib/auth/get-agency';
import { getProfile } from '@/lib/auth/get-profile';
import type { Database, Json } from '@/lib/supabase/database.types';
import { createClient } from '@/lib/supabase/server';

export type PresentationClient = SupabaseClient<Database>;

export type LoadedPresentation = {
  presentation: BuyerPresentation;
  requests: VisitRequest[];
  logoLightUrl: string | null;
  logoDarkUrl: string | null;
  agencyName: string | null;
  advisorFirstName: string | null;
};

const PHOTO_TTL_SECONDS = 60 * 60;

const strings = (value: Json | null | undefined): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
const httpsOnly = (urls: string[]): string[] => urls.filter((url) => /^https:\/\//i.test(url));
const num = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;
const str = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value : null;
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
              'project_id, city, district, surface_area, rooms_count, bedrooms_count, outdoor_spaces, parking_types, energy_rating, photo_urls',
            )
            .eq('agency_id', agencyId)
            .in('project_id', projectIds)
        : Promise.resolve({ data: [] as never[] }),
      competitorIds.length > 0
        ? supabase
            .from('comparables')
            .select(
              'id, city, district, surface_area, rooms_count, bedrooms_count, outdoor_spaces, parking_types, energy_rating, photo_urls',
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
      };
    }
    // Une annonce du marché : ce que l'import en a lu, sinon ce que la recherche en a dit.
    const row = dataById.get(item.id);
    const imported = (row?.imported ?? null) as Record<string, unknown> | null;
    const snapshot = (row?.snapshot ?? null) as Record<string, unknown> | null;
    const features = (snapshot?.features ?? null) as Record<string, unknown> | null;
    const outdoorFeature = (features?.outdoor ?? null) as { present?: unknown } | null;
    const streamEstate = (snapshot?.streamEstate ?? null) as Record<string, unknown> | null;
    return {
      ...base,
      city: str(imported?.city) ?? str(snapshot?.city),
      district: str(imported?.district) ?? str(features?.district),
      surfaceArea: num(imported?.surfaceArea) ?? num(snapshot?.surfaceArea),
      roomsCount: num(imported?.roomsCount) ?? num(snapshot?.roomsCount),
      bedroomsCount: num(imported?.bedroomsCount) ?? num(streamEstate?.bedrooms),
      outdoor: imported ? list(imported.outdoorSpaces) : list(outdoorFeature?.present),
      parking: imported ? list(imported.parkingTypes) : list(features?.parking),
      energyRating: str(imported?.energyRating) ?? str(snapshot?.energyClass),
      photos: httpsOnly(imported ? list(imported.photoUrls) : list(snapshot?.photoUrls)),
    };
  });
}

// La présentation d'un acquéreur de l'agence : sa dernière sélection, ses demandes de visite,
// l'identité de l'agence et le prénom du conseiller. null : fiche archivée, d'une autre agence,
// ou sans sélection.
export async function loadPresentation(buyerId: string): Promise<LoadedPresentation | null> {
  const [buyer, profile] = await Promise.all([getBuyer(buyerId), getProfile()]);
  if (!buyer || !profile) return null;
  const selection = await getIdealSelection(buyer.id);
  if (!selection) return null;
  const supabase = await createClient();
  const [{ data: selectionRow }, { data: requestRows }, items, branding, agency] =
    await Promise.all([
      supabase.from('buyer_selections').select('presented_at').eq('id', selection.id).maybeSingle(),
      supabase
        .from('buyer_visit_requests')
        .select('*')
        .in(
          'buyer_selection_item_id',
          selection.items.map((item) => item.id),
        )
        .order('requested_at'),
      presentedItems(supabase, selection.items, profile.agency_id),
      getAgencyBranding(),
      getAgency(profile.agency_id),
    ]);
  return {
    presentation: buildBuyerPresentation({
      buyerId: buyer.id,
      buyer,
      selectionId: selection.id,
      selectedAt: selection.createdAt,
      presentedAt: selectionRow?.presented_at ?? null,
      items,
    }),
    requests: (requestRows ?? []).map(toVisitRequest),
    logoLightUrl: branding?.logoLightUrl ?? null,
    logoDarkUrl: branding?.logoDarkUrl ?? null,
    agencyName: agency?.name ?? null,
    advisorFirstName: profile.first_name?.trim() || null,
  };
}
