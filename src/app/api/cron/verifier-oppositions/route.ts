import { fetchCommunes } from '@/features/competitor-search/services/fetch-geo';
import { manualCommuneLookupName } from '@/features/prospecting/services/manual-opposition';
import {
  isCronAuthorized,
  recheckDecision,
} from '@/features/prospecting/services/opposition-recheck';
import { reportServerError } from '@/lib/app-errors/report-server-error';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export const dynamic = 'force-dynamic';

// Mission 105 — chaque nuit (vercel.json, 3 h 37 UTC, après la purge de la M100), les oppositions
// inscrites à la main pendant une panne du service des communes sont revérifiées. Seuls les deux
// repères changent ; ni la clé, ni la date, ni l'existence de l'opposition.
export async function GET(request: Request): Promise<Response> {
  if (!isCronAuthorized(request.headers.get('authorization'), process.env.CRON_SECRET)) {
    return new Response('Non autorisé', { status: 401 });
  }
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from('prospecting_oppositions')
    .select('id, commune_typed')
    .eq('commune_unverified', true)
    .not('commune_typed', 'is', null)
    .limit(200);
  if (error) {
    await reportServerError('verifierOppositions', error);
    return Response.json({ ok: false }, { status: 500 });
  }
  const counts = { verified: 0, unknown: 0, retry: 0 };
  for (const row of data ?? []) {
    const typed = row.commune_typed ?? '';
    const found = await fetchCommunes({ name: manualCommuneLookupName(typed) });
    const decision = recheckDecision(typed, found);
    counts[decision] += 1;
    if (decision === 'retry') continue;
    const { error: updateError } = await admin
      .from('prospecting_oppositions')
      .update(
        decision === 'verified'
          ? {
              commune_unverified: false,
              commune_unknown: false,
              commune_checked_at: new Date().toISOString(),
            }
          : { commune_unknown: true, commune_checked_at: new Date().toISOString() },
      )
      .eq('id', row.id);
    if (updateError) await reportServerError('verifierOppositions', updateError);
  }
  return Response.json({ ok: true, ...counts });
}
