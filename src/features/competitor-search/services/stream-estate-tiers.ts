import { distanceMeters } from '@/features/competitor-search/services/proximity';
import {
  communeCentre,
  type GeoCommune,
} from '@/features/competitor-search/services/resolve-insee-code';
import {
  baseStreamEstateQuery,
  parseStreamEstateResponse,
  STREAM_ESTATE_PAGE_SIZE,
} from '@/features/competitor-search/services/stream-estate';
import type {
  CompetitorCandidate,
  CompetitorSearchCriteria,
  GeoPoint,
  StreamEstateTier,
} from '@/features/competitor-search/types';
import { identicalSurfaceTolerance } from '@/features/competitor-search/utils/surface-tolerance';

// MISSION 71 — LA RECHERCHE STREAM ESTATE PAR CRANS (décision de Laurent, 06/10). Partie PURE :
// le plan des crans, les paramètres de chaque requête, et la conduite de la recherche avec une
// lecture de page INJECTÉE (le réseau et la clé restent dans l'action ; les tests rejouent des
// réponses enregistrées).
//
// On commence par l'identique et on ne desserre que s'il manque des biens ; on s'arrête dès qu'on
// a 10 biens anciens, importables et vivants. L'emplacement d'abord : on élargit ce qui change peu
// la comparaison sans quitter le quartier (plus grand, une pièce de plus), puis on s'éloigne :
//   1. identique : < 1 km, dans la commune ; mêmes pièces, surface ±10 % (±3 m² au moins),
//      fourchette stricte ;
//   2. plus grand : < 1 km, surface de +10 % à +25 % (jamais plus petit) ;
//   3. une pièce de plus : < 1 km (surface identique ou plus grande) ;
//   4. même ville < 2 km, 5. même ville < 5 km (avec les élargissements 2 et 3) ;
//   6. rayon de 10 km, communes voisines comprises ;
//   7. prix à ±5 % hors fourchette, en dernier recours (10 km).
//
// LE SECTEUR (mesures du 06/10) : l'API sait chercher dans un rayon (`lat`, `lon`, `radius` en km)
// et exclure des communes (`excludedInseeCodes[]`), mais IGNORE le rayon dès qu'on lui donne
// `includedInseeCodes[]`. « Dans la commune et à moins de N km » = le cercle, MOINS les communes
// voisines qui peuvent le toucher (communes du département dont le centre est à moins de N + 8 km
// du bien, geo.api.gouv.fr). Le code INSEE renvoyé est revérifié ici : ce qui passerait (commune
// d'un département voisin…) est écarté, compté, et reste facturé. Si la liste n'est pas
// disponible ou que l'API la refuse, le cran cherche le cercle seul et l'écran le dit.
//
// FACTURATION : les tranches de surface, de pièces et de prix sont disjointes (bornes entières :
// l'API arrondit une borne décimale, mesuré le 06/10). Un cercle plus large refacture les biens du
// cercle précédent (on ne peut pas exclure un rayon) : accepté. Les pages d'un cran sont épuisées
// avant de passer au suivant. Plafond de 60 annonces facturées par recherche.

export const STREAM_ESTATE_TARGET = 10;
export const STREAM_ESTATE_BILLING_CAP = 60;
// Prix d'une annonce renvoyée (essai Stream Estate) : 37 annonces = 0,37 €.
export const STREAM_ESTATE_PRICE_PER_ADVERT_EUR = 0.01;
// Marge autour du cercle pour lister les communes voisines : une commune dont le CENTRE est à
// moins de (rayon + 8 km) du bien peut avoir une partie de son territoire dans le cercle.
export const NEIGHBOUR_MARGIN_KM = 8;
const MAX_PAGES_PER_QUERY = 10;

export type Range = { min: number; max: number };

// Où chercher : toute la commune (code INSEE), ou un cercle autour d'un point. `withinCommune` :
// le cercle est privé des communes voisines (crans 1 à 5) ; sinon il les comprend (crans 6 et 7).
export type TierArea =
  { kind: 'commune' } | { kind: 'circle'; radiusKm: number; withinCommune: boolean };

export type TierPlan = {
  tier: StreamEstateTier;
  area: TierArea;
  surface: Range | null; // null : le bien vendeur n'a pas de surface, on ne filtre pas
  rooms: Range | null;
  // Une requête par tranche de prix ([] : pas de fourchette, pas de filtre prix).
  prices: Range[];
  // Un bien sans position fiable n'entre qu'avec un cran « toute la commune » (sans quartier :
  // bien vendeur non localisé) ou à partir du cran 5. Il porte alors « quartier non vérifié ».
  acceptsUnverifiedPosition: boolean;
};

