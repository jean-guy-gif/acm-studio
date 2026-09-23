'use server';

import { revalidatePath } from 'next/cache';

import { derivePalette, isValidHex } from '@/features/branding/services/palette';
import { getProfile } from '@/lib/auth/get-profile';
import type { Database } from '@/lib/supabase/database.types';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

type ServiceClient = ReturnType<typeof createServiceRoleClient>;

export type SaveBrandingResult = { ok: true } | { ok: false; error: string };

type BrandingInsert = Database['public']['Tables']['agency_branding']['Insert'];

const BUCKET = 'agency-branding';
const ACCEPTED = new Map<string, string>([
  ['image/svg+xml', 'svg'],
  ['image/png', 'png'],
  ['image/jpeg', 'jpg'],
  ['image/webp', 'webp'],
]);

// Dépose un logo dans le bucket (client utilisateur → RLS : 1er segment = agency_id). Écrase
// la version précédente (chemin stable). Retourne le chemin, ou null si aucun fichier.
async function uploadLogo(
  supabase: ServiceClient,
  agencyId: string,
  variant: 'light' | 'dark',
  file: File | null,
): Promise<{ ok: true; path: string | null } | { ok: false; error: string }> {
  if (!file || file.size === 0) {
    return { ok: true, path: null };
  }
  const ext = ACCEPTED.get(file.type);
  if (!ext) {
    return { ok: false, error: 'Logo : formats acceptés SVG, PNG, WebP, JPEG.' };
  }
  const path = `${agencyId}/logo-${variant}.${ext}`;
  // On téléverse les OCTETS (Uint8Array), pas l'objet File : plus fiable côté serveur.
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { upsert: true, contentType: file.type });
  if (error) {
    return { ok: false, error: 'Le dépôt du logo a échoué. Réessayez.' };
  }
  return { ok: true, path };
}

// Mission 55 jalon 1 — la charte, validée sur aperçu. Le navigateur ne fournit que la
// couleur PRIMAIRE et les fichiers de logo ; la palette est RE-DÉRIVÉE côté serveur (jamais
// on ne fait confiance à une palette venue du client), chaque couleur reste un #RRGGBB.
export async function saveBranding(formData: FormData): Promise<SaveBrandingResult> {
  const profile = await getProfile();
  if (!profile) {
    return { ok: false, error: 'Vous devez être connecté.' };
  }
  const agencyId = profile.agency_id;

  const rawPrimary = formData.get('primary_color');
  const primary = typeof rawPrimary === 'string' ? rawPrimary.trim().toLowerCase() : '';
  if (!isValidHex(primary)) {
    return { ok: false, error: 'Choisissez une couleur de marque valide (#RRGGBB).' };
  }
  const palette = derivePalette(primary);

  // Écritures via le client SERVICE ROLE, APRÈS authentification : le chemin est imposé par
  // le serveur (agency_id de l'appelant), jamais fourni par le navigateur. La RLS du bucket
  // reste en défense pour tout accès direct.
  const serviceClient = createServiceRoleClient();
  const light = await uploadLogo(
    serviceClient,
    agencyId,
    'light',
    formData.get('logo_light') as File | null,
  );
  if (!light.ok) {
    return light;
  }
  const dark = await uploadLogo(
    serviceClient,
    agencyId,
    'dark',
    formData.get('logo_dark') as File | null,
  );
  if (!dark.ok) {
    return dark;
  }

  const now = new Date().toISOString();
  const row: BrandingInsert = {
    agency_id: agencyId,
    brand: palette.brand,
    brand_deep: palette.brandDeep,
    brand_soft: palette.brandSoft,
    brand_darker: palette.brandDarker,
    brand_darkest: palette.brandDarkest,
    on_brand_text: palette.onBrandText,
    text_contrast_adjusted: palette.textContrastAdjusted,
    validated_at: now,
    updated_at: now,
    // Ne pas écraser un chemin de logo existant avec null si aucun fichier n'a été redéposé.
    ...(light.path ? { logo_light_path: light.path } : {}),
    ...(dark.path ? { logo_dark_path: dark.path } : {}),
  };

  const { error } = await serviceClient
    .from('agency_branding')
    .upsert(row, { onConflict: 'agency_id' });
  if (error) {
    return { ok: false, error: 'L’enregistrement de la charte a échoué. Réessayez.' };
  }

  // La charte s'applique à tout l'outil : on rafraîchit tout.
  revalidatePath('/', 'layout');
  return { ok: true };
}
