import 'server-only';

import { cache } from 'react';

import type { AgencyBranding } from '@/features/branding/types';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

const BUCKET = 'agency-branding';

// La charte de l'agence de l'appelant (RLS cadré sur l'agence), ou null si aucune. Les
// chemins de logo (Storage) sont résolus en URL publiques prêtes à afficher.
// Mission 128 B — mémorisé pour UNE requête (`cache` de React) : la mise en page et la page ne
// le lisent qu'une fois ; rien n'est gardé d'une requête à l'autre ni d'un utilisateur à l'autre.
export const getAgencyBranding = cache(async (): Promise<AgencyBranding | null> => {
  const profile = await getProfile();
  if (!profile) {
    return null;
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from('agency_branding')
    .select(
      'brand, brand_deep, brand_soft, brand_darker, brand_darkest, on_brand_text, text_contrast_adjusted, logo_light_path, logo_dark_path, font_family, site_url, postal_address, professional_card, professional_card_issuer, financial_guarantee, document_name, validated_at',
    )
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  if (!data) {
    return null;
  }

  const publicUrl = (path: string | null): string | null =>
    path ? supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl : null;

  return {
    brand: data.brand,
    brandDeep: data.brand_deep,
    brandSoft: data.brand_soft,
    brandDarker: data.brand_darker,
    brandDarkest: data.brand_darkest,
    onBrandText: data.on_brand_text,
    textContrastAdjusted: data.text_contrast_adjusted,
    logoLightUrl: publicUrl(data.logo_light_path),
    logoDarkUrl: publicUrl(data.logo_dark_path),
    fontFamily: data.font_family,
    siteUrl: data.site_url,
    postalAddress: data.postal_address,
    professionalCard: data.professional_card,
    professionalCardIssuer: data.professional_card_issuer,
    financialGuarantee: data.financial_guarantee,
    documentName: data.document_name,
    validatedAt: data.validated_at,
  };
});
