'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { loadSearchCriteria } from '@/features/competitor-search/queries/load-search-criteria';
import { geoProvider } from '@/features/competitor-search/services/geo-provider';
import { baseStreamEstateQuery } from '@/features/competitor-search/services/stream-estate';
import { streamEstateApiKey } from '@/features/competitor-search/services/stream-estate-config';
import { liveStreamEstatePage } from '@/features/competitor-search/services/stream-estate-fetch';
import {
  neighbourInseeCodes,
  planTiers,
  runTieredSearch,
  STREAM_ESTATE_BILLING_CAP,
  type FetchStreamEstatePage,
} from '@/features/competitor-search/services/stream-estate-tiers';
import {
  arrondissementCityInsee,
  arrondissementInsee,
  neighbourArrondissements,
  siblingArrondissements,
} from '@/features/competitor-search/utils/arrondissements';
import { DEMO_LISTINGS } from '@/features/demo/data/scenarios';
import { demoStreamEstatePage } from '@/features/demo/services/demo-stream-estate';
import { isDemoAgency } from '@/features/demo/services/is-demo-agency';
import {
  filterNewcomers,
  newcomerPriceRanges,
  NEWCOMERS_MIN_FOUND,
  type NewcomerCandidate,
  type PriceRange,
} from '@/features/market-update/services/newcomers-filter';
import { isPointOfDay } from '@/features/market-update/services/point-day';
import {
  newcomerProposalSchema,
  parseMarketUpdateSummary,
} from '@/features/market-update/services/market-update-summary';
import { writeMarketUpdate } from '@/features/market-update/services/write-market-update';
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
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export type SearchNewcomersResult =
  | {
      ok: true;
      newcomers: NewcomerCandidate[];
      found: number;
      billed: number;
      excludedNoDate: number;
      excludedKnown: number;
      concludedAt: string;
      priceCeiling: number;
      // Mission 129 — la fourchette cherchée, et si la recherche s'est élargie à −10 %.
      priceRange: PriceRange;
      widened: boolean;
      // La seconde passe refusée par le budget : la première est gardée, le point le dit.
      // L'élargissement n'a pas pu partir : le budget du mois, ou une panne (fournisseur, lecture).
      widenRefused: 'budget' | 'failed' | null;
      // Le point du jour, réécrit avec « recherche faite ».
      updateId: string | null;
      line: string | null;
    }
  | { ok: false; error: string };

const GENERIC_ERROR = 'La recherche des nouveaux venus a échoué. Réessayez.';
const NOT_SIGNED =
  'La recherche des nouveaux venus se fait sur un mandat signé, avec un prix de commercialisation.';

