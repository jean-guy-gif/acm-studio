import { distanceMeters } from '@/features/competitor-search/services/proximity';
import {
  communeCentre,
  type GeoCommune,
} from '@/features/competitor-search/services/resolve-insee-code';
import {
  baseStreamEstateQuery,
  FREED_ORIGIN_SEEN_WITHIN_DAYS,
  isSameStreamEstateProperty,
  ORIGIN_SEEN_WITHIN_DAYS,
  parseStreamEstateResponse,
  STREAM_ESTATE_PAGE_SIZE,
} from '@/features/competitor-search/services/stream-estate';
import type {
  CompetitorCandidate,
  CompetitorSearchCriteria,
  GeoPoint,
  StreamEstateTier,
} from '@/features/competitor-search/types';
import {
  isDefaultSettings,
  type SearchDefaults,
  type SearchSettings,
} from '@/features/competitor-search/services/search-settings';
import {
  appendFilterParams,
  checkFilters,
  isDefaultFilters,
  type SearchFilters,
} from '@/features/competitor-search/services/search-filters';
import { normalizePropertyType } from '@/features/competitor-search/utils/normalize-property-type';
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
//   6. même ville, pièces libres ;
//   7. rayon de 10 km, communes voisines comprises ;
//   8. prix à ±5 % hors fourchette, en dernier recours (10 km).
//
// MISSION 78 — LES PIÈCES SE LIBÈRENT APRÈS LA VILLE À 5 KM, ET LE RESTENT (décision de Laurent,
// 08/10). Mesure du 08/10 : une maison de 9 pièces et 200 m² à Cagnes-sur-Mer ne trouvait RIEN,
// aucune maison à 9 ou 10 pièces n'étant en vente dans la fourchette — les maisons de cette
// surface y ont 5 à 7 pièces. Aux crans 6 à 8 : le nombre de pièces ne filtre plus pour une
// maison ; pour un appartement il ne se libère que vers le haut, jamais moins de pièces (le % de
// correspondance le compte, la carte le dit) ; la surface reste « jamais plus petite » (−10 % au
// plus) mais n'a plus de plafond, la fourchette stricte borne déjà ; et l'annonce d'origine est
// gardée si elle a été revue depuis 21 jours au plus (7 aux crans 1 à 5), la carte disant « vue
// il y a N jours ». Sans nombre de pièces sur le bien vendeur, rien ne se libère : pas de cran 6,
// et les crans 7 et 8 gardent leurs bornes de la mission 71.
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
// cercle précédent (on ne peut pas exclure un rayon) : accepté. Le cran 6 ne redemande pas ce que
// les crans 1 à 5 ont déjà payé : il se découpe en tranches (moins de pièces ; deux pièces de plus
// et au-delà ; mêmes pièces mais plus grand que +25 %). Les pages d'un cran sont épuisées
// avant de passer au suivant. Plafond de 60 annonces facturées par recherche ; au plafond avant
// 10, « Chercher encore » reprend exactement où l'on s'était arrêté, 20 annonces à la fois.

// Mission 128 B — les constantes vivent sans zod, pour l'écran.
export {
  STREAM_ESTATE_BILLING_CAP,
  STREAM_ESTATE_MORE_CAP,
  STREAM_ESTATE_PRICE_PER_ADVERT_EUR,
  STREAM_ESTATE_TARGET,
} from '@/features/competitor-search/services/stream-estate-limits';
import {
  STREAM_ESTATE_BILLING_CAP,
  STREAM_ESTATE_TARGET,
} from '@/features/competitor-search/services/stream-estate-limits';
// Marge autour du cercle pour lister les communes voisines : une commune dont le CENTRE est à
// moins de (rayon + 8 km) du bien peut avoir une partie de son territoire dans le cercle.
export const NEIGHBOUR_MARGIN_KM = 8;
const MAX_PAGES_PER_QUERY = 10;

export type Range = { min: number; max: number };
// Mission 78 — une borne peut manquer : « 181 m² et plus », « 8 pièces au plus ».
export type OpenRange = { min?: number; max?: number };
export type TierSlice = { rooms: OpenRange | null; surface: OpenRange | null };

