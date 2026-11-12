'use server';

import { z } from 'zod';

import { toBuyer } from '@/features/buyers/services/buyer-row';
import type { Buyer } from '@/features/buyers/types';
import { streamEstateApiKey } from '@/features/competitor-search/services/stream-estate-config';
import { liveStreamEstatePage } from '@/features/competitor-search/services/stream-estate-fetch';
import {
  STREAM_ESTATE_BILLING_CAP,
  STREAM_ESTATE_MORE_CAP,
  type FetchStreamEstatePage,
  type TierCursor,
  type TieredSearchCounts,
  type TieredSearchMemory,
  type TierReport,
} from '@/features/competitor-search/services/stream-estate-tiers';
import {
  STREAM_ESTATE_LABEL,
  STREAM_ESTATE_SOURCE,
  type PortalSearchResult,
} from '@/features/competitor-search/types';
import { DEMO_LISTINGS } from '@/features/demo/data/scenarios';
import { demoStreamEstatePage } from '@/features/demo/services/demo-stream-estate';
import { isDemoAgency } from '@/features/demo/services/is-demo-agency';
import {
  categorizeIdeal,
  type IdealCategorization,
} from '@/features/ideal-properties/services/categorize-ideal';
import {
  IDEAL_CRITERIA_MESSAGES,
  idealSearchCriteria,
} from '@/features/ideal-properties/services/ideal-criteria';
import {
  resolveIdealPlans,
  runIdealMarketSearch,
} from '@/features/ideal-properties/services/ideal-market-search';
import { getSearchBudget } from '@/features/search-budget/queries/get-search-budget';
import {
  advertsAllowed,
  BUDGET_REACHED_HINT,
  BUDGET_REACHED_LABEL,
  BUDGET_UNREADABLE_MESSAGE,
} from '@/features/search-budget/services/budget';
import {
  reserveSearchBudget,
  settleSearchBudget,
} from '@/features/search-budget/services/reserve-budget';
import { IDEAL_CATEGORIES } from '@/features/ideal-properties/types';
import { getPosedAiCap } from '@/features/ai-budget/queries/get-ai-budgets';
import { notesReadingOpen } from '@/features/buyer-notes/services/reading-gate';
import { rankingCriteria } from '@/features/soft-ranking/ranking-request';
import { agencyRankingListings } from '@/features/soft-ranking/server/agency-listings';
import { rankListings } from '@/features/soft-ranking/server/rank-listings';
import { rankCategorized } from '@/features/ideal-properties/services/rank-categorized';
import type { RankingListing, SoftRanking } from '@/features/soft-ranking/types';
import { getProfile } from '@/lib/auth/get-profile';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export type IdealSearchResult =
  | {
      ok: true;
      portal: PortalSearchResult;
      categorized: IdealCategorization;
      billed: number;
      stop: 'target' | 'cap' | 'exhausted' | 'error';
      cursor: TierCursor | null;
      tiers: TierReport[];
      counts: TieredSearchCounts;
      communes: string[];
      // Le jour de la recherche : « affiché le », jamais « disponible » (M118).
      seenOn: string;
      // Mission 151 (partie B) — ce qui compte pour eux, pour le marché (clé : le lien de l'annonce)
      // et pour les biens de l'agence (clé du rapprochement) ; null sans critère doux sur la fiche.
      ranking: SoftRanking | null;
    }
  | { ok: false; error: string };

const pointSchema = z.object({ lat: z.number().finite(), lon: z.number().finite() });
const resumeSchema = z.object({
  cursor: z.object({
    plan: z.number().int().min(0).max(20),
    price: z.number().int().min(0).max(10),
    page: z.number().int().min(1).max(50),
    size: z.number().int().min(1).max(20).nullable(),
    tier: z.number().int().min(1).max(8),
  }),
  memory: z.object({
    keys: z.array(z.string().min(1).max(100)).max(500),
    oldCount: z.number().int().min(0).max(500),
    locations: z
      .array(z.object({ uuid: z.string().min(1).max(100), point: pointSchema.nullable() }))
      .max(1000),
  }),
});
export type IdealSearchResume = { cursor: TierCursor; memory: TieredSearchMemory };

