'use server';

import { z } from 'zod';

import { importedToComparableInput } from '@/features/comparables/utils/imported-to-comparable-input';
import { finishPriceRefresh } from '@/features/competitor-refresh/actions/refresh-competitor-price';
import {
  canRefreshListings,
  type PriceCheckOutcome,
} from '@/features/competitor-refresh/services/price-refresh';
import { recordPriceReading } from '@/features/competitor-refresh/services/record-price-reading';
import { demoDelay } from '@/features/demo/services/demo-delay';
import { demoImportedData } from '@/features/demo/services/demo-listing-data';
import { findDemoListing } from '@/features/demo/services/demo-urls';
import { isDemoAgency } from '@/features/demo/services/is-demo-agency';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

// Mission 114 — « Mettre à jour les prix des concurrents » (M105) en DÉMONSTRATION : pas de page
// relue par l'extension ; le prix « affiché après le rendez-vous » vient du jeu de données, après
// le délai fixe, et passe par le même service qu'une page lue (`recordPriceReading` : constat
// daté, prix mis à jour). Une baisse simulée apparaît. Réservé à l'agence de démonstration, sur
// un dossier conclu (le Suivi) ou, depuis la mission 152, en préparation ou prêt avant son Live ;
// sinon rien n'est lu ni écrit.
export async function refreshDemoPrices(projectId: string): Promise<PriceCheckOutcome[]> {
  const profile = await getProfile();
  if (!profile || profile.removed_at || !z.uuid().safeParse(projectId).success) return [];
  if (!(await isDemoAgency(profile.agency_id))) return [];
  const supabase = await createClient();
  const { data: project } = await supabase
    .from('projects')
    .select('id, status, live_started_at')
    .eq('id', projectId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  // Mission 152 — aussi « Avant le rendez-vous », comme la relecture par l'extension.
  if (!project) return [];
  const { count: answers } =
    project.status === 'meeting_completed' || project.live_started_at != null
      ? { count: 0 }
      : await supabase
          .from('live_seller_responses')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', projectId);
  if (!canRefreshListings(project.status, project.live_started_at != null || (answers ?? 0) > 0)) {
    return [];
  }

  const { data: competitors } = await supabase
    .from('comparables')
    .select('id, price, listing_url, listing_gone_at')
    .eq('project_id', projectId)
    .eq('agency_id', profile.agency_id)
    .eq('is_selected', true)
    .not('listing_url', 'is', null);

  await demoDelay();
  const now = new Date();
  const outcomes: PriceCheckOutcome[] = [];
  for (const competitor of competitors ?? []) {
    const listing = findDemoListing(competitor.listing_url ?? '');
    if (!listing) {
      outcomes.push({ status: 'unreadable' });
      continue;
    }
    // Mission 127 — une annonce disparue après le rendez-vous : retirée, sur preuve simulée (M103),
    // une seule fois ; la règle des annonces disparues conclut au point marché.
    if (listing.goneAfterMeeting) {
      if (competitor.listing_gone_at == null) {
        const { error } = await supabase
          .from('comparables')
          .update({ listing_gone_at: now.toISOString() })
          .eq('id', competitor.id)
          .eq('agency_id', profile.agency_id);
        if (error) {
          outcomes.push({ status: 'unreadable' });
          continue;
        }
      }
      outcomes.push({ status: 'gone' });
      continue;
    }
    const readPrice = listing.priceAfterMeeting ?? listing.price;
    const data = { ...demoImportedData(listing, now), price: readPrice };
    const input = importedToComparableInput(data);
    if (!input) {
      outcomes.push({ status: 'unreadable' });
      continue;
    }
    outcomes.push(
      await recordPriceReading(
        supabase,
        profile.agency_id,
        competitor,
        competitor.listing_url as string,
        data,
        input.price,
      ),
    );
  }
  await finishPriceRefresh(projectId);
  return outcomes;
}
