import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import {
  hashMarketStudyToken,
  MARKET_STUDY_TOKEN_PATTERN,
} from '@/features/market-study/services/market-study-link';
import type { Database } from '@/lib/supabase/database.types';

// Mission 131 — le lien public de l'Étude de marché, relu à chaque ouverture : la forme exacte du
// jeton, son condensat, ses 30 jours. Rend le dossier et l'agence du lien, rien d'autre ; null pour
// un jeton mal formé, inconnu, retiré ou expiré.
export async function findMarketStudyLink(
  admin: SupabaseClient<Database>,
  token: string,
  now: Date = new Date(),
): Promise<{ projectId: string; agencyId: string } | null> {
  if (!MARKET_STUDY_TOKEN_PATTERN.test(token)) return null;
  const { data } = await admin
    .from('market_study_links')
    .select('project_id, agency_id')
    .eq('token_hash', hashMarketStudyToken(token))
    .gt('expires_at', now.toISOString())
    .maybeSingle();
  return data ? { projectId: data.project_id, agencyId: data.agency_id } : null;
}
