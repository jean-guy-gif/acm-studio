import 'server-only';

import type { StatTile } from '@/components/socle/stat-tiles';
import { readVisitLines } from '@/features/buyer-presentation/queries/get-visit-requests';
import { getBuyerFollowUpRows } from '@/features/buyers/queries/get-buyer-follow-up';
import { getBuyersProgress } from '@/features/buyers/queries/get-buyers-progress';
import { getBuyerLoopProposals } from '@/features/buyers/queries/get-loop-properties';
import { buyerFollowUp, FOLLOW_UP_GROUP_TITLES } from '@/features/buyers/services/buyer-follow-up';
import { buyerNextAction } from '@/features/buyers/services/buyer-journey';
import { NO_PROGRESS } from '@/features/buyers/services/buyer-progress';
import type { Buyer } from '@/features/buyers/types';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

// La refonte, lot F (Jean-Guy, 26/11) — dans le détail d'Acquéreurs (tablette, ordinateur), quand
// la personne n'a pas de bien à voir : sa prochaine étape et ses trois chiffres, ceux de sa fiche
// repliée, lus sur les mêmes faits (`buyerNextAction`, « Son suivi », M10 bis) ; rien de nouveau.
// `tiles` null : son suivi n'a pas pu être lu, on ne dit jamais « 0 » sur une lecture en échec
// (M98).

const SUIVI_TILES = ['visited', 'waiting', 'refused'] as const;

export async function loadBuyerTodaySummary(buyer: Buyer) {
  const profile = await getProfile();
  if (!profile) return null;
  const supabase = await createClient();
  const now = new Date();
  const [progress, loop, followUpRows, visitRead] = await Promise.all([
    getBuyersProgress(supabase, profile.agency_id, [buyer.id]),
    getBuyerLoopProposals(profile.agency_id, now),
    getBuyerFollowUpRows(supabase, profile.agency_id, buyer.id),
    readVisitLines(),
  ]);
  const facts = progress.get(buyer.id) ?? NO_PROGRESS;
  const next = buyerNextAction(buyer, facts, now, loop.byBuyer.get(buyer.id) ?? []);
  const entries =
    followUpRows && !visitRead.failed
      ? buyerFollowUp({
          ...followUpRows,
          visits: visitRead.lines
            .filter((line) => line.buyerId === buyer.id)
            .map((line) => ({
              id: line.id,
              itemId: line.itemId,
              requestedAt: line.requestedAt,
              visitedAt: line.visitedAt,
              opinion: line.report?.opinion ?? null,
              outcome: line.outcome,
            })),
        })
      : null;
  const tiles: StatTile[] | null = entries
    ? SUIVI_TILES.map((group) => ({
        value: entries.filter((entry) => entry.group === group).length,
        label: FOLLOW_UP_GROUP_TITLES[group],
        testId: `buyer-today-tile-${group}`,
      }))
    : null;
  return { next, unread: facts.unread === true, loopFailed: loop.failed, tiles };
}
