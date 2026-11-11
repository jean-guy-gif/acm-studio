'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { extractListingData } from '@/features/comparable-import/services/extract-listing-data';
import { normalizeListingData } from '@/features/comparable-import/services/normalize-listing-data';
import { detectSource } from '@/features/comparable-import/utils/detect-source';
import { parseListingUrl } from '@/features/comparable-import/utils/normalize-listing-url';
import { isAllowedProtocol } from '@/features/comparable-import/utils/normalize-url';
import { importedToComparableInput } from '@/features/comparables/utils/imported-to-comparable-input';
import {
  canRefreshListings,
  type PriceCheckOutcome,
} from '@/features/competitor-refresh/services/price-refresh';
import { recordPriceReading } from '@/features/competitor-refresh/services/record-price-reading';
import { readListingPayload } from '@/features/competitor-search/services/listing-payload';
import { emptyPageCode } from '@/features/competitor-search/services/withdrawn-proof';
import { reportServerError } from '@/lib/app-errors/report-server-error';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

const MAX_HTML_BYTES = 4 * 1024 * 1024;
const REFRESH_SCOPE = 'relecture des prix des concurrents';

export type CompetitorToRefresh = { id: string; listingUrl: string };

async function scope(projectId: string) {
  const profile = await getProfile();
  if (!profile || profile.removed_at || !z.uuid().safeParse(projectId).success) return null;
  const supabase = await createClient();
  const { data: project } = await supabase
    .from('projects')
    .select('id, status, live_started_at')
    .eq('id', projectId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  if (!project) return null;
  // Le Suivi : un dossier conclu. Mission 152 — et « Avant le rendez-vous » : un dossier en
  // préparation ou prêt, tant que son Live n'a pas commencé (heure de début ou réponse du vendeur).
  let liveStarted = project.live_started_at != null;
  if (!liveStarted && project.status !== 'meeting_completed') {
    const { count } = await supabase
      .from('live_seller_responses')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId);
    liveStarted = (count ?? 0) > 0;
  }
  if (!canRefreshListings(project.status, liveStarted)) return null;
  return { supabase, agencyId: profile.agency_id };
}

// Mission 105 — les annonces à relire : les concurrents retenus du dossier qui en ont une.
export async function listCompetitorsToRefresh(projectId: string): Promise<CompetitorToRefresh[]> {
  const s = await scope(projectId);
  if (!s) return [];
  const { data } = await s.supabase
    .from('comparables')
    .select('id, listing_url')
    .eq('project_id', projectId)
    .eq('agency_id', s.agencyId)
    .eq('is_selected', true)
    .not('listing_url', 'is', null);
  return (data ?? [])
    .filter((row) => (row.listing_url ?? '').trim() !== '')
    .map((row) => ({ id: row.id, listingUrl: row.listing_url as string }));
}

// Une annonce relue par l'extension : la page arrive dans un formulaire (jamais en argument,
// correctif du 12/10), et tout est relu ici. `gone` : l'extension a constaté une redirection
// hors de l'annonce. Aucun appel payant.
export async function refreshCompetitorPrice(
  projectId: string,
  competitorId: string,
  payload: FormData,
): Promise<PriceCheckOutcome> {
  const s = await scope(projectId);
  if (!s || !z.uuid().safeParse(competitorId).success) return { status: 'unreadable' };
  const { supabase, agencyId } = s;
  const { data: competitor } = await supabase
    .from('comparables')
    .select('id, price, listing_url, listing_gone_at')
    .eq('id', competitorId)
    .eq('project_id', projectId)
    .eq('agency_id', agencyId)
    .eq('is_selected', true)
    .maybeSingle();
  const listing = readListingPayload(payload);
  const url = listing ? parseListingUrl(listing.url) : null;
  if (!competitor || !listing || !url || !isAllowedProtocol(url)) return { status: 'unreadable' };
  if (url.href !== parseListingUrl(competitor.listing_url ?? '')?.href)
    return { status: 'unreadable' };

  // Mission 108 — une écriture refusée n'est jamais annoncée : le concurrent compte comme
  // « illisible », et l'erreur part au journal.
  const markGone = async (): Promise<PriceCheckOutcome> => {
    if (competitor.listing_gone_at == null) {
      const { error } = await supabase
        .from('comparables')
        .update({ listing_gone_at: new Date().toISOString() })
        .eq('id', competitor.id)
        .eq('agency_id', agencyId);
      if (error) {
        await reportServerError(REFRESH_SCOPE, error);
        return { status: 'unreadable' };
      }
    }
    return { status: 'gone' };
  };

  if (payload.get('gone') === 'redirect') return markGone();
  const html = listing.html;
  if (html.trim() === '' || Buffer.byteLength(html, 'utf8') > MAX_HTML_BYTES) {
    return { status: 'unreadable' };
  }
  const { data } = normalizeListingData(
    extractListingData(html, url.href),
    url.href,
    detectSource(url.hostname),
  );
  const input = importedToComparableInput(data);
  if (input == null) {
    // Sans prix : retirée seulement sur preuve (M103) ; sinon, rien ne change.
    return emptyPageCode(html, url.hostname) === 'listing_withdrawn'
      ? markGone()
      : { status: 'unreadable' };
  }

  // Le constat daté (M47), puis le prix du concurrent s'il a changé (service partagé, M114).
  return recordPriceReading(supabase, agencyId, competitor, url.href, data, input.price);
}

// Mission 152 — « Vérifier les annonces », sur « Avant le rendez-vous » : la relecture faite, la
// date de la vérification est posée — l'heure de la base (son déclencheur), jamais `updated_at`,
// pour que « ce qui dort » (M59) et l'ordre des listes (M146 A) ne bougent pas.
export async function finishListingsCheck(projectId: string): Promise<{ ok: boolean }> {
  const s = await scope(projectId);
  if (!s) return { ok: false };
  const { error } = await s.supabase
    .from('projects')
    .update({ listings_checked_at: new Date().toISOString() })
    .eq('id', projectId)
    .eq('agency_id', s.agencyId);
  if (error) {
    await reportServerError(REFRESH_SCOPE, error);
    return { ok: false };
  }
  revalidatePath(`/builder/${projectId}/avant-rendez-vous`);
  revalidatePath(`/builder/${projectId}/comparables`);
  revalidatePath(`/builder/${projectId}`);
  return { ok: true };
}

export async function finishPriceRefresh(projectId: string): Promise<void> {
  revalidatePath('/suivi');
  revalidatePath('/aujourdhui');
  revalidatePath(`/builder/${projectId}`);
  revalidatePath('/prospection');
}
