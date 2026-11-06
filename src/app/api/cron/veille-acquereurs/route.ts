import {
  runAgencyWatch,
  type AgencyWatchReport,
} from '@/features/buyer-watch/server/run-buyer-watch';
import { streamEstateApiKey } from '@/features/competitor-search/services/stream-estate-config';
import { isCronAuthorized } from '@/features/prospecting/services/opposition-recheck';
import { reportServerError } from '@/lib/app-errors/report-server-error';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export const dynamic = 'force-dynamic';
// Une recherche de veille tient en quelques secondes ; passé 45 s, plus aucun acquéreur n'est lancé.
export const maxDuration = 60;
const BUDGET_MS = 45_000;

// Mission 136 — la veille des acquéreurs, chaque nuit (vercel.json, 2 h 17 UTC, une heure creuse) :
// pour chaque agence réelle, les acquéreurs « Prêts à visiter » dont le dernier passage date de
// 7 jours ou plus (`runAgencyWatch`). L'agence de démonstration n'est jamais cherchée : sa veille est
// semée par « Préparer ma démo » (M114, aucun appel).
export async function GET(request: Request): Promise<Response> {
  if (!isCronAuthorized(request.headers.get('authorization'), process.env.CRON_SECRET)) {
    return new Response('Non autorisé', { status: 401 });
  }
  if (streamEstateApiKey() == null) return Response.json({ ok: true, agencies: [] });
  const deadline = Date.now() + BUDGET_MS;
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from('agencies')
    .select('id')
    .eq('is_demo', false)
    .gt('buyer_watch_cap_cents', 0);
  if (error) {
    await reportServerError('buyerWatch', error);
    return Response.json({ ok: false }, { status: 500 });
  }
  const now = new Date();
  const reports: AgencyWatchReport[] = [];
  for (const agency of data ?? []) {
    if (Date.now() > deadline) break;
    reports.push(await runAgencyWatch(admin, agency.id, now, deadline));
  }
  return Response.json({ ok: true, agencies: reports });
}
