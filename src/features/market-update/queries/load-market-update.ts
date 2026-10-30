import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { buildComparableFeatureComparison } from '@/features/live-seller/services/build-comparable-feature-comparison';
import type { FeatureBundle } from '@/features/live-seller/types';
import { parseMarketUpdateSummary } from '@/features/market-update/services/market-update-summary';
import type { MarketUpdateDocument } from '@/features/market-update/types';
import { propertyTypeLabel } from '@/features/subject-property/services/property-type-choice';
import {
  DOCUMENT_PHOTO_URL_TTL_SECONDS,
  loadDocumentAgency,
} from '@/features/seller-synthesis/queries/load-document-agency';
import type { SynthesisFeature } from '@/features/seller-synthesis/types';
import {
  propertyPhotoPrefix,
  signPropertyPhotos,
} from '@/features/subject-property-photos/services/property-photo-storage';
import type { Database } from '@/lib/supabase/database.types';

type Client = SupabaseClient<Database>;

const strings = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim() !== '')
    : [];

const bundle = (row: {
  surface_area: number | null;
  rooms_count: number | null;
  bedrooms_count: number | null;
  general_condition: string | null;
  energy_rating: string | null;
  ges_rating: string | null;
  outdoor_spaces: unknown;
  parking_types: unknown;
  exposure: string | null;
}): FeatureBundle => ({
  surfaceArea: row.surface_area,
  roomsCount: row.rooms_count,
  bedroomsCount: row.bedrooms_count,
  generalCondition: row.general_condition,
  energyRating: row.energy_rating,
  gesRating: row.ges_rating,
  outdoorSpaces: strings(row.outdoor_spaces),
  parkingTypes: strings(row.parking_types),
  exposure: row.exposure,
});

// Les lignes de la grille du Live (M40, M80) : un critère sans donnée ne s'affiche pas.
const features = (subject: FeatureBundle, competitor: FeatureBundle): SynthesisFeature[] =>
  buildComparableFeatureComparison(subject, competitor).flatMap((item) =>
    item.comparisonStatus === 'unknown' || item.comparableValue == null
      ? []
      : [
          {
            label: item.displayLabel,
            value: item.comparableValue,
            sellerValue: item.subjectValue,
            status: item.comparisonStatus,
          },
        ],
  );

// Trois photos au plus : une fiche de concurrent tient toujours sur une page A4 (designer, 29/10).
const MAX_COMPETITOR_PHOTOS = 3;

// Mission 127 — un Point marché, lu par LISTES DE COLONNES AUTORISÉES, cadré sur le dossier ET
// son agence : ni le titre, ni le lien, ni l'adresse d'une annonce, ni « Vendu par ». Le point lui-même
// (`summary`) est relu tel qu'il a été écrit ; seuls les photos (« Sans photo ») et la grille
// sont relues. Sert à l'écran du conseiller (RLS) et au lien public (clé de service, après le
// jeton). null : point, dossier ou agence introuvables, dossier archivé.
export async function loadMarketUpdate(
  supabase: Client,
  projectId: string,
  agencyId: string,
  updateId: string,
): Promise<MarketUpdateDocument | null> {
  const { data: update } = await supabase
    .from('project_market_updates')
    .select('id, made_at, summary, project_id')
    .eq('id', updateId)
    .eq('project_id', projectId)
    .eq('agency_id', agencyId)
    .maybeSingle();
  const summary = update ? parseMarketUpdateSummary(update.summary) : null;
  if (!update || !summary) return null;
  const { data: project } = await supabase
    .from('projects')
    .select('id, seller_name, advisor_id, status')
    .eq('id', projectId)
    .eq('agency_id', agencyId)
    .neq('status', 'archived')
    .maybeSingle();
  if (!project) return null;
  const [property, competitors, document] = await Promise.all([
    supabase
      .from('subject_properties')
      .select(
        'property_type, city, district, surface_area, rooms_count, bedrooms_count, energy_rating, ges_rating, general_condition, outdoor_spaces, parking_types, exposure, photo_urls',
      )
      .eq('project_id', projectId)
      .eq('agency_id', agencyId)
      .maybeSingle(),
    supabase
      .from('comparables')
      .select(
        'id, surface_area, rooms_count, bedrooms_count, energy_rating, ges_rating, general_condition, outdoor_spaces, parking_types, exposure, photo_urls, synthesis_hide_photo',
      )
      .eq('project_id', projectId)
      .eq('agency_id', agencyId)
      .in(
        'id',
        summary.competitors.map((item) => item.id),
      ),
    loadDocumentAgency(supabase, agencyId, project.advisor_id),
  ]);
  const prefix = propertyPhotoPrefix(agencyId, projectId);
  const coverPath = strings(property.data?.photo_urls).find((path) => path.startsWith(prefix));
  const cover = coverPath
    ? await signPropertyPhotos(supabase, [coverPath], DOCUMENT_PHOTO_URL_TTL_SECONDS)
    : [];
  const subject = property.data ? bundle(property.data) : null;
  const rowById = new Map((competitors.data ?? []).map((row) => [row.id, row]));
  return {
    updateId: update.id,
    madeAt: update.made_at,
    sellerName: project.seller_name ?? '',
    propertyLabel: property.data
      ? [propertyTypeLabel(property.data.property_type), property.data.city?.trim() || null]
          .filter(Boolean)
          .join(' · ') || null
      : null,
    commune: property.data?.city?.trim() || null,
    coverPhotoUrl: cover[0]?.url ?? null,
    // Les propositions payées (adresses d'annonces, côté conseiller) ne vont pas au document ni au
    // lien du vendeur.
    summary: {
      ...summary,
      newcomersSearch: summary.newcomersSearch
        ? { ...summary.newcomersSearch, proposed: [] }
        : null,
    },
    competitors: summary.competitors.map((item) => {
      const row = rowById.get(item.id);
      const photos = row
        ? strings(row.photo_urls).filter((url) => /^https?:\/\/|^\//.test(url))
        : [];
      const hidden = row?.synthesis_hide_photo === true;
      return {
        id: item.id,
        position: item.position,
        label: item.label,
        photoUrls: hidden ? [] : photos.slice(0, MAX_COMPETITOR_PHOTOS),
        hasPhoto: photos.length > 0,
        photoHidden: hidden,
        features: row && subject ? features(subject, bundle(row)) : [],
      };
    }),
    agency: document.agency,
    brandDeclarations: document.brandDeclarations,
  };
}
