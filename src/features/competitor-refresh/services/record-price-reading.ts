import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { ImportedComparableData } from '@/features/comparable-import/types';
import { observeListing } from '@/features/comparable-import/services/record-listing-observation';
import {
  priceCheckOutcome,
  type PriceCheckOutcome,
} from '@/features/competitor-refresh/services/price-refresh';
import { reportServerError } from '@/lib/app-errors/report-server-error';
import type { Database } from '@/lib/supabase/database.types';

const REFRESH_SCOPE = 'relecture des prix des concurrents';

export type RefreshedCompetitor = {
  id: string;
  price: number;
  listing_gone_at: string | null;
};

// Mission 105 — ce qui suit la LECTURE d'un prix : le constat daté (M47), puis le prix du
// concurrent s'il a changé, et l'annonce redite en ligne si elle avait été marquée retirée.
// Mission 108 — une écriture refusée n'est jamais annoncée : le concurrent compte comme
// « illisible », et l'erreur part au journal. Partagé par la relecture par l'extension et par la
// relecture de démonstration (M114).
export async function recordPriceReading(
  supabase: SupabaseClient<Database>,
  agencyId: string,
  competitor: RefreshedCompetitor,
  url: string,
  data: ImportedComparableData,
  readPrice: number,
): Promise<PriceCheckOutcome> {
  await observeListing(supabase, agencyId, url, data);
  const outcome = priceCheckOutcome(competitor.price, { price: readPrice });
  const patch: { price?: number; listing_gone_at?: null } = {};
  if (outcome.status === 'changed') patch.price = readPrice;
  if (competitor.listing_gone_at != null) patch.listing_gone_at = null;
  if (Object.keys(patch).length > 0) {
    const { error } = await supabase
      .from('comparables')
      .update(patch)
      .eq('id', competitor.id)
      .eq('agency_id', agencyId);
    if (error) {
      await reportServerError(REFRESH_SCOPE, error);
      return { status: 'unreadable' };
    }
  }
  return outcome;
}
