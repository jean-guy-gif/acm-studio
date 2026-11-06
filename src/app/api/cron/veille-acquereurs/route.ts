import {
  runAgencyWatch,
  type AgencyWatchReport,
} from '@/features/buyer-watch/server/run-buyer-watch';
import {
  agenciesInWatchOrder,
  releaseStaleWatchRuns,
} from '@/features/buyer-watch/server/watch-housekeeping';
import { streamEstateApiKey } from '@/features/competitor-search/services/stream-estate-config';
import { isCronAuthorized } from '@/features/prospecting/services/opposition-recheck';
import { reportServerError } from '@/lib/app-errors/report-server-error';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export const dynamic = 'force-dynamic';
// Une recherche de veille tient en quelques secondes, 20 s au pire (deux lectures de 10 s) ; passé
// 30 s, plus rien n'est réservé : la recherche lancée a toujours le temps d'être réglée.
export const maxDuration = 60;
const BUDGET_MS = 30_000;

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
  // Les passages coupés (plus d'une heure « en cours ») : échoués, réservation rendue.
  const released = await releaseStaleWatchRuns(admin, now);
  // La moins récemment servie d'abord : aucune agence ne prend toute la nuit.
  const order = await agenciesInWatchOrder(
    admin,
    (data ?? []).map((agency) => agency.id),
  );
  if (order == null) {
    await reportServerError('buyerWatch', new Error('ordre des agences illisible'));
    return Response.json({ ok: false }, { status: 500 });
  }
  const reports: AgencyWatchReport[] = [];
  for (const agencyId of order) {
    if (Date.now() > deadline) break;
    reports.push(await runAgencyWatch(admin, agencyId, now, deadline));
  }
  return Response.json({ ok: true, released, agencies: reports });
}
