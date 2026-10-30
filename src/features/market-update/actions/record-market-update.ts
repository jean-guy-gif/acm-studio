'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import type { MarketUpdateSummary } from '@/features/market-update/services/market-update-summary';
import { writeMarketUpdate } from '@/features/market-update/services/write-market-update';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export type RecordMarketUpdateResult =
  | { ok: true; updateId: string; madeAt: string; line: string; summary: MarketUpdateSummary }
  | { ok: false; error: string };

const MARKET_UPDATE_FAILURE = 'Le point n’a pas pu être enregistré. Réessayez.';

// Mission 127 — à la fin de « Mettre à jour les concurrents » (après la relecture, M105), le point
// daté : ce que chaque concurrent est devenu depuis le rendez-vous, et les trois lignes de prix.
// Un membre non retiré de l'agence, sur un dossier conclu de son agence. Le serveur relit tout en
// base (colonnes autorisées seulement) et écrit par la clé de service : le navigateur n'écrit
// jamais un point ; ce qui a été relu se relit en base (une observation du jour), jamais reçu.
// Mission 127 B — le point du jour se réécrit (une retenue de nouveau venu le met à jour).
export async function recordMarketUpdate(
  projectId: string,
  options: { settledProposalUrl?: string } = {},
): Promise<RecordMarketUpdateResult> {
  const profile = await getProfile();
  if (!profile || profile.removed_at || !z.uuid().safeParse(projectId).success) {
    return { ok: false, error: MARKET_UPDATE_FAILURE };
  }
  const settled = z.string().max(2000).optional().safeParse(options.settledProposalUrl);
  if (!settled.success) return { ok: false, error: MARKET_UPDATE_FAILURE };
  const supabase = await createClient();
  const agencyId = profile.agency_id;
  const { data: project } = await supabase
    .from('projects')
    .select('id, status')
    .eq('id', projectId)
    .eq('agency_id', agencyId)
    .maybeSingle();
  if (!project || project.status !== 'meeting_completed') {
    return { ok: false, error: MARKET_UPDATE_FAILURE };
  }
  const written = await writeMarketUpdate({
    supabase,
    service: createServiceRoleClient(),
    agencyId,
    projectId,
    profileId: profile.id,
    settledProposalUrl: settled.data ?? null,
  });
  if (!written) return { ok: false, error: MARKET_UPDATE_FAILURE };
  revalidatePath('/suivi');
  revalidatePath(`/builder/${projectId}/point-marche`);
  return { ok: true, ...written };
}