// Mission 127 B — « Chercher les nouveaux venus », sur le Suivi d'un mandat signé : la recherche
// Stream Estate par crans de la préparation (M71, M99, M110), avec les critères du dossier
// (`projects.search_settings` seul, M110 : une recherche nommée ne s'applique qu'à la main), le
// PLAFOND de prix dans la requête — le prix de commercialisation, jamais plus (règle de Jean-Guy,
// 29/10 : moins cher, et seuls les biens à ce prix ou moins sont proposés) —, puis le filtre
// « nouveau » sur la réponse : vu sur le marché après le rendez-vous, absent des concurrents, des
// écartés et des imports en attente. Appel payant : le budget est vérifié puis réservé AVANT, réglé
// après (M100, M105), et compté sur le dossier. Le résultat n'est PAS gardé en base (il écraserait
// le résultat payé de la préparation, M112) : ce qui compte entre dans le point du jour. Démo :
// la recherche simulée, rien de payé (M114).
export async function searchNewcomers(projectId: string): Promise<SearchNewcomersResult> {
  const profile = await getProfile();
  if (!profile || profile.removed_at || !z.uuid().safeParse(projectId).success) {
    return { ok: false, error: 'Vous devez être connecté.' };
  }
  const supabase = await createClient();
  const agencyId = profile.agency_id;
  const { data: project } = await supabase
    .from('projects')
    .select('id, status, is_example')
    .eq('id', projectId)
    .eq('agency_id', agencyId)
    .maybeSingle();
  if (!project || project.status !== 'meeting_completed' || project.is_example) {
    return { ok: false, error: NOT_SIGNED };
  }
  const { data: conclusion } = await supabase
    .from('project_meeting_conclusions')
    .select('outcome, commercialization_price, concluded_at')
    .eq('project_id', projectId)
    .eq('agency_id', agencyId)
    .maybeSingle();
  if (
    !conclusion ||
    conclusion.outcome !== 'signed' ||
    conclusion.commercialization_price == null ||
    conclusion.commercialization_price <= 0 ||
    !conclusion.concluded_at
  ) {
    return { ok: false, error: NOT_SIGNED };
  }
  const priceCeiling = Math.round(conclusion.commercialization_price);
  // Mission 129 — de −5 % du prix à ce prix, puis −10 % s'il y a moins de 3 biens.
  const ranges = newcomerPriceRanges(priceCeiling);
  // Une recherche par point, pas de « Chercher encore » (Jean-Guy, 29/10) : revalidé ici, un
  // second clic ou un second onglet ne repaie pas.
  const { data: latest } = await supabase
    .from('project_market_updates')
    .select('id, made_at, summary')
    .eq('project_id', projectId)
    .eq('agency_id', agencyId)
    .order('made_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (
    latest &&
    isPointOfDay(latest.made_at) &&
    parseMarketUpdateSummary(latest.summary)?.newcomersSearch != null
  ) {
    return {
      ok: false,
      error: 'Une recherche des nouveaux venus a déjà été faite pour le point du jour.',
    };
  }

  const demo = await isDemoAgency(agencyId);
  const apiKey = demo ? null : streamEstateApiKey();
  if (!demo && apiKey == null) {
    return {
      ok: false,
      error: 'La recherche de concurrents n’est pas activée : prévenez l’équipe ACM Studio.',
    };
  }
  // Mission 100 — le plafond mensuel, vérifié AVANT tout appel payant ; illisible ≠ libre.
  const budgetRead = demo ? null : await getSearchBudget(agencyId);
  if (budgetRead != null && !budgetRead.ok) return { ok: false, error: BUDGET_UNREADABLE_MESSAGE };
  if (budgetRead?.ok && budgetRead.budget.reached) {
    return {
      ok: false,
      error: `${BUDGET_REACHED_LABEL}. Aucune recherche lancée. ${BUDGET_REACHED_HINT}`,
    };
  }
  const geo = geoProvider(demo);
  const loaded = await loadSearchCriteria(projectId);
  if (!loaded.ok) {
    return {
      ok: false,
      error:
        loaded.reason === 'no_city'
          ? 'Renseignez d’abord la ville du bien vendeur : la recherche se base sur sa commune.'
          : GENERIC_ERROR,
    };
  }
  const { criteria } = loaded;
  // Mission 129 — le plancher et le plafond partent dans la requête (`budgetMin`, `budgetMax`) : un
  // critère réglé, fixe (M99), que les crans ne desserrent pas ; chaque passe a sa tranche.
  const settingsFor = (range: PriceRange) => ({ ...loaded.settings, price: range });
  const settings = settingsFor(ranges.first);
  const commune = await geo.resolveCommune(criteria.city, criteria.postalCode);
  if (!commune.ok) {
    return {
      ok: false,
      error: `Commune introuvable (« ${[criteria.city, criteria.postalCode].filter(Boolean).join(' ')} ») : vérifiez la ville et le code postal du bien vendeur. Aucune recherche lancée.`,
    };
  }
  const now = new Date();
  if (!baseStreamEstateQuery(criteria, now).ok) {
    return {
      ok: false,
      error:
        'La recherche ne trouve que des appartements et des maisons : précisez le type du bien vendeur.',
    };
  }
  const geocode = await geo.geocodeSubject(loaded.address, criteria.postalCode, commune.name);
  const subjectPoint = geocode.ok ? geocode.point : null;
  const origin = subjectPoint ?? commune.centre;
  if (settings.sector?.kind === 'radius' && subjectPoint == null) {
    return {
      ok: false,
      error:
        'Le rayon se mesure autour du bien : son adresse n’a pas été reconnue avec certitude. Aucune recherche lancée.',
    };
  }
  const departmentCommunes =
    subjectPoint != null && commune.departement != null
      ? await geo.fetchDepartmentCommunes(commune.departement)
      : null;
  const { arrondissement } = commune;
  const siblings = arrondissement
    ? {
        cityCode: arrondissementCityInsee(arrondissement.city),
        siblings: siblingArrondissements(arrondissement).map(arrondissementInsee),
      }
    : null;
  const neighbours =
    subjectPoint != null && departmentCommunes != null
      ? (radiusKm: number) =>
          neighbourInseeCodes(departmentCommunes, commune.code, subjectPoint, radiusKm, siblings)
      : null;
  let billed = 0;
  const fetchPage: FetchStreamEstatePage = demo
    ? demoStreamEstatePage({ listings: DEMO_LISTINGS, now })
    : liveStreamEstatePage(apiKey ?? '', (count) => {
        billed += count;
      });
  const context = {
    located: subjectPoint != null,
    hasCentre: origin != null,
    arrondissement: arrondissement
      ? {
          code: commune.code,
          neighbours: neighbourArrondissements(arrondissement).map(arrondissementInsee),
        }
      : null,
  };
  // Une passe : son coût maximal réservé AVANT l'appel payant, compté sur le dossier, réglé après
  // (M100, M105) ; une seule facturation au plus par passe.
  type Pass =
    | {
        ok: true;
        candidates: Awaited<ReturnType<typeof runTieredSearch>> & { ok: true };
        billed: number;
      }
    | { ok: false; reason: 'reached' | 'unreadable' | 'refused' | 'failed' };
  const runPass = async (range: PriceRange): Promise<Pass> => {
    const passSettings = settingsFor(range);
    const reservation = budgetRead?.ok
      ? await reserveSearchBudget({
          agencyId,
          projectId,
          userId: profile.id,
          wanted: advertsAllowed(STREAM_ESTATE_BILLING_CAP, budgetRead.budget),
        })
      : null;
    if (reservation != null && !reservation.ok) {
      return { ok: false, reason: reservation.reason === 'reached' ? 'reached' : 'unreadable' };
    }
    const billedBefore = billed;
    const result = await runTieredSearch({
      criteria,
      plans: planTiers(criteria, context, passSettings),
      context: { inseeCode: commune.code, origin },
      neighbours,
      fetchPage,
      now,
      cap: reservation?.ok ? reservation.adverts : STREAM_ESTATE_BILLING_CAP,
      filters: passSettings.filters,
    });
    if (reservation?.ok) await settleSearchBudget(reservation.reservationId, billed - billedBefore);
    if (!result.ok)
      return { ok: false, reason: result.reason === 'refused' ? 'refused' : 'failed' };
    return { ok: true, candidates: result, billed: result.billed };
  };
  const passError = (reason: 'reached' | 'unreadable' | 'refused' | 'failed'): string =>
    reason === 'reached'
      ? `${BUDGET_REACHED_LABEL}. Aucune recherche lancée. ${BUDGET_REACHED_HINT}`
      : reason === 'unreadable'
        ? BUDGET_UNREADABLE_MESSAGE
        : reason === 'refused'
          ? 'La recherche a été refusée par le fournisseur des annonces : prévenez l’équipe ACM Studio. Aucun bien n’a été trouvé.'
          : GENERIC_ERROR;

  const first = await runPass(ranges.first);
  if (!first.ok) return { ok: false, error: passError(first.reason) };

  // Les annonces déjà dans le dossier : concurrents, écartés, imports en attente.
  const [known1, known2, known3] = await Promise.all([
    supabase
      .from('comparables')
      .select('listing_url')
      .eq('project_id', projectId)
      .eq('agency_id', agencyId)
      .not('listing_url', 'is', null),
    supabase
      .from('competitor_decisions')
      .select('listing_url')
      .eq('project_id', projectId)
      .eq('agency_id', agencyId),
    supabase
      .from('pending_competitor_imports')
      .select('listing_url')
      .eq('project_id', projectId)
      .eq('agency_id', agencyId),
  ]);
  const knownUrls = [...(known1.data ?? []), ...(known2.data ?? []), ...(known3.data ?? [])]
    .map((row) => row.listing_url)
    .filter((url): url is string => typeof url === 'string' && url !== '');
  const filterRange = (candidates: Parameters<typeof filterNewcomers>[0], range: PriceRange) =>
    filterNewcomers(candidates, {
      concludedAt: conclusion.concluded_at as string,
      knownUrls,
      priceCeiling: range.max,
      priceFloor: range.min,
    });
  let filtered = filterRange(first.candidates.candidates, ranges.first);
  let widened = false;
  let widenRefused: 'budget' | 'failed' | null = null;
  // Moins de 3 biens : la recherche s'élargit à −10 %, sur la tranche du dessous.
  if (filtered.newcomers.length < NEWCOMERS_MIN_FOUND && ranges.widened.min <= ranges.widened.max) {
    const second = await runPass(ranges.widened);
    if (second.ok) {
      widened = true;
      const more = filterRange(second.candidates.candidates, ranges.widened);
      const seen = new Set(filtered.newcomers.map((item) => item.url));
      filtered = {
        ...filtered,
        newcomers: [
          ...filtered.newcomers,
          ...more.newcomers.filter((item) => !seen.has(item.url)),
        ].sort((x, y) => x.price - y.price),
        excludedNoDate: filtered.excludedNoDate + more.excludedNoDate,
        excludedKnown: filtered.excludedKnown + more.excludedKnown,
        excludedUnderPrice: more.excludedUnderPrice,
      };
    } else {
      widenRefused =
        second.reason === 'reached' || second.reason === 'unreadable' ? 'budget' : 'failed';
    }
  }
  const priceRange: PriceRange = {
    min: widened ? ranges.widened.min : ranges.first.min,
    max: priceCeiling,
  };
  // Le compteur de toutes les pages payées, celles d'une passe en échec comprises (M100).
  const billedCount = demo ? 0 : billed;
  // Le point du jour, réécrit avec « recherche faite » (décision de Jean-Guy, 29/10).
  const written = await writeMarketUpdate({
    supabase,
    service: createServiceRoleClient(),
    agencyId,
    projectId,
    profileId: profile.id,
    newcomersSearch: {
      madeAt: now.toISOString(),
      found: filtered.newcomers.length,
      billed: billedCount,
      limitedToPrice: true,
      excludedNoDate: filtered.excludedNoDate,
      priceRange,
      widened,
      excludedUnderPrice: filtered.excludedUnderPrice,
      // Les propositions restent sur le point jusqu'à « Écarter » ou au point suivant (Jean-Guy,
      // 30/10) ; sans titre : il ne sert à rien ici.
      // Chaque proposition est revalidée par son schéma avant l'écriture : une proposition
      // illisible est laissée de côté, jamais tout le point (M105 : on ne repaie pas).
      proposed: filtered.newcomers.flatMap((item) => {
        const parsed = newcomerProposalSchema.safeParse({
          ...item,
          snapshot: { ...item.snapshot, title: null },
        });
        return parsed.success ? [parsed.data] : [];
      }),
    },
  });
  revalidatePath('/suivi');
  revalidatePath(`/builder/${projectId}/point-marche`);
  return {
    ok: true,
    newcomers: filtered.newcomers,
    found: filtered.newcomers.length,
    billed: billedCount,
    excludedNoDate: filtered.excludedNoDate,
    excludedKnown: filtered.excludedKnown,
    concludedAt: conclusion.concluded_at,
    priceCeiling,
    priceRange,
    widened,
    widenRefused,
    updateId: written?.updateId ?? null,
    line: written?.line ?? null,
  };
}
