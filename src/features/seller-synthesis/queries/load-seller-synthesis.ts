import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { buildSellerSynthesis } from '@/features/seller-synthesis/services/build-seller-synthesis';
import type { SellerSynthesis } from '@/features/seller-synthesis/types';
import type { Database } from '@/lib/supabase/database.types';

type Client = SupabaseClient<Database>;

const BRANDING_BUCKET = 'agency-branding';

// Mission 110 — les lignes de la synthèse au vendeur, lues par LISTES DE COLONNES AUTORISÉES,
// cadrées sur le dossier ET son agence. Ni `title`, ni `listing_url`, ni adresse, ni « Vendu
// par » ne sont lus : ils ne peuvent pas en sortir. Sert à l'écran du conseiller (son client,
// RLS) et à la page publique du lien (clé de service, après vérification du jeton).
// null : dossier introuvable, archivé, ou Live jamais mené.
export async function loadSellerSynthesis(
  supabase: Client,
  projectId: string,
  agencyId: string,
): Promise<SellerSynthesis | null> {
  const { data: project } = await supabase
    .from('projects')
    .select('id, seller_name, advisor_id, status')
    .eq('id', projectId)
    .eq('agency_id', agencyId)
    .neq('status', 'archived')
    .maybeSingle();
  if (!project) {
    return null;
  }
  const [competitors, responses, summary, decision, conclusion, agency, branding, advisor] =
    await Promise.all([
      supabase
        .from('comparables')
        .select('id, price, property_type, rooms_count, surface_area, city, district, is_selected')
        .eq('project_id', projectId)
        .eq('agency_id', agencyId)
        .eq('is_selected', true),
      supabase
        .from('live_seller_responses')
        .select(
          'comparable_id, seller_estimated_listing_price, seller_serious_competitor, revealed_listing_price',
        )
        .eq('project_id', projectId)
        .eq('agency_id', agencyId),
      supabase
        .from('live_seller_summary')
        .select('seller_perceived_property_price, seller_revised_property_price')
        .eq('project_id', projectId)
        .eq('agency_id', agencyId)
        .maybeSingle(),
      supabase
        .from('project_price_positionings')
        .select('advisor_price, advisor_comparative_market_price, justification')
        .eq('project_id', projectId)
        .eq('agency_id', agencyId)
        .maybeSingle(),
      supabase
        .from('project_meeting_conclusions')
        .select(
          'commercialization_price, concluded_at, outcome, frozen_advisor_price, frozen_advisor_analysis',
        )
        .eq('project_id', projectId)
        .eq('agency_id', agencyId)
        .maybeSingle(),
      supabase.from('agencies').select('name').eq('id', agencyId).maybeSingle(),
      supabase
        .from('agency_branding')
        .select(
          'logo_light_path, postal_address, professional_card, professional_card_issuer, financial_guarantee, document_name',
        )
        .eq('agency_id', agencyId)
        .maybeSingle(),
      project.advisor_id
        ? supabase
            .from('profiles')
            .select('first_name, last_name, phone, email')
            .eq('id', project.advisor_id)
            .eq('agency_id', agencyId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);
  // Sans réponse du vendeur, il n'y a pas eu de Live : pas de synthèse.
  if (summary.data == null && (responses.data ?? []).length === 0) {
    return null;
  }
  const logoPath = branding.data?.logo_light_path ?? null;
  return buildSellerSynthesis({
    sellerName: project.seller_name,
    concludedAt: conclusion.data?.concluded_at ?? null,
    competitors: competitors.data ?? [],
    responses: responses.data ?? [],
    summary: summary.data ?? null,
    decision: decision.data ?? null,
    // Mission 111 — conclu : les montants figés à la conclusion.
    frozen:
      project.status === 'meeting_completed' && conclusion.data?.outcome != null
        ? {
            advisor_price: conclusion.data.frozen_advisor_price,
            advisor_analysis: conclusion.data.frozen_advisor_analysis,
          }
        : null,
    commercializationPrice: conclusion.data?.commercialization_price ?? null,
    agency: {
      name: branding.data?.document_name?.trim() || agency.data?.name || '',
      logoUrl: logoPath
        ? supabase.storage.from(BRANDING_BUCKET).getPublicUrl(logoPath).data.publicUrl
        : null,
      postalAddress: branding.data?.postal_address ?? null,
      professionalCard: branding.data?.professional_card ?? null,
      professionalCardIssuer: branding.data?.professional_card_issuer ?? null,
      financialGuarantee: branding.data?.financial_guarantee ?? null,
      advisorName:
        [advisor.data?.first_name, advisor.data?.last_name].filter(Boolean).join(' ').trim() ||
        null,
      advisorPhone: advisor.data?.phone ?? null,
      advisorEmail: advisor.data?.email ?? null,
    },
  });
}
