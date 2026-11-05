'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import {
  hashMarketStudyToken,
  marketStudyAdvisorPath,
  marketStudyPath,
  newMarketStudyToken,
} from '@/features/market-study/services/market-study-link';
import { getProfile } from '@/lib/auth/get-profile';
import { siteUrl } from '@/lib/site-url';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export type CreateMarketStudyLinkResult =
  { ok: true; url: string; linkId: string; expiresAt: string } | { ok: false; error: string };

const FAILURE = 'Le lien n’a pas pu être créé. Réessayez.';

// Mission 131 — un lien vers l'Étude de marché, à envoyer au vendeur : 30 jours, jamais indexé, le
// jeton montré une fois ; la base n'en garde que le condensat (modèle du Point marché, M127).
// « Créer un nouveau lien » remplace les liens précédents du dossier, qui cessent de marcher ; si
// l'ancien ne se retire pas, le nouveau est retiré et rien ne change (M122 B).
export async function createMarketStudyLink(
  projectId: string,
): Promise<CreateMarketStudyLinkResult> {
  const profile = await getProfile();
  if (!profile || profile.removed_at || !z.uuid().safeParse(projectId).success) {
    return { ok: false, error: FAILURE };
  }
  const supabase = await createClient();
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('agency_id', profile.agency_id)
    .neq('status', 'archived')
    .maybeSingle();
  if (!project) return { ok: false, error: FAILURE };
  const token = newMarketStudyToken();
  const { data, error } = await createServiceRoleClient()
    .from('market_study_links')
    .insert({
      agency_id: profile.agency_id,
      project_id: projectId,
      created_by: profile.id,
      token_hash: hashMarketStudyToken(token),
    })
    .select('id, expires_at')
    .single();
  if (error || !data) return { ok: false, error: FAILURE };
  const { error: removal } = await createServiceRoleClient()
    .from('market_study_links')
    .delete()
    .eq('project_id', projectId)
    .eq('agency_id', profile.agency_id)
    .neq('id', data.id);
  if (removal) {
    await createServiceRoleClient().from('market_study_links').delete().eq('id', data.id);
    return { ok: false, error: FAILURE };
  }
  revalidatePath(marketStudyAdvisorPath(projectId));
  return {
    ok: true,
    url: `${siteUrl()}${marketStudyPath(token)}`,
    linkId: data.id,
    expiresAt: data.expires_at,
  };
}
