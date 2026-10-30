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
import { normalizedListingHref } from '@/features/market-update/services/newcomers-filter';
import { isPointOfDay } from '@/features/market-update/services/point-day';
import { reportServerError } from '@/lib/app-errors/report-server-error';
import type { Database } from '@/lib/supabase/database.types';

type Client = SupabaseClient<Database>;
type SummaryJson = Database['public']['Tables']['project_market_updates']['Insert']['summary'];
// Le point est un objet JSON (le schéma zod le relit) : le type généré de la colonne l'exige.
const asJson = (summary: MarketUpdateSummary): SummaryJson =>
  JSON.parse(JSON.stringify(summary)) as SummaryJson;

export type WrittenMarketUpdate = {
  updateId: string;
  madeAt: string;
  line: string;
  summary: MarketUpdateSummary;
};

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
  // Mission 127 B — une proposition écartée par le conseiller : retirée du point (une retenue en
  // sort d'elle-même, l'annonce étant alors dans le dossier).
  settledProposalUrl?: string | null;
}): Promise<WrittenMarketUpdate | null> {
  const { supabase, service, agencyId, projectId } = input;
  // Le dernier point d'abord : c'est lui qui dit si le point du jour se réécrit.
  const latest = await supabase
    .from('project_market_updates')
    .select('id, made_at, summary')
    .eq('project_id', projectId)
    .eq('agency_id', agencyId)
    .order('made_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const [competitors, conclusion, summary] = await Promise.all([
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
  ]);
  const now = new Date();
  const rows = competitors.data ?? [];
  const readToday = await listingsReadToday(supabase, agencyId, rows, now);
  // Le point du jour, s'il existe : réécrit, sa date gardée.
  const today = latest.data && isPointOfDay(latest.data.made_at, now) ? latest.data : null;
  const previous = today ? parseMarketUpdateSummary(today.summary) : null;
  const carried =
    input.newcomersSearch !== undefined
      ? input.newcomersSearch
      : (previous?.newcomersSearch ?? null);
  // Les annonces que le dossier connaît déjà — tous ses concurrents (retenus ou non), les écartés,
  // les imports en attente, les mêmes sources que la recherche — sortent des propositions.
  const listingUrls = async (
    table: 'comparables' | 'competitor_decisions' | 'pending_competitor_imports',
  ): Promise<(string | null)[]> => {
    if (!carried) return [];
    const { data } = await supabase
      .from(table)
      .select('listing_url')
      .eq('project_id', projectId)
      .eq('agency_id', agencyId);
    return ((data ?? []) as { listing_url: string | null }[]).map((row) => row.listing_url);
  };
  const allListings = {
    data: (await listingUrls('comparables')).map((listing_url) => ({ listing_url })),
  };
  const decisions = {
    data: (await listingUrls('competitor_decisions')).map((listing_url) => ({ listing_url })),
  };
  const pending = {
    data: (await listingUrls('pending_competitor_imports')).map((listing_url) => ({ listing_url })),
  };
  const known = new Set(
    [
      ...rows.map((row) => row.listing_url),
      ...(allListings.data ?? []).map((row) => row.listing_url),
      ...(decisions.data ?? []).map((row) => row.listing_url),
      ...(pending.data ?? []).map((row) => row.listing_url),
    ]
      .map((url) => normalizedListingHref(url))
      .filter((href) => href != null),
  );
  const settled = normalizedListingHref(input.settledProposalUrl ?? null);
  const newcomersSearch = carried
    ? {
        ...carried,
        proposed: carried.proposed.filter((item) => {
          const href = normalizedListingHref(item.url) ?? item.url;
          return !known.has(href) && href !== settled;
        }),
      }
    : null;
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
      .update({ summary: asJson(built) })
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
      summary: asJson(built),
    })
    .select('id, made_at')
    .single();
  if (error || !data) {
    await reportServerError('point marché', error ?? new Error('insertion sans ligne'));
    return null;
  }
  return { updateId: data.id, madeAt: data.made_at, line: marketUpdateLine(built), summary: built };
}
