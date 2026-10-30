import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { listingsReadToday } from '@/features/competitor-refresh/queries/listings-read-today';
import {
  buildMarketUpdateSummary,
  marketUpdateLine,
  parseMarketUpdateSummary,
  type MarketUpdateSummary,
  type NewcomersSearch,
} from '@/features/market-update/services/market-update-summary';
import { reportServerError } from '@/lib/app-errors/report-server-error';
import type { Database } from '@/lib/supabase/database.types';

type Client = SupabaseClient<Database>;

export type WrittenMarketUpdate = {
  updateId: string;
  madeAt: string;
  line: string;
  summary: MarketUpdateSummary;
};

const dayOf = (value: string | Date): string =>
  (typeof value === 'string' ? new Date(value) : value).toISOString().slice(0, 10);

// Mission 127, partagé par la 127 B — écrire le point daté d'un dossier conclu : tout est relu en
// base par le client de la session (colonnes autorisées seulement), le point est écrit par la clé
// de service. Mission 127 B (décision de Jean-Guy, 29/10) : le point du JOUR se réécrit — une
// recherche de nouveaux venus ou une retenue met à jour le « Point du 29/10 » au lieu d'en écrire
// un second ; `newcomersSearch` donné remplace celui du point, absent il est gardé.
export async function writeMarketUpdate(input: {
  supabase: Client;
  service: Client;
  agencyId: string;
  projectId: string;
  profileId: string;
  newcomersSearch?: NewcomersSearch | null;
}): Promise<WrittenMarketUpdate | null> {
  const { supabase, service, agencyId, projectId } = input;
  const [competitors, conclusion, summary, latest] = await Promise.all([
    supabase
      .from('comparables')
      .select(
        'id, price, property_type, rooms_count, surface_area, city, district, display_order, created_at, excluded_from_live, listing_url, listing_published_at, days_on_market, listing_gone_at, meeting_price, meeting_price_source, meeting_frozen_at',
      )
      .eq('project_id', projectId)
      .eq('agency_id', agencyId)
      .eq('is_selected', true),
    supabase
      .from('project_meeting_conclusions')
      .select('commercialization_price, concluded_at, frozen_advisor_analysis')
      .eq('project_id', projectId)
      .eq('agency_id', agencyId)
      .maybeSingle(),
    supabase
      .from('live_seller_summary')
      .select('seller_most_dangerous_comparable_id')
      .eq('project_id', projectId)
      .eq('agency_id', agencyId)
      .maybeSingle(),
    supabase
      .from('project_market_updates')
      .select('id, made_at, summary')
      .eq('project_id', projectId)
      .eq('agency_id', agencyId)
      .order('made_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const now = new Date();
  const rows = competitors.data ?? [];
  const readToday = await listingsReadToday(supabase, agencyId, rows, now);
  // Le point du jour, s'il existe : réécrit, sa date gardée.
  const today = latest.data && dayOf(latest.data.made_at) === dayOf(now) ? latest.data : null;
  const previous = today ? parseMarketUpdateSummary(today.summary) : null;
  const newcomersSearch =
    input.newcomersSearch !== undefined
      ? input.newcomersSearch
      : (previous?.newcomersSearch ?? null);
  const built = buildMarketUpdateSummary({
    // L'adresse de l'annonce ne va pas plus loin : seul « relue aujourd'hui » entre dans le point.
    competitors: rows.map((row) => {
      const { listing_url, ...rest } = row;
      void listing_url;
      return { ...rest, read_today: readToday.get(row.id) ?? null };
    }),
    dangerousCompetitorId: summary.data?.seller_most_dangerous_comparable_id ?? null,
    meetingDate: conclusion.data?.concluded_at ?? null,
    agreedPrice: conclusion.data?.commercialization_price ?? null,
    advisorAnalysis: conclusion.data?.frozen_advisor_analysis ?? null,
    madeAt: today ? new Date(today.made_at) : now,
    newcomersSearch,
  });
  if (today) {
    const { data, error } = await service
      .from('project_market_updates')
      .update({ summary: built })
      .eq('id', today.id)
      .eq('project_id', projectId)
      .eq('agency_id', agencyId)
      .select('id, made_at')
      .maybeSingle();
    if (error || !data) {
      await reportServerError('point marché', error ?? new Error('réécriture sans ligne'));
      return null;
    }
    return {
      updateId: data.id,
      madeAt: data.made_at,
      line: marketUpdateLine(built),
      summary: built,
    };
  }
  const { data, error } = await service
    .from('project_market_updates')
    .insert({
      agency_id: agencyId,
      project_id: projectId,
      made_by: input.profileId,
      made_at: now.toISOString(),
      summary: built,
    })
    .select('id, made_at')
    .single();
  if (error || !data) {
    await reportServerError('point marché', error ?? new Error('insertion sans ligne'));
    return null;
  }
  return { updateId: data.id, madeAt: data.made_at, line: marketUpdateLine(built), summary: built };
}
