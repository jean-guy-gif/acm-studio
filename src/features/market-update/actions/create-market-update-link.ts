'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import {
  hashMarketUpdateToken,
  marketUpdatePath,
  newMarketUpdateToken,
} from '@/features/market-update/services/market-update-token';
import { getProfile } from '@/lib/auth/get-profile';
import { siteUrl } from '@/lib/site-url';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export type CreateMarketUpdateLinkResult =
  { ok: true; url: string; linkId: string; expiresAt: string } | { ok: false; error: string };

const FAILURE = 'Le lien n’a pas pu être créé. Réessayez.';

// Mission 127 — un lien vers un Point marché, à envoyer au vendeur : 30 jours, jamais indexé, le
// jeton montré une fois ; la base n'en garde que le condensat (modèle de la synthèse, M110).
// « Créer un nouveau lien » remplace les liens précédents du point, qui cessent de marcher ; si
// l'ancien ne se retire pas, le nouveau est retiré et rien ne change (M122 B).
export async function createMarketUpdateLink(
  projectId: string,
  updateId: string,
): Promise<CreateMarketUpdateLinkResult> {
  const profile = await getProfile();
  if (
    !profile ||
    profile.removed_at ||
    !z.uuid().safeParse(projectId).success ||
    !z.uuid().safeParse(updateId).success
  ) {
    return { ok: false, error: FAILURE };
  }
  const supabase = await createClient();
  const { data: update } = await supabase
    .from('project_market_updates')
    .select('id')
    .eq('id', updateId)
    .eq('project_id', projectId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  if (!update) return { ok: false, error: FAILURE };
  const token = newMarketUpdateToken();
  const { data, error } = await createServiceRoleClient()
    .from('project_market_update_links')
    .insert({
      agency_id: profile.agency_id,
      project_id: projectId,
      update_id: updateId,
      created_by: profile.id,
      token_hash: hashMarketUpdateToken(token),
    })
    .select('id, expires_at')
    .single();
  if (error || !data) return { ok: false, error: FAILURE };
  const { error: removal } = await createServiceRoleClient()
    .from('project_market_update_links')
    .delete()
    .eq('update_id', updateId)
    .eq('agency_id', profile.agency_id)
    .neq('id', data.id);
  if (removal) {
    await createServiceRoleClient().from('project_market_update_links').delete().eq('id', data.id);
    return { ok: false, error: FAILURE };
  }
  revalidatePath(`/builder/${projectId}/point-marche`);
  return {
    ok: true,
    url: `${siteUrl()}${marketUpdatePath(token)}`,
    linkId: data.id,
    expiresAt: data.expires_at,
  };
}