export type TierSlices = {
  identicalSurface: Range | null;
  biggerSurface: Range | null; // null : rien entre +10 % et +25 % (petit bien, plancher ±3 m²)
  rooms: number | null;
  advisorPrices: Range | null;
  outsidePrices: Range[]; // ±5 % hors fourchette, en dessous puis au-dessus
};

export function tierSlices(criteria: CompetitorSearchCriteria): TierSlices {
  const surface =
    criteria.surfaceArea != null && criteria.surfaceArea > 0 ? criteria.surfaceArea : null;
  let identicalSurface: Range | null = null;
  let biggerSurface: Range | null = null;
  if (surface != null) {
    const tolerance = identicalSurfaceTolerance(surface);
    identicalSurface = {
      min: Math.floor(surface - tolerance),
      max: Math.ceil(surface + tolerance),
    };
    const biggerMax = Math.floor(surface * 1.25);
    if (biggerMax > identicalSurface.max) {
      biggerSurface = { min: identicalSurface.max + 1, max: biggerMax };
    }
  }

  const { advisorPriceMin: min, advisorPriceMax: max } = criteria;
  const advisorPrices = min != null || max != null ? { min: min ?? max!, max: max ?? min! } : null;
  const outsidePrices = advisorPrices
    ? [
        { min: Math.floor(advisorPrices.min * 0.95), max: advisorPrices.min - 1 },
        { min: advisorPrices.max + 1, max: Math.ceil(advisorPrices.max * 1.05) },
      ].filter((range) => range.min <= range.max)
    : [];

  return {
    identicalSurface,
    biggerSurface,
    rooms: criteria.roomsCount ?? null,
    advisorPrices,
    outsidePrices,
  };
}

// Le plan des crans. `located` : l'adresse du bien est géocodée sûrement (règle de
// geocode-subject) — sinon il n'y a pas de quartier : les crans 1 à 3 prennent toute la commune,
// les crans 4 et 5 sautent, et le rayon de 10 km part du centre de la commune (`hasCentre`).
export function planTiers(
  criteria: CompetitorSearchCriteria,
  options: { located: boolean; hasCentre: boolean },
): TierPlan[] {
  const s = tierSlices(criteria);
  const surfaceAny: Range | null =
    s.identicalSurface && s.biggerSurface
      ? { min: s.identicalSurface.min, max: s.biggerSurface.max }
      : s.identicalSurface;
  const sameRooms: Range | null = s.rooms != null ? { min: s.rooms, max: s.rooms } : null;
  const plusOneRoom: Range | null = s.rooms != null ? { min: s.rooms + 1, max: s.rooms + 1 } : null;
  const roomsAny: Range | null = s.rooms != null ? { min: s.rooms, max: s.rooms + 1 } : null;
  const inRange = s.advisorPrices ? [s.advisorPrices] : [];

  const neighbourhood: TierArea = options.located
    ? { kind: 'circle', radiusKm: 1, withinCommune: true }
    : { kind: 'commune' };
  const wholeCommune = !options.located;
  const plans: TierPlan[] = [
    {
      tier: 1,
      area: neighbourhood,
      surface: s.identicalSurface,
      rooms: sameRooms,
      prices: inRange,
      acceptsUnverifiedPosition: wholeCommune,
    },
  ];
  if (s.biggerSurface) {
    plans.push({
      tier: 2,
      area: neighbourhood,
      surface: s.biggerSurface,
      rooms: sameRooms,
      prices: inRange,
      acceptsUnverifiedPosition: wholeCommune,
    });
  }
  if (plusOneRoom) {
    plans.push({
      tier: 3,
      area: neighbourhood,
      surface: surfaceAny,
      rooms: plusOneRoom,
      prices: inRange,
      acceptsUnverifiedPosition: wholeCommune,
    });
  }
  if (options.located) {
    plans.push(
      {
        tier: 4,
        area: { kind: 'circle', radiusKm: 2, withinCommune: true },
        surface: surfaceAny,
        rooms: roomsAny,
        prices: inRange,
        acceptsUnverifiedPosition: false,
      },
      {
        tier: 5,
        area: { kind: 'circle', radiusKm: 5, withinCommune: true },
        surface: surfaceAny,
        rooms: roomsAny,
        prices: inRange,
        acceptsUnverifiedPosition: true,
      },
    );
  }
  if (options.located || options.hasCentre) {
    plans.push({
      tier: 6,
      area: { kind: 'circle', radiusKm: 10, withinCommune: false },
      surface: surfaceAny,
      rooms: roomsAny,
      prices: inRange,
      acceptsUnverifiedPosition: true,
    });
    if (s.outsidePrices.length > 0) {
      plans.push({
        tier: 7,
        area: { kind: 'circle', radiusKm: 10, withinCommune: false },
        surface: surfaceAny,
        rooms: roomsAny,
        prices: s.outsidePrices,
        acceptsUnverifiedPosition: true,
      });
    }
  }
  return plans;
}

