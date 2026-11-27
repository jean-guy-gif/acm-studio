'use server';

import { getProject } from '@/features/projects/queries/get-project';
import { EXAMPLE_SEARCH_MESSAGE } from '@/features/welcome/services/example-exclusion';
import { z } from 'zod';

import { loadSearchCriteria } from '@/features/competitor-search/queries/load-search-criteria';
import { geoProvider } from '@/features/competitor-search/services/geo-provider';
import { DEMO_LISTINGS } from '@/features/demo/data/scenarios';
import { demoStreamEstatePage } from '@/features/demo/services/demo-stream-estate';
import { isDemoAgency } from '@/features/demo/services/is-demo-agency';
import {
  baseStreamEstateQuery,
  withoutSheetExtras,
} from '@/features/competitor-search/services/stream-estate';
import { liveStreamEstatePage } from '@/features/competitor-search/services/stream-estate-fetch';
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
import { keepPaidSearchResult } from '@/features/competitor-search/services/keep-paid-result';
import { searchFingerprint } from '@/features/competitor-search/services/paid-search-guard';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

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

const GENERIC_ERROR = 'La recherche Stream Estate a échoué. Réessayez.';

// MISSION 71 — la recherche Stream Estate PAR CRANS, côté serveur : on commence par l'identique et
// on ne desserre que s'il manque des biens, jusqu'à 10 biens anciens importables et vivants, au
// plus 60 annonces facturées (stream-estate-tiers.ts). Les critères viennent du bien vendeur
// (jamais du client), la clé reste ici. On renvoie des CANDIDATS (même forme que ceux des
// portails) : le classement et la décision restent ceux de l'écran. Mission 112 — le résultat
// payé est gardé sur le dossier ici même, avant de répondre (`keepPaidSearchResult`).
// `resume` : « Chercher encore » — reprendre exactement où la recherche s'était arrêtée au
// plafond (même cran, page suivante), pour 20 annonces de plus.
//
// Mission 114 — dans l'AGENCE DE DÉMONSTRATION (repère `agencies.is_demo`, lu ici, jamais reçu du
// navigateur), l'API est remplacée par la recherche simulée : ni clé, ni budget, ni réservation,
// aucun appel ; tout le reste — crans, classement, résultat gardé, « Chercher encore » — est le
// même code. Une agence réelle n'atteint jamais la simulation.
export async function searchStreamEstate(
  projectId: string,
  resume?: StreamEstateResume | null,
): Promise<StreamEstateSearchResult> {
  const parsedResume = resume == null ? null : resumeSchema.safeParse(resume);
  if (parsedResume != null && !parsedResume.success) {
    return { ok: false, error: GENERIC_ERROR };
  }

  // Mission 97 — un dossier d'exemple ne déclenche aucun appel facturé, même par appel direct.
  const project = await getProject(projectId);
  if (project?.is_example) {
    return { ok: false, error: EXAMPLE_SEARCH_MESSAGE };
  }

  const profile = await getProfile();
  if (!profile || profile.removed_at) {
    return { ok: false, error: 'Vous devez être connecté.' };
  }
  const demo = await isDemoAgency(profile.agency_id);
  const apiKey = demo ? null : streamEstateApiKey();
  if (!demo && apiKey == null) {
    return {
      ok: false,
      error: 'La recherche de concurrents n’est pas activée\u00a0: prévenez l’équipe ACM Studio.',
    };
  }

  // Mission 100 — le plafond mensuel de l'agence, vérifié AVANT tout appel payant. Un budget
  // illisible n'est pas un budget libre : la recherche ne part pas. Rien à vérifier en démo :
  // rien n'est payé.
  const budgetRead = demo ? null : await getSearchBudget(profile.agency_id);
  if (budgetRead != null && !budgetRead.ok) {
    return { ok: false, error: BUDGET_UNREADABLE_MESSAGE };
  }
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
          ? 'Renseignez d’abord la ville du bien vendeur\u00a0: la recherche se base sur sa commune.'
          : GENERIC_ERROR,
    };
  }
  const { criteria, settings } = loaded;

  // 1. La commune (code INSEE, centre, département) — sans code fiable, on ne cherche pas.
  const commune = await geo.resolveCommune(criteria.city, criteria.postalCode);
  if (!commune.ok) {
    const where = [criteria.city, criteria.postalCode].filter(Boolean).join(' ');
    const reasons: Record<typeof commune.reason, string> = {
      unavailable:
        'Le service des communes ne répond pas\u00a0: réessayez dans un instant. Aucune recherche lancée.',
      arrondissements: `${criteria.city} se cherche par arrondissement\u00a0: indiquez le code postal du bien vendeur (75015, 69003, 13008…) ou son arrondissement dans la ville («\u00a0Paris 15e\u00a0»), et vérifiez qu’ils disent le même. Aucune recherche lancée.`,
      ambiguous: `Plusieurs communes répondent à «\u00a0${where}\u00a0»\u00a0: vérifiez la ville et le code postal du bien vendeur. Aucune recherche lancée.`,
      not_found: `Commune introuvable («\u00a0${where}\u00a0»)\u00a0: vérifiez la ville et le code postal du bien vendeur. Aucune recherche lancée.`,
    };
    return { ok: false, error: reasons[commune.reason] };
  }

  const now = new Date();
  if (!baseStreamEstateQuery(criteria, now).ok) {
    return {
      ok: false,
      error:
        'La recherche ne trouve que des appartements et des maisons\u00a0: précisez le type du bien vendeur.',
    };
  }

  // 2. Le quartier : l'adresse du bien géocodée sûrement, sinon le centre de la commune (10 km).
  // Avec le nom OFFICIEL de la commune : « St Laurent du Var » fait tomber le score du géocodage
  // sous 0,8 (0,74 contre 0,83 pour la même adresse, mesuré le 06/10) — et le quartier avec.
  const geocode = await geo.geocodeSubject(loaded.address, criteria.postalCode, commune.name);
  const subjectPoint = geocode.ok ? geocode.point : null;
  const origin = subjectPoint ?? commune.centre;
  // Mission 99 — un rayon réglé se mesure « autour du bien » : sans adresse reconnue, pas de
  // centre — on le dit plutôt que de mesurer depuis le centre de la commune. Aucun appel payant.
  if (settings.sector?.kind === 'radius' && subjectPoint == null) {
    return {
      ok: false,
      error:
        'Le rayon se mesure autour du bien\u00a0: son adresse n’a pas été reconnue avec certitude. Précisez-la sur la fiche (numéro et rue), ou choisissez «\u00a0Toute la commune\u00a0» dans les réglages. Aucune recherche lancée.',
    };
  }

  // 3. Les communes voisines, pour retirer du cercle ce qui n'est pas la commune du bien.
  const departmentCommunes =
    subjectPoint != null && commune.departement != null
      ? await geo.fetchDepartmentCommunes(commune.departement)
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
  // Mission 114 — la page simulée répond aux mêmes paramètres, depuis le jeu de données.
  const fetchPage: FetchStreamEstatePage = demo
    ? demoStreamEstatePage({ listings: DEMO_LISTINGS, now })
    : liveStreamEstatePage(apiKey ?? '', (count) => {
        billed += count;
      });

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
      error: `Le bien vendeur a changé depuis la recherche\u00a0: relancez «\u00a0${STREAM_ESTATE_SEARCH_BUTTON}\u00a0».`,
    };
  }
  // Mission 105 — le coût maximal est réservé AVANT l'appel payant, compteur de l'agence
  // verrouillé : deux recherches simultanées ne franchissent pas le plafond. En démo, rien n'est
  // réservé : la recherche simulée s'arrête au même plafond d'annonces, sans compteur.
  const wanted = resumeFrom != null ? STREAM_ESTATE_MORE_CAP : STREAM_ESTATE_BILLING_CAP;
  const reservation = budgetRead?.ok
    ? await reserveSearchBudget({
        agencyId: profile.agency_id,
        projectId,
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
  const outcome = await runTieredSearch({
    criteria,
    plans,
    context: { inseeCode: commune.code, origin },
    neighbours,
    fetchPage,
    now,
    // Mission 105 — jamais plus que ce qui vient d'être réservé sur le budget du mois.
    cap: reservation?.ok ? reservation.adverts : wanted,
    filters: settings.filters,
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
  if (reservation?.ok) await settleSearchBudget(reservation.reservationId, billed);
  if (!outcome.ok) {
    return {
      ok: false,
      error:
        outcome.reason === 'refused'
          ? 'La recherche a été refusée par le fournisseur des annonces\u00a0: prévenez l’équipe ACM Studio. Aucun bien n’a été trouvé.'
          : GENERIC_ERROR,
    };
  }

  // Mission 152 (partie B) — le texte et les photos d'origine ne servent qu'à la fiche complète
  // des écrans acquéreur : la préparation vendeur ne les reçoit ni ne les garde (le navigateur
  // renvoie tous les candidats au classement, M101 / correctif du 12/10 : rien de trop lourd).
  const candidates = outcome.candidates.map(withoutSheetExtras);
  const answer: StreamEstateSearchResult & { ok: true } = {
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
    // Mission 114 — la démonstration ne facture rien : le bilan dit 0 annonce facturée.
    billed: demo ? 0 : outcome.billed,
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
  // Mission 112 — gardé ici, avant de répondre : le navigateur ne fait plus que l'afficher.
  await keepPaidSearchResult({
    supabase: await createClient(),
    agencyId: profile.agency_id,
    profileId: profile.id,
    projectId,
    fingerprint: searchFingerprint(criteria, loaded.address, settings),
    portal: answer.portal,
    note: {
      billed: answer.billed,
      stop: answer.stop,
      cursor: answer.cursor,
      tiers: answer.tiers,
      counts: answer.counts,
      newBuild: answer.newBuild,
      located: answer.located,
      communeName: answer.communeName,
      inseeCode: answer.inseeCode,
      criteriaUsed: answer.criteriaUsed,
      customSettings: answer.customSettings,
      arrondissement: answer.arrondissement,
    },
    resuming: resumeFrom != null,
  });
  return answer;
}
