import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { buildMarketStudy } from '@/features/market-study/services/build-market-study';
import type { MarketStudyDocument } from '@/features/market-study/types';
import {
  DOCUMENT_PHOTO_URL_TTL_SECONDS,
  loadDocumentAgency,
} from '@/features/seller-synthesis/queries/load-document-agency';
import {
  propertyPhotoPrefix,
  signPropertyPhotos,
} from '@/features/subject-property-photos/services/property-photo-storage';
import type { Database } from '@/lib/supabase/database.types';

type Client = SupabaseClient<Database>;

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

// Mission 131 — l'Étude de marché, lue par LISTES DE COLONNES AUTORISÉES, cadrée sur le dossier ET
// son agence : ni `title`, ni `listing_url`, ni adresse, ni « Vendu par » ou l'exclusivité, ni la
// fourchette du conseiller ne sont lus. Disponible pour tout dossier non archivé, sans attendre le
// Live. Sert à l'écran du conseiller (son client, RLS) et au lien public (clé de service, après le
// jeton). null : dossier introuvable, d'une autre agence ou archivé.
export async function loadMarketStudy(
  supabase: Client,
  projectId: string,
  agencyId: string,
  now: Date = new Date(),
): Promise<MarketStudyDocument | null> {
  const { data: project } = await supabase
    .from('projects')
    .select('id, seller_name, advisor_id, status')
    .eq('id', projectId)
    .eq('agency_id', agencyId)
    .neq('status', 'archived')
    .maybeSingle();
  if (!project) return null;
  const [property, competitors, decision, conclusion, document] = await Promise.all([
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
        'id, price, property_type, rooms_count, bedrooms_count, surface_area, city, district, display_order, created_at, energy_rating, ges_rating, general_condition, outdoor_spaces, parking_types, exposure, photo_urls, price_drop_amount, price_drop_percentage, days_on_market, listing_published_at, listing_gone_at, synthesis_hide_photo',
      )
      .eq('project_id', projectId)
      .eq('agency_id', agencyId)
      .eq('is_selected', true),
    supabase
      .from('project_price_positionings')
      .select('advisor_comparative_market_price')
      .eq('project_id', projectId)
      .eq('agency_id', agencyId)
      .maybeSingle(),
    supabase
      .from('project_meeting_conclusions')
      .select('commercialization_price')
      .eq('project_id', projectId)
      .eq('agency_id', agencyId)
      .maybeSingle(),
    loadDocumentAgency(supabase, agencyId, project.advisor_id),
  ]);
  // La couverture : la première photo du bien vendeur, un chemin du stockage privé de CE dossier,
  // signé ici (M37).
  const prefix = propertyPhotoPrefix(agencyId, projectId);
  const coverPath = strings(property.data?.photo_urls).find((path) => path.startsWith(prefix));
  const cover = coverPath
    ? await signPropertyPhotos(supabase, [coverPath], DOCUMENT_PHOTO_URL_TTL_SECONDS)
    : [];
  return buildMarketStudy({
    madeAt: now.toISOString(),
    sellerName: project.seller_name,
    property: property.data ?? null,
    coverPhotoUrl: cover[0]?.url ?? null,
    competitors: competitors.data ?? [],
    commercializationPrice: conclusion.data?.commercialization_price ?? null,
    advisorAnalysis: decision.data?.advisor_comparative_market_price ?? null,
    agency: document.agency,
    brandDeclarations: document.brandDeclarations,
  });
}
