import type {
  CandidateFacts,
  ScoringCriteria,
} from '@/features/competitor-search/services/score-candidate';
import { scoreCandidate } from '@/features/competitor-search/services/score-candidate';
import { normalizePropertyType } from '@/features/competitor-search/utils/normalize-property-type';
import type { SuiviDossier } from '@/features/meeting-conclusion/queries/get-suivi-dossiers';

// Mission 54 §3 — la recherche acheteur RÉUTILISE le moteur de rapprochement des
// concurrents (scoreCandidate) : on n'écrit pas un second moteur. Critères acheteur →
// ScoringCriteria (budget → advisorPriceMin/Max), chaque dossier du Suivi → CandidateFacts
// (prix de référence + bien vendeur). Rien n'est enregistré : recherche jetable.

export type BuyerCriteria = {
  propertyType: string | null; // texte libre saisi par le conseiller
  roomsCount: number | null;
  surfaceArea: number | null;
  budgetMin: number | null;
  budgetMax: number | null;
  city: string | null;
};

// §3.1 — quel prix sert de référence : le prix de commercialisation CONVENU s'il existe
// (dossier signé), sinon le prix conseillé FIGÉ au rendez-vous. La carte DIT lequel.
export type ReferencePrice = { kind: 'convenu' | 'conseille' | null; value: number | null };

export function referencePrice(dossier: SuiviDossier): ReferencePrice {
  const conclusion = dossier.conclusion;
  if (conclusion?.commercializationPrice != null) {
    return { kind: 'convenu', value: conclusion.commercializationPrice };
  }
  if (conclusion?.advisorPrice != null) {
    return { kind: 'conseille', value: conclusion.advisorPrice };
  }
  return { kind: null, value: null };
}

// Une faiblesse, éventuellement CHIFFRÉE. Le detail est produit par la couche d'affichage
// en lisant LES MÊMES entrées que le score, gardé par le verdict du score (le libellé) —
// jamais une comparaison refaite. Faute de chiffre, on retombe sur le libellé (detail null).
export type BuyerGap = { label: string; detail: string | null };

export type BuyerMatch = {
  dossier: SuiviDossier;
  score: number;
  comparedFacets: number;
  reference: ReferencePrice;
  // §3.2 — le type saisi ne se normalise pas : on ne l'exclut pas, on le signale.
  typeUnrecognized: boolean;
  strengths: string[];
  weaknesses: BuyerGap[];
};

const eur = (value: number): string => `${Math.round(value).toLocaleString('fr-FR')} €`;

// Ces libellés miroir de score-candidate ne servent qu'à SAVOIR quand chiffrer (le verdict
// du score). S'ils changeaient là-bas, on retomberait simplement sur le libellé qualitatif
// (fallback sûr) — jamais un chiffre contradictoire.
const PRICE_ABOVE = 'Au-dessus de la fourchette';
const PRICE_BELOW = 'Sous la fourchette';
const SURFACE_FAR = new Set(['Surface assez différente', 'Surface très différente']);

function enrichGap(label: string, criteria: ScoringCriteria, facts: CandidateFacts): BuyerGap {
  // Prix hors budget : le score l'a classé DEHORS → on chiffre l'écart au budget, sur les
  // mêmes bornes que le score.
  if (
    (label === PRICE_ABOVE || label === PRICE_BELOW) &&
    facts.price != null &&
    (criteria.advisorPriceMin != null || criteria.advisorPriceMax != null)
  ) {
    const low = criteria.advisorPriceMin ?? criteria.advisorPriceMax!;
    const high = criteria.advisorPriceMax ?? criteria.advisorPriceMin!;
    if (facts.price > high) {
      return { label, detail: `${eur(facts.price - high)} au-dessus du budget` };
    }
    if (facts.price < low) {
      return { label, detail: `${eur(low - facts.price)} sous le budget` };
    }
  }
  // Surface éloignée → l'écart en m² au bien recherché.
  if (SURFACE_FAR.has(label) && facts.surfaceArea != null && criteria.surfaceArea != null) {
    const gap = facts.surfaceArea - criteria.surfaceArea;
    return {
      label,
      detail: `${Math.abs(gap)} m² ${gap < 0 ? 'de moins' : 'de plus'} que recherché`,
    };
  }
  // Pas de chiffre pertinent (localisation, type, pièces déjà chiffrées) → le libellé seul.
  return { label, detail: null };
}

// Rapproche l'acheteur de TOUT le Suivi (§3). Aucun dossier écarté : un sans prix de
// référence, un type non reconnu, apparaissent avec leur mention — le conseiller juge.
export function matchBuyerAgainstSuivi(
  criteria: BuyerCriteria,
  dossiers: SuiviDossier[],
): BuyerMatch[] {
  const scoringCriteria: ScoringCriteria = {
    city: criteria.city,
    district: null,
    propertyType: normalizePropertyType(criteria.propertyType),
    surfaceArea: criteria.surfaceArea,
    roomsCount: criteria.roomsCount,
    advisorPriceMin: criteria.budgetMin,
    advisorPriceMax: criteria.budgetMax,
  };

  const matches = dossiers.map((dossier): BuyerMatch => {
    const reference = referencePrice(dossier);
    const rawType = dossier.property?.propertyType ?? null;
    const facts: CandidateFacts = {
      price: reference.value,
      surfaceArea: dossier.property?.surfaceArea ?? null,
      roomsCount: dossier.property?.roomsCount ?? null,
      city: dossier.property?.city ?? null,
      district: null,
      propertyType: normalizePropertyType(rawType),
    };
    const scored = scoreCandidate(scoringCriteria, facts);
    return {
      dossier,
      score: scored.score,
      comparedFacets: scored.comparedFacets,
      reference,
      typeUnrecognized: rawType != null && normalizePropertyType(rawType) == null,
      strengths: scored.strengths,
      weaknesses: scored.weaknesses.map((label) => enrichGap(label, scoringCriteria, facts)),
    };
  });

  // Les mieux rapprochés d'abord ; aucun n'est retiré (le conseiller tranche).
  matches.sort((a, b) => b.score - a.score);
  return matches;
}