// Mission 151 (partie B) — les biens de l'agence affichés, revalidés (M43) : des clés du
// rapprochement, 60 au plus ; leurs textes sont relus dans l'agence (`agency-listings.ts`).
const agencyKeysSchema = z.array(z.string().regex(/^(dossier|competitor):[0-9a-f-]{36}$/i)).max(60);

const GENERIC_ERROR = 'La recherche du marché a échoué. Réessayez.';
const NOT_FOUND = 'Cette fiche acquéreur n’existe plus.';

async function activeBuyer(buyerId: string, agencyId: string): Promise<Buyer | null> {
  if (!/^[0-9a-f-]{36}$/i.test(buyerId)) return null;
  const { data } = await createServiceRoleClient()
    .from('buyers')
    .select('*')
    .eq('id', buyerId)
    .eq('agency_id', agencyId)
    .is('archived_at', null)
    .maybeSingle();
  return data ? toBuyer(data) : null;
}

// Mission 118 — le MARCHÉ pour un acquéreur : la recherche Stream Estate de M71/M99/M110, avec les
// réglages déduits de la fiche (ideal-criteria.ts), sur TOUTES ses communes à la fois (codes INSEE
// additionnés, comme les arrondissements voisins de M99), sans adresse donc sans quartier. Payante :
// budget de l'agence vérifié puis réservé avant l'appel (M100, M105), facturé compté, reste rendu ;
// « Chercher encore » reprend où elle s'est arrêtée. Dans l'agence de démonstration (M114), la
// recherche simulée : ni clé, ni budget, aucun appel. Un acquéreur archivé ne cherche plus. Les
// candidats reviennent déjà rangés en trois catégories (categorize-ideal.ts) ; rien n'est écrit.
export async function searchIdealProperties(
  buyerId: string,
  resume?: IdealSearchResume | null,
  // Mission 151 (partie B) — les biens de l'agence affichés, classés avec le marché à la première
  // recherche (Jean-Guy, 12/11) ; leurs textes sont relus au serveur, dans l'agence.
  agencyKeys: readonly string[] = [],
): Promise<IdealSearchResult> {
  const parsedResume = resume == null ? null : resumeSchema.safeParse(resume);
  if (parsedResume != null && !parsedResume.success) return { ok: false, error: GENERIC_ERROR };
  const parsedKeys = agencyKeysSchema.safeParse(agencyKeys);
  if (!parsedKeys.success) return { ok: false, error: GENERIC_ERROR };

  const profile = await getProfile();
  if (!profile || profile.removed_at) return { ok: false, error: 'Vous devez être connecté.' };
  const buyer = await activeBuyer(buyerId, profile.agency_id);
  if (!buyer) return { ok: false, error: NOT_FOUND };

  const deduced = idealSearchCriteria(buyer);
  if (!deduced.ok) return { ok: false, error: IDEAL_CRITERIA_MESSAGES[deduced.reason] };
  const { criteria } = deduced;

  const demo = await isDemoAgency(profile.agency_id);
  const apiKey = demo ? null : streamEstateApiKey();
  if (!demo && apiKey == null) {
    return {
      ok: false,
      error: 'La recherche du marché n’est pas activée : prévenez l’équipe ACM Studio.',
    };
  }
  const budgetRead = demo ? null : await getSearchBudget(profile.agency_id);
  if (budgetRead != null && !budgetRead.ok) return { ok: false, error: BUDGET_UNREADABLE_MESSAGE };
  if (budgetRead?.ok && budgetRead.budget.reached) {
    return {
      ok: false,
      error: `${BUDGET_REACHED_LABEL}. Aucune recherche lancée. ${BUDGET_REACHED_HINT}`,
    };
  }

  // 1. Les communes de la fiche, toutes résolues en codes INSEE ; une seule introuvable retient.
  //    Puis le plan : les réglages de la fiche, toute la commune — toutes les communes de la fiche.
  const now = new Date();
  const resolvedPlans = await resolveIdealPlans(deduced, demo, now);
  if (!resolvedPlans.ok) return { ok: false, error: resolvedPlans.error };
  const { plans, names } = resolvedPlans.resolved;

  let billed = 0;
  const fetchPage: FetchStreamEstatePage = demo
    ? demoStreamEstatePage({ listings: DEMO_LISTINGS, now })
    : liveStreamEstatePage(
        apiKey ?? '',
        (count) => {
          billed += count;
        },
        'searchIdealProperties',
      );

  const resumeFrom = parsedResume?.data ?? null;
  if (
    resumeFrom != null &&
    (resumeFrom.cursor.plan >= plans.length ||
      plans[resumeFrom.cursor.plan]!.tier !== resumeFrom.cursor.tier)
  ) {
    return { ok: false, error: 'La fiche a changé depuis la recherche : relancez-la.' };
  }

  // 2. Le budget réservé avant l’appel (M105) ; rien en démo.
  const wanted = resumeFrom != null ? STREAM_ESTATE_MORE_CAP : STREAM_ESTATE_BILLING_CAP;
  const reservation = budgetRead?.ok
    ? await reserveSearchBudget({
        agencyId: profile.agency_id,
        projectId: null,
        userId: profile.id,
        wanted: advertsAllowed(wanted, budgetRead.budget),
      })
    : null;
  if (reservation != null && !reservation.ok) {
    return {
      ok: false,
      error:
        reservation.reason === 'reached'
          ? `${BUDGET_REACHED_LABEL}. Aucune recherche lancée. ${BUDGET_REACHED_HINT}`
          : BUDGET_UNREADABLE_MESSAGE,
    };
  }
  const outcome = await runIdealMarketSearch(deduced, resolvedPlans.resolved, {
    fetchPage,
    now,
    cap: reservation?.ok ? reservation.adverts : wanted,
    resume:
      resumeFrom != null
        ? {
            cursor: { ...resumeFrom.cursor, tier: plans[resumeFrom.cursor.plan]!.tier },
            memory: resumeFrom.memory,
          }
        : null,
  });
  if (reservation?.ok) await settleSearchBudget(reservation.reservationId, billed);
  if (!outcome.ok) {
    return {
      ok: false,
      error:
        outcome.reason === 'refused'
          ? 'La recherche a été refusée par le fournisseur des annonces : prévenez l’équipe ACM Studio. Aucun bien n’a été trouvé.'
          : GENERIC_ERROR,
    };
  }

  const { candidates } = outcome;
  const categorized = categorizeIdeal(buyer, candidates, criteria);

  // Mission 151 (partie B) — le classement par ce qui compte pour eux, avant d'afficher (planche
  // 4 b) : les biens gardés du marché, et ceux de l'agence à la première recherche. Il ne range qu'à
  // l'intérieur d'une catégorie ; échec ou délai : classement simplifié, rien n'est bloqué.
  const softCriteria = rankingCriteria(buyer.softCriteria.map((soft) => soft.key));
  let ranking: SoftRanking | null = null;
  if (softCriteria.length > 0) {
    const kept = IDEAL_CATEGORIES.flatMap((category) => categorized.byCategory[category]);
    const market: RankingListing[] = kept.map(({ candidate }) => ({
      key: candidate.url,
      text: candidate.streamEstate?.description ?? '',
      tags: candidate.streamEstate?.tags ?? [],
    }));
    const agency =
      resumeFrom == null && parsedKeys.data.length > 0
        ? await agencyRankingListings(profile.agency_id, parsedKeys.data)
        : [];
    ranking = await rankListings({
      agencyId: profile.agency_id,
      userId: profile.id,
      criteria: softCriteria,
      listings: [...market, ...agency].filter((listing) => listing.text || listing.tags.length),
      demo,
      open: notesReadingOpen({
        isDemo: demo,
        email: profile.email,
        agencyCapCents: await getPosedAiCap(profile.agency_id),
      }),
      now,
    });
    if (ranking?.mode === 'full') rankCategorized(categorized, ranking.byKey);
  }

  return {
    ok: true,
    portal: {
      portal: STREAM_ESTATE_SOURCE,
      label: STREAM_ESTATE_LABEL,
      searchUrl: '',
      status: candidates.length > 0 ? 'ok' : 'empty',
      message:
        candidates.length > 0 ? null : 'Stream Estate ne renvoie aucun bien pour ces critères.',
      candidates,
    },
    categorized,
    billed: demo ? 0 : outcome.billed,
    stop: outcome.stop,
    cursor: outcome.cursor,
    tiers: outcome.tiers,
    counts: outcome.counts,
    communes: names,
    seenOn: now.toISOString().slice(0, 10),
    ranking,
  };
}
