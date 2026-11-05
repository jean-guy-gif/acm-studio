'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import {
  marketUpdateSummarySchema,
  parseMarketUpdateSummary,
} from '@/features/market-update/services/market-update-summary';
import { isPointOfDay } from '@/features/market-update/services/point-day';
import { seenBeforeMeeting } from '@/features/market-update/services/price-ranking';
import { getProfile } from '@/lib/auth/get-profile';
import type { Json } from '@/lib/supabase/database.types';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export type DesignateDangerousResult = { ok: true } | { ok: false; error: string };

const FAILURE = 'Le choix n’a pas été enregistré. Réessayez.';
const NOT_LISTED = 'Ce bien n’est plus en vente : choisissez-en un autre.';
const STALE = 'Mettez d’abord les concurrents à jour : un point déjà remis ne change plus.';

// Mission 129 — « Désigner le plus dangereux aujourd'hui », sur le Suivi d'un mandat signé, après
// une mise à jour : un bien du point du jour, encore en vente et dans le classement, nouveaux venus compris ; `null`
// revient au choix du vendeur au rendez-vous, qui ne s'efface jamais (`live_seller_summary` n'est
// pas touché). Le choix est gardé dans le `summary` du dernier point, écrit par la clé service
// après le garde ; tout ce qui vient du navigateur est relu ici.
export async function designateDangerousToday(
  projectId: unknown,
  competitorId: unknown,
): Promise<DesignateDangerousResult> {
  const profile = await getProfile();
  if (
    !profile ||
    profile.removed_at ||
    !z.uuid().safeParse(projectId).success ||
    (competitorId !== null && !z.uuid().safeParse(competitorId).success)
  ) {
    return { ok: false, error: FAILURE };
  }
  const agencyId = profile.agency_id;
  const supabase = await createClient();
  const { data: project } = await supabase
    .from('projects')
    .select('id, status')
    .eq('id', projectId as string)
    .eq('agency_id', agencyId)
    .maybeSingle();
  if (!project || project.status !== 'meeting_completed') {
    return { ok: false, error: FAILURE };
  }
  const { data: conclusion } = await supabase
    .from('project_meeting_conclusions')
    .select('outcome')
    .eq('project_id', projectId as string)
    .eq('agency_id', agencyId)
    .maybeSingle();
  if (conclusion?.outcome !== 'signed') {
    return { ok: false, error: FAILURE };
  }
  const { data: latest } = await supabase
    .from('project_market_updates')
    .select('id, made_at, summary')
    .eq('project_id', projectId as string)
    .eq('agency_id', agencyId)
    .order('made_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const summary = latest ? parseMarketUpdateSummary(latest.summary) : null;
  if (!latest || !summary) {
    return { ok: false, error: 'Mettez d’abord les concurrents à jour.' };
  }
  // Un point déjà daté se rouvre tel qu'il était (M127) : seul le point du jour se désigne.
  if (!isPointOfDay(latest.made_at)) {
    return { ok: false, error: STALE };
  }
  if (competitorId !== null) {
    const chosen = summary.competitors.find((item) => item.id === competitorId);
    if (
      !chosen ||
      chosen.conclusion != null ||
      chosen.state === 'gone' ||
      chosen.currentPrice == null ||
      seenBeforeMeeting(chosen, summary.meetingDate)
    ) {
      return { ok: false, error: NOT_LISTED };
    }
  }
  const next = marketUpdateSummarySchema.parse({
    ...summary,
    dangerousToday:
      competitorId === null
        ? null
        : { competitorId: competitorId as string, chosenAt: new Date().toISOString() },
  });
  const { data, error } = await createServiceRoleClient()
    .from('project_market_updates')
    .update({ summary: JSON.parse(JSON.stringify(next)) as Json })
    .eq('id', latest.id)
    .eq('project_id', projectId as string)
    .eq('agency_id', agencyId)
    .select('id');
  if (error || !data || data.length !== 1) {
    return { ok: false, error: FAILURE };
  }
  revalidatePath('/suivi');
  revalidatePath(`/builder/${projectId as string}/point-marche`);
  return { ok: true };
}
