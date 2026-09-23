import 'server-only';

import type { AgencyBranding } from '@/features/branding/types';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

const BUCKET = 'agency-branding';

// La charte de l'agence de l'appelant (RLS cadré sur l'agence), ou null si aucune. Les
// chemins de logo (Storage) sont résolus en URL publiques prêtes à afficher.
export async function getAgencyBranding(): Promise<AgencyBranding | null> {
  const profile = await getProfile();
  if (!profile) {
    return null;
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from('agency_branding')
    .select(
      'brand, brand_deep, brand_soft, brand_darker, brand_darkest, on_brand_text, text_contrast_adjusted, logo_light_path, logo_dark_path, validated_at',
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
    validatedAt: data.validated_at,
  };
}
