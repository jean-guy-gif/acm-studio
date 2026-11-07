import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { clientLanguage } from '@/lib/client-language';
import { textLanguage, type TextLanguage } from '@/lib/client-texts';
import type { Database } from '@/lib/supabase/database.types';

// Mission 140 — la langue d'une page publique, pour son titre d'onglet (`generateMetadata`) : celle
// du dossier ou de la fiche que le lien désigne ; rien d'autre n'est lu. Le français quand rien ne
// répond : un titre ne fait jamais échouer la page.
type Admin = SupabaseClient<Database>;

export async function projectLanguage(
  admin: Admin,
  projectId: string | null,
): Promise<TextLanguage> {
  if (!projectId) return 'fr';
  const { data } = await admin
    .from('projects')
    .select('language')
    .eq('id', projectId)
    .maybeSingle();
  return textLanguage(clientLanguage(data?.language));
}

export async function buyerLanguage(admin: Admin, buyerId: string | null): Promise<TextLanguage> {
  if (!buyerId) return 'fr';
  const { data } = await admin.from('buyers').select('language').eq('id', buyerId).maybeSingle();
  return textLanguage(clientLanguage(data?.language));
}
