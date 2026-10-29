'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { getProfile } from '@/lib/auth/get-profile';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export type RemoveMarketUpdateLinkResult = { ok: true } | { ok: false; error: string };

const FAILURE = 'Le lien n’a pas pu être retiré.';

// Mission 127 — « Retirer le lien » d'un Point marché : inutilisable tout de suite (M110).
export async function removeMarketUpdateLink(
  projectId: string,
  linkId: string,
): Promise<RemoveMarketUpdateLinkResult> {
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
    .from('project_market_update_links')
    .delete()
    .eq('id', linkId)
    .eq('project_id', projectId)
    .eq('agency_id', profile.agency_id)
    .select('id');
  if (error || !data || data.length === 0) return { ok: false, error: FAILURE };
  revalidatePath(`/builder/${projectId}/point-marche`);
  return { ok: true };
}
