'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { marketStudyAdvisorPath } from '@/features/market-study/services/market-study-link';
import { getProfile } from '@/lib/auth/get-profile';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export type RemoveMarketStudyLinkResult = { ok: true } | { ok: false; error: string };

const FAILURE = 'Le lien n’a pas pu être retiré.';

// Mission 131 — « Retirer le lien » de l'Étude de marché : inutilisable tout de suite (M110).
export async function removeMarketStudyLink(
  projectId: string,
  linkId: string,
): Promise<RemoveMarketStudyLinkResult> {
  const profile = await getProfile();
  if (
    !profile ||
    profile.removed_at ||
    !z.uuid().safeParse(projectId).success ||
    !z.uuid().safeParse(linkId).success
  ) {
    return { ok: false, error: FAILURE };
  }
  const { data, error } = await createServiceRoleClient()
    .from('market_study_links')
    .delete()
    .eq('id', linkId)
    .eq('project_id', projectId)
    .eq('agency_id', profile.agency_id)
    .select('id');
  if (error || !data || data.length === 0) return { ok: false, error: FAILURE };
  revalidatePath(marketStudyAdvisorPath(projectId));
  return { ok: true };
}
