import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { brandingCssVariables } from '@/features/branding/services/branding-css';
import { brandingFontDeclarations } from '@/features/branding/services/branding-typography';
import { buildQrCode } from '@/features/contact-card/services/qr-code';
import { buildVCard } from '@/features/contact-card/services/vcard';
import type { SellerSynthesis } from '@/features/seller-synthesis/types';
import { signPropertyPhotos } from '@/features/subject-property-photos/services/property-photo-storage';
import type { Database } from '@/lib/supabase/database.types';

type Client = SupabaseClient<Database>;

const BRANDING_BUCKET = 'agency-branding';
// Mission 113 — la photo du conseiller est signée à chaque ouverture de la page (M37) ; une heure
// suffit à lire et imprimer le document.
export const DOCUMENT_PHOTO_URL_TTL_SECONDS = 60 * 60;

export type DocumentAgency = {
  agency: SellerSynthesis['agency'];
  brandDeclarations: string;
};

// Mission 110, partagé par la mission 127 — le bloc « agence et conseiller » des documents remis
// au vendeur (synthèse, Point marché) : nom sur les documents, logo, mentions (M102), le
// conseiller du dossier (nom, téléphone, e-mail, photo signée, QR de sa carte de contact, M84) et
// la charte validée (M55, M57), filtrée en déclarations CSS sûres.
export async function loadDocumentAgency(
  supabase: Client,
  agencyId: string,
  advisorId: string | null,
): Promise<DocumentAgency> {
  const [agency, branding, advisor] = await Promise.all([
    supabase.from('agencies').select('name').eq('id', agencyId).maybeSingle(),
    supabase
      .from('agency_branding')
      .select(
        'brand, brand_deep, brand_soft, brand_darker, brand_darkest, on_brand_text, font_family, validated_at, logo_light_path, postal_address, professional_card, professional_card_issuer, financial_guarantee, document_name',
      )
      .eq('agency_id', agencyId)
      .maybeSingle(),
    advisorId
      ? supabase
          .from('profiles')
          .select('first_name, last_name, phone, email, photo_path')
          .eq('id', advisorId)
          .eq('agency_id', agencyId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  const advisorPhotoPath = advisor.data?.photo_path?.startsWith(`${agencyId}/`)
    ? advisor.data.photo_path
    : null;
  const advisorPhoto = advisorPhotoPath
    ? await signPropertyPhotos(supabase, [advisorPhotoPath], DOCUMENT_PHOTO_URL_TTL_SECONDS)
    : [];
  const brand = branding.data;
  const agencyName = brand?.document_name?.trim() || agency.data?.name || '';
  const advisorName =
    [advisor.data?.first_name, advisor.data?.last_name].filter(Boolean).join(' ').trim() || null;
  const logoPath = brand?.logo_light_path ?? null;
  return {
    agency: {
      name: agencyName,
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
  };
}