// Où chercher : toute la commune (code INSEE), ou un cercle autour d'un point. `withinCommune` :
// le cercle est privé des communes voisines (crans 1 à 6) ; sinon il les comprend (crans 7 et 8).
// Mission 99 — `codes` : plusieurs codes INSEE à la fois (l'arrondissement du bien et ses voisins,
// additionnés par l'API — mesuré le 12/10) ; absent, c'est la commune du bien.
export type TierArea =
  | { kind: 'commune'; codes?: string[] }
  | { kind: 'circle'; radiusKm: number; withinCommune: boolean };

export type TierPlan = {
  tier: StreamEstateTier;
  area: TierArea;
  surface: OpenRange | null; // null : le bien vendeur n'a pas de surface, on ne filtre pas
  rooms: OpenRange | null; // null : pas de filtre sur les pièces
  // Mission 78 — plusieurs tranches disjointes de pièces et de surface pour ce cran, à la place de
  // `surface` et `rooms` (cran 6 : ce que les crans 1 à 5 n'ont pas déjà demandé).
  slices?: TierSlice[];
  // Une requête par tranche de prix ([] : pas de fourchette, pas de filtre prix).
  prices: Range[];
  // Fraîcheur exigée de l'annonce d'origine, en jours : 7, ou 21 aux crans à pièces libres.
  originWithinDays: number;
  // Un bien sans position fiable entre si ce cran ne parle pas de quartier (« toute la commune »,
  // cran 5 et au-delà) ; sinon, seulement si son code INSEE confirme la commune. Il porte alors
  // « Même ville — quartier non vérifié ».
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
  // Mission 93 — une borne seule ne fait pas une fourchette : elle figeait la recherche sur un
  // prix exact. Deux bornes, ou pas de filtre de prix.
  const advisorPrices = min != null && max != null ? { min, max } : null;
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
//
// MISSION 99 — `settings` : les réglages du conseiller. Sans réglage (null, ou tout automatique),
// le plan est EXACTEMENT celui d'avant la mission. Un critère réglé est fixe : son élargissement
// disparaît du plan (rayon réglé : plus de 2, 5 ni 10 km ; pièces réglées : plus de « pièce de
// plus » ni de pièces libres ; surface réglée : plus de « plus grand » ; prix réglé : plus de
// ±5 %), et les élargissements qui restent gardent ce critère tel que réglé. Les tranches restent
// disjointes : rien n'est facturé deux fois. « Élargir : non » ne garde que la première recherche.
//
// MISSION 99 — PARIS, LYON, MARSEILLE (`arrondissement`). La « commune » du bien est son
// arrondissement : l'ordre de la mission 71 y est gardé (identique, plus grand, une pièce de plus,
// à 1 km dans l'arrondissement), puis l'arrondissement ET SES VOISINS remplacent les cercles de 2
// et 5 km (jamais toute la ville d'un coup), les pièces libres portent sur ce même périmètre, et
// le rayon de 10 km et le prix à ±5 % ne changent pas. L'étape des voisins existe même sans
// adresse géocodée.
export function planTiers(
  criteria: CompetitorSearchCriteria,
  options: {
    located: boolean;
    hasCentre: boolean;
    arrondissement?: { code: string; neighbours: string[] } | null;
  },
  settings: SearchSettings | null = null,
): TierPlan[] {
  const withNeighbours: TierArea | null =
    options.arrondissement != null && options.arrondissement.neighbours.length > 0
      ? {
          kind: 'commune',
          codes: [options.arrondissement.code, ...options.arrondissement.neighbours],
        }
      : null;
  const custom = isDefaultSettings(settings) ? null : settings;
  const fixedArea: TierArea | null =
    custom?.sector == null
      ? null
      : custom.sector.kind === 'commune'
        ? { kind: 'commune' }
        : { kind: 'circle', radiusKm: custom.sector.km, withinCommune: false };
  const fixedRooms: Range | null = custom?.rooms ?? null;
  const fixedSurface: Range | null = custom?.surface ?? null;
  const fixedPrice: Range | null = custom?.price ?? null;
  // Un bien sans position fiable n'entre dans un cercle réglé qu'à partir de 5 km (comme
  // l'élargissement « 5 km ») ; en dessous, seulement si son code INSEE confirme la commune.
  const fixedAreaAcceptsUnverified =
    fixedArea != null && (fixedArea.kind === 'commune' || fixedArea.radiusKm >= 5);

  const s = tierSlices(
    fixedPrice
      ? { ...criteria, advisorPriceMin: fixedPrice.min, advisorPriceMax: fixedPrice.max }
      : criteria,
  );
  const surfaceAny: Range | null =
    s.identicalSurface && s.biggerSurface
      ? { min: s.identicalSurface.min, max: s.biggerSurface.max }
      : s.identicalSurface;
  const sameRooms: Range | null = s.rooms != null ? { min: s.rooms, max: s.rooms } : null;
  const plusOneRoom: Range | null = s.rooms != null ? { min: s.rooms + 1, max: s.rooms + 1 } : null;
  const roomsAny: Range | null = s.rooms != null ? { min: s.rooms, max: s.rooms + 1 } : null;
  const inRange = s.advisorPrices ? [s.advisorPrices] : [];
  // Mission 78 — pièces libérées : jamais plus petit, plus de plafond.
  const freed = s.rooms != null;
  const freedSurface: OpenRange | null = s.identicalSurface
    ? { min: s.identicalSurface.min }
    : null;
  const wideSurface = freed ? freedSurface : surfaceAny;
  // Ajustement du 08/10 (Laurent) : pour une MAISON les pièces sont libres dans les deux sens ;
  // pour tout autre bien (appartement), elles ne se libèrent que vers le haut — un 3 pièces ne se
  // voit jamais proposer un 2 pièces.
  const bothWays = normalizePropertyType(criteria.propertyType) === 'house';
  const wideRooms: OpenRange | null = !freed
    ? roomsAny
    : bothWays || s.rooms == null
      ? null
      : { min: s.rooms };
  const wideOrigin = freed ? FREED_ORIGIN_SEEN_WITHIN_DAYS : ORIGIN_SEEN_WITHIN_DAYS;

  const neighbourhood: TierArea = options.located
    ? { kind: 'circle', radiusKm: 1, withinCommune: true }
    : { kind: 'commune' };
  const wholeCommune = fixedArea ? fixedAreaAcceptsUnverified : !options.located;
  const nearArea = fixedArea ?? neighbourhood;
  const plans: TierPlan[] = [
    {
      tier: 1,
      area: nearArea,
      surface: fixedSurface ?? s.identicalSurface,
      rooms: fixedRooms ?? sameRooms,
      prices: inRange,
      originWithinDays: ORIGIN_SEEN_WITHIN_DAYS,
      acceptsUnverifiedPosition: wholeCommune,
    },
  ];
  if (custom != null && !custom.autoWiden) {
    return plans;
  }
  if (s.biggerSurface && !fixedSurface) {
    plans.push({
      tier: 2,
      area: nearArea,
      surface: s.biggerSurface,
      rooms: fixedRooms ?? sameRooms,
      prices: inRange,
      originWithinDays: ORIGIN_SEEN_WITHIN_DAYS,
      acceptsUnverifiedPosition: wholeCommune,
    });
  }
  if (plusOneRoom && !fixedRooms) {
    plans.push({
      tier: 3,
      area: nearArea,
      surface: fixedSurface ?? surfaceAny,
      rooms: plusOneRoom,
      prices: inRange,
      originWithinDays: ORIGIN_SEEN_WITHIN_DAYS,
      acceptsUnverifiedPosition: wholeCommune,
    });
  }
  if (withNeighbours && !fixedArea) {
    plans.push({
      tier: 4,
      area: withNeighbours,
      surface: fixedSurface ?? surfaceAny,
      rooms: fixedRooms ?? roomsAny,
      prices: inRange,
      originWithinDays: ORIGIN_SEEN_WITHIN_DAYS,
      acceptsUnverifiedPosition: true,
    });
  } else if (options.located && !fixedArea) {
    plans.push(
      {
        tier: 4,
        area: { kind: 'circle', radiusKm: 2, withinCommune: true },
        surface: fixedSurface ?? surfaceAny,
        rooms: fixedRooms ?? roomsAny,
        prices: inRange,
        originWithinDays: ORIGIN_SEEN_WITHIN_DAYS,
        acceptsUnverifiedPosition: false,
      },
      {
        tier: 5,
        area: { kind: 'circle', radiusKm: 5, withinCommune: true },
        surface: fixedSurface ?? surfaceAny,
        rooms: fixedRooms ?? roomsAny,
        prices: inRange,
        originWithinDays: ORIGIN_SEEN_WITHIN_DAYS,
        acceptsUnverifiedPosition: true,
      },
    );
  }
  if (s.rooms != null && !fixedRooms) {
    // Cran 6 — même ville, pièces libres : le cercle de 5 km dans la commune (toute la commune
    // sans quartier), privé de ce que les crans 1 à 5 y ont déjà demandé (mêmes pièces ou une de
    // plus, jusqu'à +25 %).
    // Mission 99 — surface réglée : elle ne se libère pas, la tranche « plus grand » n'existe pas.
    const sixthSurface: OpenRange | null = fixedSurface ?? freedSurface;
    const slices: TierSlice[] = [
      ...(bothWays && s.rooms > 1 ? [{ rooms: { max: s.rooms - 1 }, surface: sixthSurface }] : []),
      { rooms: { min: s.rooms + 2 }, surface: sixthSurface },
      ...(surfaceAny && !fixedSurface
        ? [{ rooms: roomsAny, surface: { min: surfaceAny.max + 1 } }]
        : []),
    ];
    plans.push({
      tier: 6,
      area:
        fixedArea ??
        withNeighbours ??
        (options.located
          ? { kind: 'circle', radiusKm: 5, withinCommune: true }
          : { kind: 'commune' }),
      surface: sixthSurface,
      rooms: wideRooms,
      slices,
      prices: inRange,
      originWithinDays: FREED_ORIGIN_SEEN_WITHIN_DAYS,
      acceptsUnverifiedPosition: true,
    });
  }
  if (fixedArea) {
    // Mission 99 — secteur réglé : on ne s'éloigne pas. Reste le prix à ±5 %, dans ce secteur,
    // s'il n'est pas réglé lui aussi.
    if (s.outsidePrices.length > 0 && !fixedPrice) {
      plans.push({
        tier: 8,
        area: fixedArea,
        surface: fixedSurface ?? wideSurface,
        rooms: fixedRooms ?? wideRooms,
        prices: s.outsidePrices,
        originWithinDays: wideOrigin,
        acceptsUnverifiedPosition: fixedAreaAcceptsUnverified,
      });
    }
    return plans;
  }
  if (options.located || options.hasCentre) {
    plans.push({
      tier: 7,
      area: { kind: 'circle', radiusKm: 10, withinCommune: false },
      surface: fixedSurface ?? wideSurface,
      rooms: fixedRooms ?? wideRooms,
      prices: inRange,
      originWithinDays: wideOrigin,
      acceptsUnverifiedPosition: true,
    });
    if (s.outsidePrices.length > 0 && !fixedPrice) {
      plans.push({
        tier: 8,
        area: { kind: 'circle', radiusKm: 10, withinCommune: false },
        surface: fixedSurface ?? wideSurface,
        rooms: fixedRooms ?? wideRooms,
        prices: s.outsidePrices,
        originWithinDays: wideOrigin,
        acceptsUnverifiedPosition: true,
      });
    }
  }
  return plans;
}

// Mission 99 — ce que l'outil utiliserait seul, pour le bloc « Réglages de la recherche » et le
// bilan : les bornes de la première recherche, lues dans le plan lui-même.
export function searchDefaults(
  criteria: CompetitorSearchCriteria,
  located: boolean,
  arrondissement = false,
): SearchDefaults {
  const s = tierSlices(criteria);
  return {
    located,
    ...(arrondissement ? { arrondissement } : {}),
    price: s.advisorPrices,
    rooms: s.rooms,
    surface: s.identicalSurface,
  };
}

// Les communes du département qui peuvent toucher un cercle de `radiusKm` autour du bien : leur
// centre est à moins de rayon + 8 km. La commune du bien n'en fait jamais partie.
// Mission 99 — pour un arrondissement (`siblings`) : les autres arrondissements de la ville
// s'ajoutent aux communes à exclure — c'est ce qui garde le cercle DANS l'arrondissement (mesuré
// le 12/10 : 958 biens dans 1 km autour du 12 rue Lecourbe, 726 une fois le 7e, le 6e et le 14e
// exclus) — et le code de la ville entière (`cityCode`) n'est pas envoyé : il est sans effet.
export function neighbourInseeCodes(
  communes: GeoCommune[],
  inseeCode: string,
  point: GeoPoint,
  radiusKm: number,
  arrondissement: { cityCode: string; siblings: string[] } | null = null,
): string[] {
  const limit = (radiusKm + NEIGHBOUR_MARGIN_KM) * 1000;
  const around = communes
    .filter((commune) => commune.code !== inseeCode && commune.code !== arrondissement?.cityCode)
    .filter((commune) => {
      const centre = communeCentre(commune);
      return centre != null && distanceMeters(point, centre) < limit;
    })
    .map((commune) => commune.code);
  return [...new Set([...around, ...(arrondissement?.siblings ?? [])])]
    .filter((code) => code !== inseeCode)
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
  plan: Pick<TierPlan, 'area' | 'rooms' | 'surface'>,
  price: Range | null,
  context: TierQueryContext,
  excluded: string[] | null,
  page: number,
  itemsPerPage: number,
): URLSearchParams {
  const params = new URLSearchParams(base);
  if (plan.area.kind === 'commune') {
    for (const code of plan.area.codes ?? [context.inseeCode]) {
      params.append('includedInseeCodes[]', code);
    }
  } else if (context.origin) {
    params.append('lat', String(context.origin.lat));
    params.append('lon', String(context.origin.lon));
    params.append('radius', String(plan.area.radiusKm));
    for (const code of excluded ?? []) params.append('excludedInseeCodes[]', code);
  }
  // Une borne absente n'est pas envoyée (mesure du 08/10 : l'API accepte `surfaceMin` seul).
  if (plan.rooms?.min != null) params.append('roomMin', String(plan.rooms.min));
  if (plan.rooms?.max != null) params.append('roomMax', String(plan.rooms.max));
  if (plan.surface?.min != null) params.append('surfaceMin', String(plan.surface.min));
  if (plan.surface?.max != null) params.append('surfaceMax', String(plan.surface.max));
  if (price) {
    params.append('budgetMin', String(price.min));
    params.append('budgetMax', String(price.max));
  }
  // Correction du 06/10 : les annonces mises à jour le plus récemment d'abord, pour que les biens
  // vivants passent avant les expirés (le filtre des 7 jours, lui, ne change pas).
  params.append('order[updatedAt]', 'desc');
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
  // Mission 78 — le même bien renvoyé sous un second identifiant : montré une fois, facturé deux.
  duplicates: number;
  // Mission 110 — hors des critères réglés (étage, extérieur, terrain, piscine, DPE) : écartés,
  // facturés. Absent d'une recherche d'avant la mission.
  outsideCriteria?: number;
};

// Où reprendre une recherche arrêtée au plafond : le cran (index dans le plan), la requête du cran
// (`price` : index parmi ses tranches — pièces et surface, puis prix), la page suivante et sa taille (une requête garde la même taille de page, sinon le décalage
// change ; null = première page de la requête, taille libre).
export type TierCursor = {
  plan: number;
  price: number;
  page: number;
  size: number | null;
  tier: StreamEstateTier; // pour l'écran : « reprend au cran N »
};

// Ce que la recherche a déjà trouvé, pour une reprise (« Chercher encore ») : les biens déjà
// retenus ne sont ni repris ni recomptés, les positions déjà vues servent à repérer le remplissage.
export type TieredSearchMemory = {
  keys: string[];
  oldCount: number;
  locations: { uuid: string; point: GeoPoint | null }[];
};

export type TieredSearchOutcome =
  | {
      ok: true;
      candidates: CompetitorCandidate[]; // dans l'ordre des crans ; chacun porte son cran
      billed: number;
      // Pourquoi la recherche s'est arrêtée : 10 biens anciens atteints, plafond, plus rien après
      // le dernier cran, ou erreur de l'API en route (on garde ce qu'on a).
      stop: 'target' | 'cap' | 'exhausted' | 'error';
      // Au plafond : où reprendre. null sinon.
      cursor: TierCursor | null;
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
  // Reprise : là où la recherche précédente s'est arrêtée, et ce qu'elle avait trouvé.
  resume?: { cursor: TierCursor; memory: TieredSearchMemory } | null;
  // Mission 110 — les critères réglés : le DPE part dans la requête, le reste trie la réponse.
  filters?: SearchFilters | null;
  // Mission 136 — la veille des acquéreurs : les biens arrivés le plus récemment chez Stream Estate
  // d'abord (`order[createdAt]`, mesuré le 06/11 ; `fromCreatedAt`, lui, est ignoré par l'API).
  newestFirst?: boolean;
};

export async function runTieredSearch(input: TieredSearchInput): Promise<TieredSearchOutcome> {
  const target = input.target ?? STREAM_ESTATE_TARGET;
  const cap = input.cap ?? STREAM_ESTATE_BILLING_CAP;
  const base = baseStreamEstateQuery(input.criteria, input.now);
  if (!base.ok) return { ok: false, reason: 'failed' };
  const filters = isDefaultFilters(input.filters) ? null : input.filters!;
  appendFilterParams(base.params, filters);
  const start = input.resume?.cursor ?? null;
  const memory = input.resume?.memory ?? null;

  const candidates: CompetitorCandidate[] = [];
  const keys = new Set<string>(memory?.keys ?? []);
  const seenLocations = new Map<string, GeoPoint | null>(
    (memory?.locations ?? []).map((location) => [location.uuid, location.point]),
  );
  const counts: TieredSearchCounts = {
    unreadable: 0,
    outsideWhitelist: 0,
    expiredOrigin: 0,
    otherCommune: 0,
    unverifiedPosition: 0,
    duplicates: 0,
    outsideCriteria: 0,
  };
  // Écartés par bien distinct : un bien écarté à un cran peut entrer à un cran plus large.
  const otherCommune = new Set<string>();
  const unverifiedPosition = new Set<string>();
  const tiers: TierReport[] = [];
  let billed = 0;
  // Mission 111 — la cible ne compte que les biens qui remplissent les critères triés : ceux qui
  // ne les remplissent pas sont gardés (payés, ils reviendront si le critère se desserre), mais ne
  // comptent pas comme trouvés.
  const oldCount = () =>
    (memory?.oldCount ?? 0) +
    candidates.filter(
      (candidate) =>
        !candidate.isNewBuild && (!filters || checkFilters(filters, candidate).kind !== 'fails'),
    ).length;

  const finish = (
    stop: 'target' | 'cap' | 'exhausted' | 'error',
    cursor: TierCursor | null = null,
  ): TieredSearchOutcome => {
    counts.otherCommune = [...otherCommune].filter((key) => !keys.has(key)).length;
    counts.unverifiedPosition = [...unverifiedPosition].filter((key) => !keys.has(key)).length;
    return { ok: true, candidates, billed, stop, cursor, tiers, counts };
  };

  for (let planIndex = start?.plan ?? 0; planIndex < input.plans.length; planIndex += 1) {
    const plan = input.plans[planIndex];
    const report: TierReport = { tier: plan.tier, billed: 0, kept: 0, fallback: false };
    tiers.push(report);
    const excludeNeighbours = plan.area.kind === 'circle' && plan.area.withinCommune;
    let excluded: string[] | null = null;
    if (excludeNeighbours && plan.area.kind === 'circle') {
      if (input.neighbours) excluded = input.neighbours(plan.area.radiusKm);
      else report.fallback = true;
    }
    const verifyCommune = plan.area.kind === 'commune' || excludeNeighbours;
    // Les communes admises à cette étape : celle du bien, ou l'arrondissement et ses voisins.
    const allowed =
      plan.area.kind === 'commune' && plan.area.codes ? plan.area.codes : [input.context.inseeCode];
    const isAllowed = (code: string | null): boolean => code != null && allowed.includes(code);
    // Les requêtes du cran : chaque tranche de pièces et de surface, pour chaque tranche de prix.
    const slices: TierSlice[] = plan.slices ?? [{ rooms: plan.rooms, surface: plan.surface }];
    const prices = slices.flatMap((slice) =>
      (plan.prices.length > 0 ? plan.prices : [null]).map((price) => ({ slice, price })),
    );
    const resumingPlan = start != null && planIndex === start.plan;

    for (
      let priceIndex = resumingPlan ? start.price : 0;
      priceIndex < prices.length;
      priceIndex += 1
    ) {
      const { slice, price } = prices[priceIndex];
      const query = { area: plan.area, ...slice };
      const resumingQuery = resumingPlan && priceIndex === start.price;
      // Une requête garde la même taille de page d'un bout à l'autre (sinon le décalage change).
      let size: number | null = resumingQuery ? start.size : null;
      for (let page = resumingQuery ? start.page : 1; page <= MAX_PAGES_PER_QUERY; page += 1) {
        const remaining = cap - billed;
        const itemsPerPage = size ?? Math.min(STREAM_ESTATE_PAGE_SIZE, remaining);
        if (remaining <= 0 || itemsPerPage > remaining) {
          return finish('cap', { plan: planIndex, price: priceIndex, page, size, tier: plan.tier });
        }
        size = itemsPerPage;

        const params = () => {
          const built = tierQueryParams(
            base.params,
            query,
            price,
            input.context,
            excluded,
            page,
            itemsPerPage,
          );
          if (input.newestFirst) {
            built.delete('order[updatedAt]');
            built.append('order[createdAt]', 'desc');
          }
          return built;
        };
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
        const parsed = parseStreamEstateResponse(
          response.json,
          input.now,
          seenLocations,
          plan.originWithinDays,
        );
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
          if (verifyCommune && !isAllowed(insee)) {
            if (!(plan.area.kind === 'commune' && insee == null)) {
              otherCommune.add(candidate.key!);
              continue;
            }
          }
          // Ce qui est payé et valable est gardé (correction du 06/10) : un bien sans position
          // fiable mais CONFIRMÉ dans la commune par son code INSEE entre dès ce cran (« Même ville
          // — quartier non vérifié ») ; attendre un cran plus large le referait payer.
          if (
            !plan.acceptsUnverifiedPosition &&
            candidate.features?.location == null &&
            !isAllowed(insee)
          ) {
            unverifiedPosition.add(candidate.key!);
            continue;
          }
          // Mission 110 — un critère réglé que le bien ne remplit pas l'écarte de l'écran ; une
          // donnée absente le garde, et la carte le dit. Mission 111 — le bien écarté reste dans le
          // résultat payé : l'écran trie selon les critères en vigueur (`sortReceived`), et un
          // critère desserré le fait revenir, sans repayer.
          const verdict = filters ? checkFilters(filters, candidate) : null;
          if (verdict?.kind === 'fails') {
            counts.outsideCriteria = (counts.outsideCriteria ?? 0) + 1;
          }
          // Mission 78 — le même bien sous un second identifiant : une seule carte, un seul compte.
          if (candidates.some((kept) => isSameStreamEstateProperty(kept, candidate))) {
            keys.add(candidate.key!);
            counts.duplicates += 1;
            continue;
          }
          keys.add(candidate.key!);
          candidates.push({
            ...candidate,
            streamEstate: { ...candidate.streamEstate!, tier: plan.tier },
          });
          if (verdict?.kind !== 'fails') report.kept += 1;
        }

        if (oldCount() >= target) return finish('target');
        if (parsed.billed < itemsPerPage) break; // dernière page de cette requête
      }
    }
  }
  return finish('exhausted');
}
