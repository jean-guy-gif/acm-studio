import {
  applyLearning,
  type LearnedPreferences,
} from '@/features/competitor-search/services/learn-from-decisions';
import { gapLine, matchPercent } from '@/features/competitor-search/services/match-percent';
import {
  assessProximity,
  compareProximity,
  distanceMeters,
} from '@/features/competitor-search/services/proximity';
import { scoreCandidate } from '@/features/competitor-search/services/score-candidate';
import { communeKey } from '@/features/competitor-search/utils/commune-name';
import { normalizePropertyType } from '@/features/competitor-search/utils/normalize-property-type';
import { typesConflict } from '@/features/competitor-search/utils/property-type-guard';
import {
  identicalSurfaceTolerance,
  SURFACE_FLOOR_SQM,
  WIDEST_SURFACE_TOLERANCE,
} from '@/features/competitor-search/utils/surface-tolerance';
import { isSameStreamEstateProperty } from '@/features/competitor-search/services/stream-estate';
import {
  NEIGHBOUR_TIER,
  ROOMS_FREED_TIER,
  STREAM_ESTATE_SOURCE,
  type CandidateSource,
  type CompetitorCandidate,
  type CompetitorSearchCriteria,
  type ExcludedForMissing,
  type GeoPoint,
  type Loosening,
  type PortalSearchResult,
  type RankedCandidate,
  type RankedSearch,
} from '@/features/competitor-search/types';

export { SURFACE_FLOOR_SQM, WIDEST_SURFACE_TOLERANCE };

// MISSION 61 — les quatre critères qui comptent FILTRENT, ils ne marquent pas des points.
//
// secteur (commune), prix, pièces, surface sont des FILTRES : un candidat hors d'un seul n'entre
// pas, quel que soit son score. `scoreCandidate` reste intact et n'ordonne plus que de
// l'admissible, sur les critères secondaires. Le filtre est la responsabilité de l'APPELANT
// (ici), jamais de `scoreCandidate` qui est partagé — comme `typesConflict` (M54).
//
// Bornes (données par Laurent) : type via typesConflict (jamais desserré) ; prix = fourchette du
// conseiller STRICTE, jamais élargie (mission 61 §2, décision A) ; pièces = exact ; surface = ±5 %,
// jamais moins de ±3 m² (mission 68) ;
// commune = `candidate.city` doit être la commune recherchée (garde-fou contre les portails qui
// élargissent d'eux-mêmes).
//
// LE NEUF (règle de Laurent, 05/10) : PAS DE NEUF. Les biens marqués `isNewBuild` ne comptent pas
// pour choisir le cran et ne sont pas proposés — SAUF si, après le desserrage complet, il reste
// moins de 3 concurrents admis dans l'ancien : on complète alors avec les biens neufs admis aux
// mêmes bornes, les plus proches d'abord, jusqu'à 3 au plus. Chacun le dit sur sa carte.

const TARGET = 6; // on vise 6 candidats ; en dessous, on desserre d'un cran.
const MINIMUM = 3; // sous ce plancher après le dernier cran, l'écran le dit et ne complète pas.

// Les crans, du moins grave au plus grave : surface d'abord (5 → 7,5 → 10 %), puis pièces (±1).
// Le prix et la commune ne bougent à AUCUN cran.
type Bounds = { surfaceTol: number; roomsTol: number };
const LEVELS: Bounds[] = [
  { surfaceTol: 0.05, roomsTol: 0 },
  { surfaceTol: 0.075, roomsTol: 0 },
  { surfaceTol: 0.1, roomsTol: 0 },
  { surfaceTol: 0.1, roomsTol: 1 },
];

// Mission 71 — la même comparaison des communes partout (accents, tirets, St/Saint) : un bien
// vendeur écrit « St Laurent du Var » écartait tous les biens « Saint-Laurent-du-Var ».
const normCity = communeKey;

