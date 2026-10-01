import {
  applyLearning,
  type LearnedPreferences,
} from '@/features/competitor-search/services/learn-from-decisions';
import { scoreCandidate } from '@/features/competitor-search/services/score-candidate';
import { normalizePropertyType } from '@/features/competitor-search/utils/normalize-property-type';
import { typesConflict } from '@/features/competitor-search/utils/property-type-guard';
import type {
  CompetitorCandidate,
  CompetitorSearchCriteria,
  ExcludedForMissing,
  Loosening,
  PortalSearchResult,
  RankedCandidate,
  RankedSearch,
  SearchPortal,
} from '@/features/competitor-search/types';

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

const TARGET = 6; // on vise 6 candidats ; en dessous, on desserre d'un cran.
const MINIMUM = 3; // sous ce plancher après le dernier cran, l'écran le dit et ne complète pas.

// Les crans, du moins grave au plus grave : surface d'abord (5 → 7,5 → 10 %), puis pièces (±1).
// Le prix et la commune ne bougent à AUCUN cran.
type Bounds = { surfaceTol: number; roomsTol: number };
// Mission 68 — plancher de la tolérance de surface : ±5 % (puis ±10 % au plus) d'un petit bien
// ne laisse presque rien passer (±1 m² pour 20 m²). La tolérance n'est donc jamais inférieure à
// ±3 m² : 17–23 m² pour 20 m². Dès 60 m², ±5 % vaut déjà 3 m² — pour 80 m², rien ne change.
const SURFACE_FLOOR_SQM = 3;
const LEVELS: Bounds[] = [
  { surfaceTol: 0.05, roomsTol: 0 },
  { surfaceTol: 0.075, roomsTol: 0 },
  { surfaceTol: 0.1, roomsTol: 0 },
  { surfaceTol: 0.1, roomsTol: 1 },
];

function normCity(value: string | null): string | null {
  if (value == null) return null;
  const cleaned = value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  return cleaned === '' ? null : cleaned;
}

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

type PoolEntry = {
  candidate: CompetitorCandidate;
  portal: SearchPortal;
  portalLabel: string;
  host: string;
};

export function rankCandidates(
  criteria: CompetitorSearchCriteria,
  portals: PortalSearchResult[],
  preferences: LearnedPreferences,
): RankedSearch {
  const subjectType = normalizePropertyType(criteria.propertyType);
  const scoringCriteria = { ...criteria, propertyType: subjectType };
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

  // Choisir le premier cran qui atteint la cible ; sinon le dernier (STOP).
  let chosen = LEVELS[0];
  for (const level of LEVELS) {
    chosen = level;
    const count = pool.filter(
      (p) => admit(criteria, p.candidate, level, prices, refCity).ok,
    ).length;
    if (count >= TARGET) break;
  }

  const excludedForMissing: ExcludedForMissing = { surface: 0, rooms: 0, price: 0 };
  const admitted: PoolEntry[] = [];
  for (const entry of pool) {
    const verdict = admit(criteria, entry.candidate, chosen, prices, refCity);
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

  const ranked: RankedCandidate[] = admitted.map((entry) => {
    const facts = {
      price: entry.candidate.price,
      surfaceArea: entry.candidate.surfaceArea,
      roomsCount: entry.candidate.roomsCount,
      city: entry.candidate.city ?? criteria.city,
      district: null,
      propertyType: entry.candidate.propertyType,
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
      loosenedSurface: neededSurface(entry.candidate),
      loosenedRooms: neededRooms(entry.candidate),
    };
  });

  // Déjà tranchés derrière, puis par score.
  ranked.sort((a, b) => {
    const judgedA = a.alreadyJudged == null ? 0 : 1;
    const judgedB = b.alreadyJudged == null ? 0 : 1;
    return judgedA !== judgedB ? judgedA - judgedB : b.score - a.score;
  });

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
    target: TARGET,
    minimum: MINIMUM,
  };
}
