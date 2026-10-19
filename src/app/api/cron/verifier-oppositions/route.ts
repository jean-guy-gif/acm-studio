import { fetchCommunes } from '@/features/competitor-search/services/fetch-geo';
import { manualCommuneLookupName } from '@/features/prospecting/services/manual-opposition';
import { missingOppositionAddresses } from '@/features/prospecting/services/opposition-backfill';
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
// Mission 109 — et l'adresse confirmée d'une annonce opposée, si elle manque à la liste, y est
// ajoutée (rattrapage d'un ajout qui a échoué au moment de la confirmation).
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
  const backfilled = await backfillOppositionAddresses(admin);
  return Response.json({ ok: true, ...counts, backfilled });
}

const PAGE = 1000;

// Une table entière, page par page (la base ne rend pas plus de 1 000 lignes par lecture).
async function readAll<T>(
  read: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[] | null> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await read(from, from + PAGE - 1);
    if (error || !data) {
      await reportServerError('verifierOppositions', error ?? new Error('lecture vide'));
      return null;
    }
    rows.push(...data);
    if (data.length < PAGE) return rows;
  }
}

// Mission 109 — l'adresse confirmée d'une annonce opposée, absente de la liste, y est ajoutée.
async function backfillOppositionAddresses(
  admin: ReturnType<typeof createServiceRoleClient>,
): Promise<number> {
  const oppositions = await readAll((from, to) =>
    admin
      .from('prospecting_oppositions')
      .select('agency_id, address_key, listing_key, requested_at')
      .order('id')
      .range(from, to),
  );
  if (oppositions == null || !oppositions.some((row) => row.listing_key != null)) return 0;
  const agencies = [...new Set(oppositions.map((row) => row.agency_id))];
  const competitors = await readAll((from, to) =>
    admin
      .from('comparables')
      .select('agency_id, listing_url, locator_address, locator_confirmed')
      .in('agency_id', agencies)
      .eq('locator_confirmed', true)
      .not('locator_address', 'is', null)
      .not('listing_url', 'is', null)
      .order('id')
      .range(from, to),
  );
  if (competitors == null) return 0;
  let added = 0;
  for (const { agencyId, addressKey } of missingOppositionAddresses(oppositions, competitors)) {
    const { error } = await admin
      .from('prospecting_oppositions')
      .insert({ agency_id: agencyId, address_key: addressKey });
    if (error && error.code !== '23505') {
      await reportServerError('verifierOppositions', error);
      continue;
    }
    added += 1;
  }
  return added;
}