// MISSION 71 — Stream Estate desserre, les portails non. Un bien Stream Estate a été cherché par
// crans (stream-estate-tiers.ts) ; le classement revalide ici, côté serveur, les bornes LES PLUS
// LARGES de ces crans : surface de −10 % (±3 m² au moins) à +25 %, pièces identiques ou une de
// plus, prix à ±5 % hors fourchette, commune du bien (code INSEE) sauf aux crans 7 et 8 (10 km,
// communes voisines comprises). Jamais plus petit.
// MISSION 78 — à partir du cran 6 les pièces sont libres pour une maison, et seulement vers le
// haut pour un appartement (une carte sans pièces n'est plus
// écartée : ce n'est plus le critère) et la surface n'a plus de plafond ; elle reste « jamais
// plus petite » (−10 % au plus), et le prix ne bouge pas.
const STREAM_ESTATE_BIGGER = 1.25;
const STREAM_ESTATE_PRICE_MARGIN = 0.05;

type PriceBounds = { low: number; high: number } | null;

function priceBounds(criteria: CompetitorSearchCriteria): PriceBounds {
  const { advisorPriceMin: min, advisorPriceMax: max } = criteria;
  if (min == null && max == null) return null; // pas de fourchette → pas de filtre prix
  const lo = min ?? max!;
  const hi = max ?? min!;
  // Mission 61 §2 — fourchette STRICTE (décision A, 1er octobre 2026) : la fourchette du
  // conseiller ne s'élargit à AUCUN cran. C'est lui qui la fixe ; l'outil ne l'ouvre pas de
  // 10 %. Le desserrage ne touche QUE la surface, puis les pièces.
  return { low: lo, high: hi };
}

type Admission =
  | { ok: true }
  | { ok: false; kind: 'out' } // hors bornes (attendu, non compté)
  | { ok: false; kind: 'missing'; field: keyof ExcludedForMissing }; // donnée absente (compté)

// Première défaillance gagne : on n'accuse « sans surface » qu'un candidat déjà dans la commune,
// le prix et les pièces — pas un candidat de l'autre bout de la ville.
function admit(
  criteria: CompetitorSearchCriteria,
  candidate: CompetitorCandidate,
  bounds: Bounds,
  prices: PriceBounds,
  refCity: string | null,
): Admission {
  if (refCity != null) {
    // Mission 61 — une carte SANS ville est DANS le périmètre : c'est l'URL interrogée qui porte
    // la commune, pas la vignette (une donnée absente mais portée par la provenance n'écarte pas).
    // On n'écarte que ce qui NOMME une AUTRE commune. ⚠️ Cette confiance ne tient QUE parce que la
    // commune ne se desserre JAMAIS : si un jour le desserrage touchait la commune, elle tomberait.
    const city = normCity(candidate.city);
    if (city != null && city !== refCity) return { ok: false, kind: 'out' };
  }
  if (prices != null) {
    if (candidate.price == null || candidate.price <= 0)
      return { ok: false, kind: 'missing', field: 'price' };
    if (candidate.price < prices.low || candidate.price > prices.high)
      return { ok: false, kind: 'out' };
  }
  if (criteria.roomsCount != null) {
    if (candidate.roomsCount == null) return { ok: false, kind: 'missing', field: 'rooms' };
    if (Math.abs(candidate.roomsCount - criteria.roomsCount) > bounds.roomsTol)
      return { ok: false, kind: 'out' };
  }
  if (criteria.surfaceArea != null && criteria.surfaceArea > 0) {
    if (candidate.surfaceArea == null || candidate.surfaceArea <= 0)
      return { ok: false, kind: 'missing', field: 'surface' };
    const gap = Math.abs(candidate.surfaceArea - criteria.surfaceArea);
    const allowed = Math.max(criteria.surfaceArea * bounds.surfaceTol, SURFACE_FLOOR_SQM);
    if (gap > allowed + 1e-9) return { ok: false, kind: 'out' };
  }
  return { ok: true };
}

function sameCommuneAs(
  candidate: CompetitorCandidate,
  refCity: string | null,
  subjectInseeCode: string | null,
): boolean {
  const insee = candidate.streamEstate?.inseeCode ?? null;
  if (candidate.streamEstate && subjectInseeCode != null && insee != null) {
    return insee === subjectInseeCode;
  }
  const city = normCity(candidate.city);
  // Une carte sans ville est dans le périmètre (portée par la provenance, mission 61).
  return refCity == null || city == null || city === refCity;
}

