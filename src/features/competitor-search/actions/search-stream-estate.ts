'use server';

import { z } from 'zod';

import { loadSearchCriteria } from '@/features/competitor-search/queries/load-search-criteria';
import {
  fetchDepartmentCommunes,
  geocodeSubject,
  resolveCommune,
} from '@/features/competitor-search/services/fetch-geo';
import {
  baseStreamEstateQuery,
  STREAM_ESTATE_ENDPOINT,
} from '@/features/competitor-search/services/stream-estate';
import { streamEstateApiKey } from '@/features/competitor-search/services/stream-estate-config';
import {
  neighbourInseeCodes,
  planTiers,
  runTieredSearch,
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
    return { ok: false, error: 'L’essai Stream Estate n’est pas activé.' };
  }
  const parsedResume = resume == null ? null : resumeSchema.safeParse(resume);
  if (parsedResume != null && !parsedResume.success) {
    return { ok: false, error: GENERIC_ERROR };
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
  const { criteria } = loaded;

  // 1. La commune (code INSEE, centre, département) — sans code fiable, on ne cherche pas.
  const commune = await resolveCommune(criteria.city, criteria.postalCode);
  if (!commune.ok) {
    const where = [criteria.city, criteria.postalCode].filter(Boolean).join(' ');
    const reasons: Record<typeof commune.reason, string> = {
      unavailable:
        'Le code INSEE de la commune n’a pas pu être obtenu (geo.api.gouv.fr). Réessayez.',
      arrondissements: `${criteria.city} est découpée en arrondissements chez Stream Estate : l’essai ne sait pas encore chercher par arrondissement. Aucune recherche lancée.`,
      ambiguous: `Pas de code INSEE fiable pour « ${where} » (plusieurs communes possibles). Vérifiez la ville et le code postal du bien vendeur. Aucune recherche lancée.`,
      not_found: `Pas de code INSEE fiable pour « ${where} » (commune introuvable). Vérifiez la ville et le code postal du bien vendeur. Aucune recherche lancée.`,
    };
    return { ok: false, error: reasons[commune.reason] };
  }

  const now = new Date();
  if (!baseStreamEstateQuery(criteria, now).ok) {
    return {
      ok: false,
      error:
        'L’essai Stream Estate ne cherche que des appartements et des maisons : précisez le type du bien vendeur.',
    };
  }

  // 2. Le quartier : l'adresse du bien géocodée sûrement, sinon le centre de la commune (10 km).
  // Avec le nom OFFICIEL de la commune : « St Laurent du Var » fait tomber le score du géocodage
  // sous 0,8 (0,74 contre 0,83 pour la même adresse, mesuré le 06/10) — et le quartier avec.
  const geocode = await geocodeSubject(loaded.address, criteria.postalCode, commune.name);
  const subjectPoint = geocode.ok ? geocode.point : null;
  const origin = subjectPoint ?? commune.centre;

  // 3. Les communes voisines, pour retirer du cercle ce qui n'est pas la commune du bien.
  const departmentCommunes =
    subjectPoint != null && commune.departement != null
      ? await fetchDepartmentCommunes(commune.departement)
      : null;
  const neighbours =
    subjectPoint != null && departmentCommunes != null
      ? (radiusKm: number) =>
          neighbourInseeCodes(departmentCommunes, commune.code, subjectPoint, radiusKm)
      : null;

  const fetchPage: FetchStreamEstatePage = async (params) => {
    try {
      const response = await fetch(`${STREAM_ESTATE_ENDPOINT}?${params}`, {
        headers: { 'X-API-KEY': apiKey, Accept: 'application/ld+json' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: 'no-store',
      });
      if (response.status === 401 || response.status === 403) {
        console.error('[searchStreamEstate] refus de l’API', response.status);
        return { ok: false, refused: true };
      }
      if (!response.ok) throw new Error(`Stream Estate ${response.status}`);
      return { ok: true, json: await response.json() };
    } catch (error) {
      console.error(
        '[searchStreamEstate] appel API',
        error instanceof Error ? error.message : error,
      );
      return { ok: false, refused: false };
    }
  };

  // 4. Les crans, du plus proche au plus large — ou la reprise, 20 annonces de plus.
  const plans = planTiers(criteria, { located: subjectPoint != null, hasCentre: origin != null });
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
  const outcome = await runTieredSearch({
    criteria,
    plans,
    context: { inseeCode: commune.code, origin },
    neighbours,
    fetchPage,
    now,
    ...(resumeFrom != null
      ? {
          cap: STREAM_ESTATE_MORE_CAP,
          resume: {
            cursor: { ...resumeFrom.cursor, tier: plans[resumeFrom.cursor.plan].tier },
            memory: resumeFrom.memory,
          },
        }
      : {}),
  });
  if (!outcome.ok) {
    return {
      ok: false,
      error:
        outcome.reason === 'refused'
          ? 'Stream Estate a refusé la recherche (clé invalide ou crédits épuisés). Vérifiez le solde dans la console Stream Estate.'
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
    communeName: commune.name,
    inseeCode: commune.code,
  };
}