// Les communes du département qui peuvent toucher un cercle de `radiusKm` autour du bien : leur
// centre est à moins de rayon + 8 km. La commune du bien n'en fait jamais partie.
export function neighbourInseeCodes(
  communes: GeoCommune[],
  inseeCode: string,
  point: GeoPoint,
  radiusKm: number,
): string[] {
  const limit = (radiusKm + NEIGHBOUR_MARGIN_KM) * 1000;
  return communes
    .filter((commune) => commune.code !== inseeCode)
    .filter((commune) => {
      const centre = communeCentre(commune);
      return centre != null && distanceMeters(point, centre) < limit;
    })
    .map((commune) => commune.code)
    .sort();
}

export type TierQueryContext = {
  inseeCode: string;
  // Le centre des cercles : l'adresse du bien, sinon le centre de la commune.
  origin: GeoPoint | null;
};

// Les paramètres d'UNE requête : socle + secteur + tranches + page. `excluded` : les communes
// voisines à retirer du cercle (null = cercle seul, repli).
export function tierQueryParams(
  base: URLSearchParams,
  plan: TierPlan,
  price: Range | null,
  context: TierQueryContext,
  excluded: string[] | null,
  page: number,
  itemsPerPage: number,
): URLSearchParams {
  const params = new URLSearchParams(base);
  if (plan.area.kind === 'commune') {
    params.append('includedInseeCodes[]', context.inseeCode);
  } else if (context.origin) {
    params.append('lat', String(context.origin.lat));
    params.append('lon', String(context.origin.lon));
    params.append('radius', String(plan.area.radiusKm));
    for (const code of excluded ?? []) params.append('excludedInseeCodes[]', code);
  }
  if (plan.rooms) {
    params.append('roomMin', String(plan.rooms.min));
    params.append('roomMax', String(plan.rooms.max));
  }
  if (plan.surface) {
    params.append('surfaceMin', String(plan.surface.min));
    params.append('surfaceMax', String(plan.surface.max));
  }
  if (price) {
    params.append('budgetMin', String(price.min));
    params.append('budgetMax', String(price.max));
  }
  params.append('itemsPerPage', String(itemsPerPage));
  if (page > 1) params.append('page', String(page));
  return params;
}

export type StreamEstatePage = { ok: true; json: unknown } | { ok: false; refused: boolean }; // refused : 401/403 (clé, crédits)

export type FetchStreamEstatePage = (params: URLSearchParams) => Promise<StreamEstatePage>;

export type TierReport = {
  tier: StreamEstateTier;
  billed: number;
  kept: number; // biens retenus à ce cran (anciens et neufs)
  // Cercle cherché sans exclure les communes voisines (liste indisponible ou refusée) : les biens
  // d'ailleurs ont été écartés de notre côté, mais facturés.
  fallback: boolean;
};

export type TieredSearchCounts = {
  unreadable: number;
  outsideWhitelist: number;
  expiredOrigin: number;
  otherCommune: number; // renvoyés hors de la commune à un cran « même ville » : écartés, facturés
  unverifiedPosition: number; // sans position fiable à un cran de quartier : écartés, facturés
};

export type TieredSearchOutcome =
  | {
      ok: true;
      candidates: CompetitorCandidate[]; // dans l'ordre des crans ; chacun porte son cran
      billed: number;
      // Pourquoi la recherche s'est arrêtée : 10 biens anciens atteints, plafond de 60, plus rien
      // après le dernier cran, ou erreur de l'API en route (on garde ce qu'on a).
      stop: 'target' | 'cap' | 'exhausted' | 'error';
      tiers: TierReport[];
      counts: TieredSearchCounts;
    }
  | { ok: false; reason: 'refused' | 'failed' };

export type TieredSearchInput = {
  criteria: CompetitorSearchCriteria;
  plans: TierPlan[];
  context: TierQueryContext;
  // Les communes voisines à exclure pour un rayon ; null = liste indisponible (repli : cercle seul).
  neighbours: ((radiusKm: number) => string[]) | null;
  fetchPage: FetchStreamEstatePage;
  now: Date;
  target?: number;
  cap?: number;
};