function admitStreamEstate(
  criteria: CompetitorSearchCriteria,
  candidate: CompetitorCandidate,
  prices: PriceBounds,
  sameCommune: boolean,
  subjectType: string | null,
): Admission {
  const tier = candidate.streamEstate?.tier ?? 1;
  const freed = tier >= ROOMS_FREED_TIER;
  if (!sameCommune && tier < NEIGHBOUR_TIER) {
    return { ok: false, kind: 'out' };
  }
  if (prices != null) {
    if (candidate.price == null || candidate.price <= 0)
      return { ok: false, kind: 'missing', field: 'price' };
    if (
      candidate.price < prices.low * (1 - STREAM_ESTATE_PRICE_MARGIN) - 1e-6 ||
      candidate.price > prices.high * (1 + STREAM_ESTATE_PRICE_MARGIN) + 1e-6
    )
      return { ok: false, kind: 'out' };
  }
  if (criteria.roomsCount != null && !freed) {
    if (candidate.roomsCount == null) return { ok: false, kind: 'missing', field: 'rooms' };
    const extra = candidate.roomsCount - criteria.roomsCount;
    if (extra < 0 || extra > 1) return { ok: false, kind: 'out' };
  }
  // Ajustement du 08/10 — pièces libérées : dans les deux sens pour une maison, seulement vers
  // le haut pour un appartement (jamais moins de pièces que le bien vendeur). Une carte sans
  // nombre de pièces reste acceptée.
  if (
    freed &&
    subjectType !== 'house' &&
    criteria.roomsCount != null &&
    candidate.roomsCount != null &&
    candidate.roomsCount < criteria.roomsCount
  ) {
    return { ok: false, kind: 'out' };
  }
  if (criteria.surfaceArea != null && criteria.surfaceArea > 0) {
    if (candidate.surfaceArea == null || candidate.surfaceArea <= 0)
      return { ok: false, kind: 'missing', field: 'surface' };
    const ref = criteria.surfaceArea;
    const tolerance = identicalSurfaceTolerance(ref);
    const high = Math.max(ref + tolerance, ref * STREAM_ESTATE_BIGGER);
    // Bornes entières côté API (stream-estate-tiers.ts) : on tolère l'arrondi.
    if (candidate.surfaceArea < Math.floor(ref - tolerance) - 1e-9)
      return { ok: false, kind: 'out' };
    if (!freed && candidate.surfaceArea > Math.ceil(high) + 1e-9) return { ok: false, kind: 'out' };
  }
  return { ok: true };
}

type PoolEntry = {
  candidate: CompetitorCandidate;
  portal: CandidateSource;
  portalLabel: string;
  host: string;
};

