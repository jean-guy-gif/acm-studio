import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { brandingCssVariables } from '@/features/branding/services/branding-css';
import { brandingFontDeclarations } from '@/features/branding/services/branding-typography';
import { buildQrCode } from '@/features/contact-card/services/qr-code';
import { buildVCard } from '@/features/contact-card/services/vcard';
import { buildSellerSynthesis } from '@/features/seller-synthesis/services/build-seller-synthesis';
import type { SellerSynthesis } from '@/features/seller-synthesis/types';
import {
  propertyPhotoPrefix,
  signPropertyPhotos,
} from '@/features/subject-property-photos/services/property-photo-storage';
import type { Database } from '@/lib/supabase/database.types';

type Client = SupabaseClient<Database>;

const BRANDING_BUCKET = 'agency-branding';
// Mission 113 — les photos du bien vendeur et celle du conseiller sont signées à chaque ouverture
// de la page (M37) ; une heure suffit à lire et imprimer le document.
const PHOTO_URL_TTL_SECONDS = 60 * 60;

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

// Mission 110 — les lignes de la synthèse au vendeur, lues par LISTES DE COLONNES AUTORISÉES,
// cadrées sur le dossier ET son agence. Ni `title`, ni `listing_url`, ni adresse, ni « Vendu
// par », ni la fourchette ou les points de vigilance du conseiller ne sont lus : ils ne peuvent
// pas en sortir. Sert à l'écran du conseiller (son client, RLS) et à la page publique du lien
// (clé de service, après vérification du jeton). null : dossier introuvable, archivé, ou Live
// jamais mené.
export async function loadSellerSynthesis(
  supabase: Client,
  projectId: string,
  agencyId: string,
): Promise<SellerSynthesis | null> {
  const { data: project } = await supabase
    .from('projects')
    .select('id, seller_name, advisor_id, status, live_started_at')
    .eq('id', projectId)
    .eq('agency_id', agencyId)
    .neq('status', 'archived')
    .maybeSingle();
  if (!project) {
    return null;
  }
  const [
    property,
    competitors,
    responses,
    summary,
    decision,
    conclusion,
    agency,
    branding,
    advisor,
  ] = await Promise.all([
    supabase
      .from('subject_properties')
      .select(
        'property_type, city, district, surface_area, land_area, rooms_count, bedrooms_count, floor, building_floors, energy_rating, ges_rating, general_condition, outdoor_spaces, parking_types, exposure, strengths, photo_urls',
      )
      .eq('project_id', projectId)
      .eq('agency_id', agencyId)
      .maybeSingle(),
    supabase
      .from('comparables')
      .select(
        'id, price, property_type, rooms_count, bedrooms_count, surface_area, city, district, is_selected, excluded_from_live, display_order, created_at, energy_rating, ges_rating, general_condition, outdoor_spaces, parking_types, exposure, photo_urls, price_drop_amount, price_drop_percentage, days_on_market, listing_published_at, synthesis_hide_photo',
      )
      .eq('project_id', projectId)
      .eq('agency_id', agencyId)
      .eq('is_selected', true),
    supabase
      .from('live_seller_responses')
      .select(
        'comparable_id, seller_estimated_listing_price, seller_serious_competitor, revealed_listing_price, seller_estimated_days_on_market',
      )
      .eq('project_id', projectId)
      .eq('agency_id', agencyId),
    supabase
      .from('live_seller_summary')
      .select(
        'seller_perceived_property_price, seller_revised_property_price, seller_most_dangerous_comparable_id, seller_most_dangerous_reason',
      )
      .eq('project_id', projectId)
      .eq('agency_id', agencyId)
      .maybeSingle(),
    supabase
      .from('project_price_positionings')
      .select(
        'advisor_price, advisor_comparative_market_price, justification, range_central, calculation_snapshot',
      )
      .eq('project_id', projectId)
      .eq('agency_id', agencyId)
      .maybeSingle(),
    supabase
      .from('project_meeting_conclusions')
      .select(
        'commercialization_price, concluded_at, outcome, frozen_advisor_price, frozen_advisor_analysis, frozen_market_computed',
      )
      .eq('project_id', projectId)
      .eq('agency_id', agencyId)
      .maybeSingle(),
    supabase.from('agencies').select('name, is_demo').eq('id', agencyId).maybeSingle(),
    supabase
      .from('agency_branding')
      .select(
        'brand, brand_deep, brand_soft, brand_darker, brand_darkest, on_brand_text, font_family, validated_at, logo_light_path, postal_address, professional_card, professional_card_issuer, financial_guarantee, document_name',
      )
      .eq('agency_id', agencyId)
      .maybeSingle(),
    project.advisor_id
      ? supabase
          .from('profiles')
          .select('first_name, last_name, phone, email, photo_path')
          .eq('id', project.advisor_id)
          .eq('agency_id', agencyId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  // Sans réponse du vendeur, il n'y a pas eu de Live : pas de synthèse.
  if (summary.data == null && (responses.data ?? []).length === 0) {
    return null;
  }

  // Les photos du bien vendeur : des chemins du stockage privé de CE dossier, signés ici.
  const prefix = propertyPhotoPrefix(agencyId, projectId);
  const propertyPaths = strings(property.data?.photo_urls).filter((path) =>
    path.startsWith(prefix),
  );
  const advisorPhotoPath = advisor.data?.photo_path?.startsWith(`${agencyId}/`)
    ? advisor.data.photo_path
    : null;
  const [propertyPhotos, advisorPhoto] = await Promise.all([
    signPropertyPhotos(supabase, propertyPaths.slice(0, 3), PHOTO_URL_TTL_SECONDS),
    advisorPhotoPath
      ? signPropertyPhotos(supabase, [advisorPhotoPath], PHOTO_URL_TTL_SECONDS)
      : Promise.resolve([]),
  ]);

  const brand = branding.data;
  const agencyName = brand?.document_name?.trim() || agency.data?.name || '';
  const advisorName =
    [advisor.data?.first_name, advisor.data?.last_name].filter(Boolean).join(' ').trim() || null;
  const logoPath = brand?.logo_light_path ?? null;
  const concluded = project.status === 'meeting_completed' && conclusion.data?.outcome != null;

  return buildSellerSynthesis({
    sellerName: project.seller_name,
    meetingDate: conclusion.data?.concluded_at ?? project.live_started_at ?? null,
    liveStartedAt: project.live_started_at,
    property: property.data ?? null,
    propertyPhotoUrls: propertyPhotos
      .map((photo) => photo.url)
      .filter((url): url is string => url != null),
    competitors: competitors.data ?? [],
    responses: responses.data ?? [],
    summary: summary.data ?? null,
    decision: decision.data ?? null,
    // Mission 111 — conclu : les montants figés à la conclusion.
    frozen: concluded
      ? {
          advisor_price: conclusion.data!.frozen_advisor_price,
          advisor_analysis: conclusion.data!.frozen_advisor_analysis,
          market_computed: conclusion.data!.frozen_market_computed,
        }
      : null,
    commercializationPrice: conclusion.data?.commercialization_price ?? null,
    agency: {
      name: agencyName,
      isDemo: agency.data?.is_demo === true,
      logoUrl: logoPath
        ? supabase.storage.from(BRANDING_BUCKET).getPublicUrl(logoPath).data.publicUrl
        : null,
      postalAddress: brand?.postal_address ?? null,
      professionalCard: brand?.professional_card ?? null,
      professionalCardIssuer: brand?.professional_card_issuer ?? null,
      financialGuarantee: brand?.financial_guarantee ?? null,
      advisorName,
      advisorPhone: advisor.data?.phone ?? null,
      advisorEmail: advisor.data?.email ?? null,
      advisorPhotoUrl: advisorPhoto[0]?.url ?? null,
      advisorQr:
        advisor.data?.email && advisorName
          ? buildQrCode(
              buildVCard({
                firstName: advisor.data.first_name ?? '',
                lastName: advisor.data.last_name ?? '',
                agencyName,
                phone: advisor.data.phone ?? null,
                email: advisor.data.email,
              }),
            )
          : null,
    },
    // Mission 55 — la charte VALIDÉE de l'agence, filtrée (#RRGGBB, police embarquée connue).
    brandDeclarations: brand?.validated_at
      ? `${brandingCssVariables({
          brand: brand.brand,
          brandDeep: brand.brand_deep,
          brandSoft: brand.brand_soft,
          brandDarker: brand.brand_darker,
          brandDarkest: brand.brand_darkest,
          onBrandText: brand.on_brand_text,
        })} ${brandingFontDeclarations(brand.font_family)}`.trim()
      : '',
  });
}
