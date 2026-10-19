'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { loadSellerSynthesis } from '@/features/seller-synthesis/queries/load-seller-synthesis';
import {
  hashSynthesisToken,
  newSynthesisToken,
  synthesisPath,
} from '@/features/seller-synthesis/services/synthesis-token';
import { getProfile } from '@/lib/auth/get-profile';
import { siteUrl } from '@/lib/site-url';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export type CreateSynthesisLinkResult =
  { ok: true; url: string; linkId: string; expiresAt: string } | { ok: false; error: string };

const FAILURE = 'Le lien n’a pas pu être créé. Réessayez.';

// Mission 110 — un lien vers la synthèse, à envoyer au vendeur : valable 30 jours, jamais indexé.
// Un membre non retiré de l'agence, sur un dossier de son agence dont le Live a été mené. Le jeton
// n'est montré qu'ici, une fois ; la base n'en garde que le condensat.
export async function createSynthesisLink(projectId: string): Promise<CreateSynthesisLinkResult> {
  const profile = await getProfile();
  if (!profile || profile.removed_at || !z.uuid().safeParse(projectId).success) {
    return { ok: false, error: FAILURE };
  }
  const synthesis = await loadSellerSynthesis(await createClient(), projectId, profile.agency_id);
  if (!synthesis) {
    return { ok: false, error: 'Pas de synthèse sans Live mené avec le vendeur.' };
  }
  const token = newSynthesisToken();
  const { data, error } = await createServiceRoleClient()
    .from('seller_synthesis_links')
    .insert({
      agency_id: profile.agency_id,
      project_id: projectId,
      created_by: profile.id,
      token_hash: hashSynthesisToken(token),
    })
    .select('id, expires_at')
    .single();
  if (error || !data) {
    return { ok: false, error: FAILURE };
  }
  revalidatePath(`/builder/${projectId}/synthese`);
  return {
    ok: true,
    url: `${siteUrl()}${synthesisPath(token)}`,
    linkId: data.id,
    expiresAt: data.expires_at,
  };
}