export function rankCandidates(
  criteria: CompetitorSearchCriteria,
  portals: PortalSearchResult[],
  preferences: LearnedPreferences,
  // Étape 2 — position du bien vendeur, seulement si son adresse est géocodée précisément.
  // Mission 71 — code INSEE de la commune du bien : c'est lui qui dit « même commune » pour un
  // bien Stream Estate (le nom ne sert qu'à défaut).
  options: { subjectLocation?: GeoPoint | null; subjectInseeCode?: string | null } = {},
): RankedSearch {
  const subjectLocation = options.subjectLocation ?? null;
  const subjectInseeCode = options.subjectInseeCode ?? null;
  const subjectType = normalizePropertyType(criteria.propertyType);
  // Mission 70 — le terrain n'ordonne que pour une MAISON vendeuse. Le jardin d'un appartement ne
  // se compare pas au terrain de copropriété qu'un portail écrit sur la carte : pour un
  // appartement, le terrain reste affiché sur la carte mais ne pèse rien dans l'ordre.
  const scoringCriteria = {
    ...criteria,
    propertyType: subjectType,
    landArea: subjectType === 'house' ? criteria.landArea : null,
  };
  const refCity = normCity(criteria.city);
  const prices = priceBounds(criteria);

  // Rassembler les candidats, en déduplicant par IDENTITÉ PUBLIÉE (mission 61 §2-C) : portail +
  // clé de l'annonce quand elle existe, adresse sinon. On ne déduplique PLUS par ressemblance
  // prix/surface (M61 §4) : deux biens distincts peuvent partager prix+surface+pièces+commune, et
  // on préfère afficher deux fois que masquer un vrai concurrent. On ne déduplique PAS par la
  // seule URL : chez M&A toutes les cartes partageaient l'adresse ficheAnnonce.php tant que la
  // query était vidée — la clé publiée, elle, reste distincte. Le type reste un filtre dur (M54).
  const pool: PoolEntry[] = [];
  const seen = new Set<string>();
  for (const portal of portals) {
    for (const candidate of portal.candidates) {
      const identity = `${portal.portal}:${candidate.key ?? candidate.url}`;
      if (seen.has(identity)) continue;
      if (typesConflict(subjectType, candidate.propertyType)) continue;
      // Mission 78 — Stream Estate seulement : le même bien sous un second identifiant (même
      // commune, même prix, mêmes pièces, surface à 2 m² près) n'apparaît qu'une fois.
      if (
        portal.portal === STREAM_ESTATE_SOURCE &&
        pool.some(
          (entry) =>
            entry.portal === STREAM_ESTATE_SOURCE &&
            isSameStreamEstateProperty(entry.candidate, candidate),
        )
      ) {
        continue;
      }
      let host = '';
      try {
        host = new URL(candidate.url).hostname.toLowerCase();
      } catch {
        continue;
      }
      seen.add(identity);
      pool.push({ candidate, portal: portal.portal, portalLabel: portal.label, host });
    }
  }

  // Le neuf est mis de côté AVANT tout : il ne pèse ni sur le choix du cran, ni sur les comptes.
  const oldPool = pool.filter((entry) => !entry.candidate.isNewBuild);
  const newBuildPool = pool.filter((entry) => entry.candidate.isNewBuild);
  const isStream = (entry: PoolEntry) => entry.portal === STREAM_ESTATE_SOURCE;

  // Choisir le premier cran qui atteint la cible ; sinon le dernier (STOP). Mission 71 — sur les
  // seuls PORTAILS : ils gardent exactement leurs filtres, Stream Estate a ses propres crans.
  const portalOldPool = oldPool.filter((entry) => !isStream(entry));
  let chosen = LEVELS[0];
  if (portalOldPool.length > 0) {
    for (const level of LEVELS) {
      chosen = level;
      const count = portalOldPool.filter(
        (p) => admit(criteria, p.candidate, level, prices, refCity).ok,
      ).length;
      if (count >= TARGET) break;
    }
  }

  const admitEntry = (entry: PoolEntry): Admission =>
    isStream(entry)
      ? admitStreamEstate(
          criteria,
          entry.candidate,
          prices,
          sameCommuneAs(entry.candidate, refCity, subjectInseeCode),
          subjectType,
        )
      : admit(criteria, entry.candidate, chosen, prices, refCity);

  const excludedForMissing: ExcludedForMissing = { surface: 0, rooms: 0, price: 0 };
  const admitted: PoolEntry[] = [];
  for (const entry of oldPool) {
    const verdict = admitEntry(entry);
    if (verdict.ok) {
      admitted.push(entry);
    } else if (verdict.kind === 'missing') {
      excludedForMissing[verdict.field] += 1;
    }
  }

  // Un candidat est « retenu grâce à » la surface s'il n'entrerait pas à ±5 % (au cran pièces
  // courant), et grâce aux pièces s'il n'entrerait pas en pièces exactes (au cran surface courant).
  const neededSurface = (c: CompetitorCandidate): boolean =>
    chosen.surfaceTol > 0.05 &&
    !admit(criteria, c, { surfaceTol: 0.05, roomsTol: chosen.roomsTol }, prices, refCity).ok;
  const neededRooms = (c: CompetitorCandidate): boolean =>
    chosen.roomsTol > 0 &&
    !admit(criteria, c, { surfaceTol: chosen.surfaceTol, roomsTol: 0 }, prices, refCity).ok;

  const toRanked = (entry: PoolEntry, newBuildComplement: boolean): RankedCandidate => {
    const facts = {
      price: entry.candidate.price,
      surfaceArea: entry.candidate.surfaceArea,
      roomsCount: entry.candidate.roomsCount,
      city: entry.candidate.city ?? criteria.city,
      district: null,
      propertyType: entry.candidate.propertyType,
      // Mission 70 — critère secondaire : ordonne l'admissible, n'intervient pas dans admit().
      landArea: entry.candidate.landArea,
    };
    const proximity = assessProximity(criteria, entry.candidate, subjectLocation, subjectType);
    const location = entry.candidate.features?.location ?? null;
    const place = {
      distanceMeters:
        subjectLocation != null && location != null
          ? distanceMeters(subjectLocation, location)
          : null,
      sameCommune: sameCommuneAs(entry.candidate, refCity, subjectInseeCode),
    };
    const base = scoreCandidate(scoringCriteria, facts);
    const adjusted = applyLearning(
      base,
      { ...facts, listingUrl: entry.candidate.url, listingHost: entry.host },
      preferences,
    );
    return {
      candidate: entry.candidate,
      portal: entry.portal,
      portalLabel: entry.portalLabel,
      host: entry.host,
      score: adjusted.score,
      strengths: base.strengths,
      weaknesses: base.weaknesses,
      learnedPenalties: adjusted.penalties,
      alreadyJudged: adjusted.alreadyJudged,
      loosenedSurface: !isStream(entry) && neededSurface(entry.candidate),
      loosenedRooms: !isStream(entry) && neededRooms(entry.candidate),
      newBuildComplement,
      proximity,
      matchPercent: matchPercent(criteria, entry.candidate, proximity.reasons, place),
      gapLine: isStream(entry) ? gapLine(criteria, entry.candidate, place) : null,
    };
  };

  // Mission 71 — déjà tranchés derrière, puis le % de correspondance décroissant : un bien à 4 km
  // ne passe jamais devant un bien identique à 300 m. À égalité de %, l'ordre « les plus proches »
  // (étape 2) décide : niveau 1, puis niveau 2, puis le score (critères secondaires, apprentissage).
  const closestFirst = (a: RankedCandidate, b: RankedCandidate): number => {
    const judgedA = a.alreadyJudged == null ? 0 : 1;
    const judgedB = b.alreadyJudged == null ? 0 : 1;
    return (
      judgedA - judgedB ||
      (b.matchPercent ?? -1) - (a.matchPercent ?? -1) ||
      compareProximity(a.proximity, b.proximity) ||
      b.score - a.score
    );
  };
  const ranked = admitted.map((entry) => toRanked(entry, false)).sort(closestFirst);

  // Le complément neuf. Moins de 3 dans l'ancien implique que le cran choisi est le DERNIER (on ne
  // s'arrête avant que si la cible de 6 est atteinte) : le desserrage est complet. Le neuf passe
  // les mêmes bornes, et vient APRÈS l'ancien.
  let newBuildAdded = 0;
  if (ranked.length < MINIMUM) {
    const complement = newBuildPool
      .filter((entry) => admitEntry(entry).ok)
      .map((entry) => toRanked(entry, true))
      .sort(closestFirst)
      .slice(0, MINIMUM - ranked.length);
    newBuildAdded = complement.length;
    ranked.push(...complement);
  }

  // Mission 68 — le plancher l'emporte-t-il sur le pourcentage au cran retenu ? Si oui, c'est lui
  // la tolérance réelle, et l'écran doit dire « ±3 m² » plutôt qu'un pourcentage qui n'a pas servi.
  const floorWins =
    criteria.surfaceArea != null &&
    criteria.surfaceArea > 0 &&
    criteria.surfaceArea * chosen.surfaceTol < SURFACE_FLOOR_SQM - 1e-9;

  const loosening: Loosening = {
    surfaceTolerancePct: Math.round(chosen.surfaceTol * 1000) / 10,
    roomsTolerance: chosen.roomsTol,
    surfaceLoosened: chosen.surfaceTol > 0.05,
    surfaceFloorSqm: floorWins ? SURFACE_FLOOR_SQM : null,
    roomsLoosened: chosen.roomsTol > 0,
  };

  return {
    ranked,
    loosening,
    excludedForMissing,
    belowMinimum: ranked.length < MINIMUM,
    newBuildHeld: newBuildPool.length - newBuildAdded,
    target: TARGET,
    minimum: MINIMUM,
  };
}
