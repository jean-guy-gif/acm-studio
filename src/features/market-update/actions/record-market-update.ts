'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { listingsReadToday } from '@/features/competitor-refresh/queries/listings-read-today';
import {
  buildMarketUpdateSummary,
  marketUpdateLine,
  type MarketUpdateSummary,
} from '@/features/market-update/services/market-update-summary';
import { reportServerError } from '@/lib/app-errors/report-server-error';
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
export async function recordMarketUpdate(projectId: string): Promise<RecordMarketUpdateResult> {
  const profile = await getProfile();
  if (!profile || profile.removed_at || !z.uuid().safeParse(projectId).success) {
    return { ok: false, error: MARKET_UPDATE_FAILURE };
  }
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
  const [competitors, conclusion, summary] = await Promise.all([
    supabase
      .from('comparables')
      .select(
        'id, price, property_type, rooms_count, surface_area, city, district, display_order, created_at, excluded_from_live, listing_url, listing_published_at, days_on_market, listing_gone_at, meeting_price, meeting_price_source',
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
  const madeAt = new Date();
  const rows = competitors.data ?? [];
  const readToday = await listingsReadToday(supabase, agencyId, rows, madeAt);
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
    madeAt,
  });
  const { data, error } = await createServiceRoleClient()
    .from('project_market_updates')
    .insert({
      agency_id: agencyId,
      project_id: projectId,
      made_by: profile.id,
      made_at: madeAt.toISOString(),
      summary: built,
    })
    .select('id, made_at')
    .single();
  if (error || !data) {
    await reportServerError('point marché', error ?? new Error('insertion sans ligne'));
    return { ok: false, error: MARKET_UPDATE_FAILURE };
  }
  revalidatePath('/suivi');
  revalidatePath(`/builder/${projectId}/point-marche`);
  return {
    ok: true,
    updateId: data.id,
    madeAt: data.made_at,
    line: marketUpdateLine(built),
    summary: built,
  };
}
