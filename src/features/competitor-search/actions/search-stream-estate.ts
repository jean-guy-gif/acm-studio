'use server';

import { getProject } from '@/features/projects/queries/get-project';
import { EXAMPLE_SEARCH_MESSAGE } from '@/features/welcome/services/example-exclusion';
import { z } from 'zod';

import { loadSearchCriteria } from '@/features/competitor-search/queries/load-search-criteria';
import {
  fetchDepartmentCommunes,
  geocodeSubject,
  resolveCommune,
} from '@/features/competitor-search/services/fetch-geo';
import {
  baseStreamEstateQuery,
  billedAdverts,
  STREAM_ESTATE_ENDPOINT,
} from '@/features/competitor-search/services/stream-estate';
import {
  describeSearchCriteria,
  isDefaultSettings,
} from '@/features/competitor-search/services/search-settings';
import { streamEstateApiKey } from '@/features/competitor-search/services/stream-estate-config';
import {
  arrondissementCityInsee,
  arrondissementInsee,
  neighbourArrondissements,
  siblingArrondissements,
} from '@/features/competitor-search/utils/arrondissements';
import {
  neighbourInseeCodes,
  planTiers,
  runTieredSearch,
  searchDefaults,
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
  STREAM_ESTATE_SEARCH_BUTTON,
  STREAM_ESTATE_SOURCE,
  type PortalSearchResult,
} from '@/features/competitor-search/types';
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
import { reportServerError } from '@/lib/app-errors/report-server-error';
import { getProfile } from '@/lib/auth/get-profile';

export type StreamEstateSearchResult =
  | {
      ok: true;
      portal: PortalSearchResult;
      billed: number; // annonces renvoyées = annonces facturées, tous crans confondus
      // Pourquoi la recherche s'est arrêtée (10 atteints, plafond, plus rien, erreur en route).
      stop: 'target' | 'cap' | 'exhausted' | 'error';
      // Au plafond : où « Chercher encore » reprendra (même cran, page suivante). null sinon.
      cursor: TierCursor | null;
      tiers: TierReport[];
      counts: TieredSearchCounts;
      newBuild: number; // biens neufs parmi les candidats, tenus en réserve par le classement
      // L'adresse du bien est-elle géocodée sûrement ? Sinon, pas de quartier (crans 4 et 5 sautés).
      located: boolean;
      communeName: string;
      inseeCode: string;
      // Mission 99 — les critères de départ de cette recherche, tels que le bilan les dit, et si
      // le conseiller en a réglé au moins un.
      criteriaUsed: string[];
      customSettings: boolean;
      // Mission 99 — le bien est dans un arrondissement de Paris, Lyon ou Marseille.
      arrondissement: boolean;
    }
  | { ok: false; error: string };

// « Chercher encore » — ce que l'écran renvoie pour reprendre. Venu du navigateur : revalidé ici,
// borné, et seulement pour reprendre (les critères, eux, sont relus du bien vendeur).
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

export type StreamEstateResume = { cursor: TierCursor; memory: TieredSearchMemory };

const TIMEOUT_MS = 10_000;
const GENERIC_ERROR = 'La recherche Stream Estate a échoué. Réessayez.';