export async function runTieredSearch(input: TieredSearchInput): Promise<TieredSearchOutcome> {
  const target = input.target ?? STREAM_ESTATE_TARGET;
  const cap = input.cap ?? STREAM_ESTATE_BILLING_CAP;
  const base = baseStreamEstateQuery(input.criteria, input.now);
  if (!base.ok) return { ok: false, reason: 'failed' };

  const candidates: CompetitorCandidate[] = [];
  const keys = new Set<string>();
  const seenLocations = new Map<string, GeoPoint | null>();
  const counts: TieredSearchCounts = {
    unreadable: 0,
    outsideWhitelist: 0,
    expiredOrigin: 0,
    otherCommune: 0,
    unverifiedPosition: 0,
  };
  // Écartés par bien distinct : un bien sans position écarté à 1 km peut entrer au cran 5.
  const otherCommune = new Set<string>();
  const unverifiedPosition = new Set<string>();
  const tiers: TierReport[] = [];
  let billed = 0;
  const oldCount = () => candidates.filter((candidate) => !candidate.isNewBuild).length;

  const finish = (stop: 'target' | 'cap' | 'exhausted' | 'error'): TieredSearchOutcome => {
    counts.otherCommune = [...otherCommune].filter((key) => !keys.has(key)).length;
    counts.unverifiedPosition = [...unverifiedPosition].filter((key) => !keys.has(key)).length;
    return { ok: true, candidates, billed, stop, tiers, counts };
  };

  for (const plan of input.plans) {
    const report: TierReport = { tier: plan.tier, billed: 0, kept: 0, fallback: false };
    tiers.push(report);
    const excludeNeighbours = plan.area.kind === 'circle' && plan.area.withinCommune;
    let excluded: string[] | null = null;
    if (excludeNeighbours && plan.area.kind === 'circle') {
      if (input.neighbours) excluded = input.neighbours(plan.area.radiusKm);
      else report.fallback = true;
    }
    const verifyCommune = plan.area.kind === 'commune' || excludeNeighbours;

    for (const price of plan.prices.length > 0 ? plan.prices : [null]) {
      for (let page = 1; page <= MAX_PAGES_PER_QUERY; page += 1) {
        const remaining = cap - billed;
        if (remaining <= 0) return finish('cap');
        const itemsPerPage =
          page === 1 ? Math.min(STREAM_ESTATE_PAGE_SIZE, remaining) : STREAM_ESTATE_PAGE_SIZE;
        // Une page suivante doit garder la même taille (sinon le décalage de page change) : sous
        // le plafond restant, on s'arrête.
        if (itemsPerPage > remaining) return finish('cap');

        const params = () =>
          tierQueryParams(base.params, plan, price, input.context, excluded, page, itemsPerPage);
        let response = await input.fetchPage(params());
        if (!response.ok && !response.refused && excluded != null && excluded.length > 0) {
          // L'API refuse la liste des communes voisines (adresse trop longue, erreur) : repli sur
          // le cercle seul pour ce cran, dit dans le bilan.
          excluded = null;
          report.fallback = true;
          response = await input.fetchPage(params());
        }
        if (!response.ok) {
          if (response.refused) return { ok: false, reason: 'refused' };
          return candidates.length > 0 ? finish('error') : { ok: false, reason: 'failed' };
        }
        const parsed = parseStreamEstateResponse(response.json, input.now, seenLocations);
        if (parsed == null) {
          return candidates.length > 0 ? finish('error') : { ok: false, reason: 'failed' };
        }
        billed += parsed.billed;
        report.billed += parsed.billed;
        counts.unreadable += parsed.unreadable;
        counts.outsideWhitelist += parsed.outsideWhitelist;
        counts.expiredOrigin += parsed.expiredOrigin;
        for (const location of parsed.locations) seenLocations.set(location.uuid, location.point);

        for (const candidate of parsed.candidates) {
          if (keys.has(candidate.key!)) continue; // déjà trouvé à un cran précédent
          const insee = candidate.streamEstate?.inseeCode ?? null;
          // Commune absente : portée par la provenance seulement quand on a cherché PAR la commune.
          if (verifyCommune && insee !== input.context.inseeCode) {
            if (!(plan.area.kind === 'commune' && insee == null)) {
              otherCommune.add(candidate.key!);
              continue;
            }
          }
          if (!plan.acceptsUnverifiedPosition && candidate.features?.location == null) {
            unverifiedPosition.add(candidate.key!);
            continue;
          }
          keys.add(candidate.key!);
          candidates.push({
            ...candidate,
            streamEstate: { ...candidate.streamEstate!, tier: plan.tier },
          });
          report.kept += 1;
        }

        if (oldCount() >= target) return finish('target');
        if (parsed.billed < itemsPerPage) break; // dernière page de cette requête
      }
    }
  }
  return finish('exhausted');
}