// MISSION 71 — la recherche Stream Estate PAR CRANS, côté serveur : on commence par l'identique et
// on ne desserre que s'il manque des biens, jusqu'à 10 biens anciens importables et vivants, au
// plus 60 annonces facturées (stream-estate-tiers.ts). Les critères viennent du bien vendeur
// (jamais du client), la clé reste ici. On renvoie des CANDIDATS (même forme que ceux des
// portails) : le classement et la décision restent ceux de l'écran. Rien n'est écrit.
// `resume` : « Chercher encore » — reprendre exactement où la recherche s'était arrêtée au
// plafond (même cran, page suivante), pour 20 annonces de plus.
export async function searchStreamEstate(
  projectId: string,
  resume?: StreamEstateResume | null,
): Promise<StreamEstateSearchResult> {
  const apiKey = streamEstateApiKey();
  if (apiKey == null) {
    return {
      ok: false,
      error: 'La recherche de concurrents n’est pas activée : prévenez l’équipe ACM Studio.',
    };
  }
  const parsedResume = resume == null ? null : resumeSchema.safeParse(resume);
  if (parsedResume != null && !parsedResume.success) {
    return { ok: false, error: GENERIC_ERROR };
  }

  // Mission 97 — un dossier d'exemple ne déclenche aucun appel facturé, même par appel direct.
  const project = await getProject(projectId);
  if (project?.is_example) {
    return { ok: false, error: EXAMPLE_SEARCH_MESSAGE };
  }

  // Mission 100 — le plafond mensuel de l'agence, vérifié AVANT tout appel payant. Un budget
  // illisible n'est pas un budget libre : la recherche ne part pas.
  const profile = await getProfile();
  if (!profile || profile.removed_at) {
    return { ok: false, error: 'Vous devez être connecté.' };
  }
  const budgetRead = await getSearchBudget(profile.agency_id);
  if (!budgetRead.ok) {
    return { ok: false, error: BUDGET_UNREADABLE_MESSAGE };
  }
  if (budgetRead.budget.reached) {
    return {
      ok: false,
      error: `${BUDGET_REACHED_LABEL}. Aucune recherche lancée. ${BUDGET_REACHED_HINT}`,
    };
  }

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
  const { criteria, settings } = loaded;

  // 1. La commune (code INSEE, centre, département) — sans code fiable, on ne cherche pas.
  const commune = await resolveCommune(criteria.city, criteria.postalCode);
  if (!commune.ok) {
    const where = [criteria.city, criteria.postalCode].filter(Boolean).join(' ');
    const reasons: Record<typeof commune.reason, string> = {
      unavailable:
        'Le service des communes ne répond pas : réessayez dans un instant. Aucune recherche lancée.',
      arrondissements: `${criteria.city} se cherche par arrondissement : indiquez le code postal du bien vendeur (75015, 69003, 13008…) ou son arrondissement dans la ville (« Paris 15e »), et vérifiez qu’ils disent le même. Aucune recherche lancée.`,
      ambiguous: `Plusieurs communes répondent à « ${where} » : vérifiez la ville et le code postal du bien vendeur. Aucune recherche lancée.`,
      not_found: `Commune introuvable (« ${where} ») : vérifiez la ville et le code postal du bien vendeur. Aucune recherche lancée.`,
    };
    return { ok: false, error: reasons[commune.reason] };
  }

  const now = new Date();
  if (!baseStreamEstateQuery(criteria, now).ok) {
    return {
      ok: false,
      error:
        'La recherche ne trouve que des appartements et des maisons : précisez le type du bien vendeur.',
    };
  }

  // 2. Le quartier : l'adresse du bien géocodée sûrement, sinon le centre de la commune (10 km).
  // Avec le nom OFFICIEL de la commune : « St Laurent du Var » fait tomber le score du géocodage
  // sous 0,8 (0,74 contre 0,83 pour la même adresse, mesuré le 06/10) — et le quartier avec.
  const geocode = await geocodeSubject(loaded.address, criteria.postalCode, commune.name);
  const subjectPoint = geocode.ok ? geocode.point : null;
  const origin = subjectPoint ?? commune.centre;
  // Mission 99 — un rayon réglé se mesure « autour du bien » : sans adresse reconnue, pas de
  // centre — on le dit plutôt que de mesurer depuis le centre de la commune. Aucun appel payant.
  if (settings.sector?.kind === 'radius' && subjectPoint == null) {
    return {
      ok: false,
      error:
        'Le rayon se mesure autour du bien : son adresse n’a pas été reconnue avec certitude. Précisez-la sur la fiche (numéro et rue), ou choisissez « Toute la commune » dans les réglages. Aucune recherche lancée.',
    };
  }

  // 3. Les communes voisines, pour retirer du cercle ce qui n'est pas la commune du bien.
  const departmentCommunes =
    subjectPoint != null && commune.departement != null
      ? await fetchDepartmentCommunes(commune.departement)
      : null;
  // Mission 99 — dans une ville à arrondissements, les autres arrondissements sont exclus du
  // cercle comme des communes voisines, et l'élargissement « arrondissements voisins » les ajoute.
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

  // Mission 100 — ce que cette recherche a réellement facturé, compté sur chaque réponse.
  let billed = 0;
  const fetchPage: FetchStreamEstatePage = async (params) => {
    try {
      const response = await fetch(`${STREAM_ESTATE_ENDPOINT}?${params}`, {
        headers: { 'X-API-KEY': apiKey, Accept: 'application/ld+json' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: 'no-store',
      });
      if (response.status === 401 || response.status === 403) {
        await reportServerError(
          'searchStreamEstate',
          new Error(`refus de l’API (${response.status})`),
        );
        return { ok: false, refused: true };
      }
      if (!response.ok) throw new Error(`Stream Estate ${response.status}`);
      const json: unknown = await response.json();
      billed += billedAdverts(json);
      return { ok: true, json };
    } catch (error) {
      await reportServerError('searchStreamEstate', error);
      return { ok: false, refused: false };
    }
  };

  // 4. Les crans, du plus proche au plus large — ou la reprise, 20 annonces de plus.
  const plans = planTiers(
    criteria,
    {
      located: subjectPoint != null,
      hasCentre: origin != null,
      arrondissement: arrondissement
        ? {
            code: commune.code,
            neighbours: neighbourArrondissements(arrondissement).map(arrondissementInsee),
          }
        : null,
    },
    settings,
  );
  const resumeFrom = parsedResume?.data ?? null;
  if (
    resumeFrom != null &&
    (resumeFrom.cursor.plan >= plans.length ||
      plans[resumeFrom.cursor.plan].tier !== resumeFrom.cursor.tier)
  ) {
    // Le bien vendeur a changé depuis (adresse, pièces, fourchette) : les crans ne sont plus les
    // mêmes, on ne reprend pas à l'aveugle.
    return {
      ok: false,
      error: `Le bien vendeur a changé depuis la recherche : relancez « ${STREAM_ESTATE_SEARCH_BUTTON} ».`,
    };
  }
  // Mission 105 — le coût maximal est réservé AVANT l'appel payant, compteur de l'agence
  // verrouillé : deux recherches simultanées ne franchissent pas le plafond.
  const reservation = await reserveSearchBudget({
    agencyId: profile.agency_id,
    projectId,
    userId: profile.id,
    wanted: advertsAllowed(
      resumeFrom != null ? STREAM_ESTATE_MORE_CAP : STREAM_ESTATE_BILLING_CAP,
      budgetRead.budget,
    ),
  });
  if (!reservation.ok) {
    return {
      ok: false,
      error:
        reservation.reason === 'reached'
          ? `${BUDGET_REACHED_LABEL}. Aucune recherche lancée. ${BUDGET_REACHED_HINT}`
          : BUDGET_UNREADABLE_MESSAGE,
    };
  }
  const outcome = await runTieredSearch({
    criteria,
    plans,
    context: { inseeCode: commune.code, origin },
    neighbours,
    fetchPage,
    now,
    // Mission 105 — jamais plus que ce qui vient d'être réservé sur le budget du mois.
    cap: reservation.adverts,
    ...(resumeFrom != null
      ? {
          resume: {
            cursor: { ...resumeFrom.cursor, tier: plans[resumeFrom.cursor.plan].tier },
            memory: resumeFrom.memory,
          },
        }
      : {}),
  });
  // Comptée que la recherche ait abouti ou non : ce qui est facturé est dépensé ; le reste de la
  // réservation est rendu.
  await settleSearchBudget(reservation.reservationId, billed);
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
  return {
    ok: true,
    portal: {
      portal: STREAM_ESTATE_SOURCE,
      label: STREAM_ESTATE_LABEL,
      searchUrl: '', // pas de page de recherche publique : l'écran n'affiche pas de lien
      status: candidates.length > 0 ? 'ok' : 'empty',
      message:
        candidates.length > 0 ? null : 'Stream Estate ne renvoie aucun bien pour ces critères.',
      candidates,
    },
    billed: outcome.billed,
    stop: outcome.stop,
    cursor: outcome.cursor,
    tiers: outcome.tiers,
    counts: outcome.counts,
    newBuild: candidates.filter((candidate) => candidate.isNewBuild).length,
    located: subjectPoint != null,
    communeName: commune.display,
    inseeCode: commune.code,
    arrondissement: arrondissement != null,
    criteriaUsed: describeSearchCriteria(
      settings,
      searchDefaults(criteria, subjectPoint != null, arrondissement != null),
    ),
    customSettings: !isDefaultSettings(settings),
  };
}
