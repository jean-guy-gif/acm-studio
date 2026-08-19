// Ce que l'outil retient des décisions du conseiller.
//
// Demande (19/08) : « l'agent n'a plus qu'à dire oui c'est un concurrent ou non
// et pourquoi, pour que si une nouvelle recherche elle soit encore mieux
// adaptée ». Voici comment ce « pourquoi » est exploité.
//
// Deux principes tenus :
//
// 1. RIEN N'EST DEVINÉ. Chaque règle vient d'un motif que le conseiller a
//    explicitement coché, jamais d'une corrélation trouvée toute seule.
// 2. RIEN N'EST CACHÉ. Chaque règle apprise produit une phrase affichée à
//    l'écran (« Vous avez écarté deux annonces au-dessus de 420 000 € »). Le
//    conseiller doit pouvoir contester ce que l'outil croit avoir compris.
//
// Il faut DEUX décisions concordantes pour qu'une règle naisse : un clic isolé
// — ou une erreur de manipulation — ne doit pas déformer les recherches
// suivantes.

import type {
  CandidateFacts,
  CandidateScore,
} from '@/features/competitor-search/services/score-candidate';

export const DECISION_REASONS = [
  'price_too_high',
  'price_too_low',
  'surface_too_different',
  'wrong_district',
  'wrong_property_type',
  'condition_not_comparable',
  'duplicate',
  'other',
] as const;
export type DecisionReason = (typeof DECISION_REASONS)[number];

export const DECISION_REASON_LABELS: Record<DecisionReason, string> = {
  price_too_high: 'Trop cher',
  price_too_low: 'Trop bon marché',
  surface_too_different: 'Surface trop différente',
  wrong_district: 'Mauvais quartier',
  wrong_property_type: 'Type de bien différent',
  condition_not_comparable: 'État sans rapport',
  duplicate: 'Doublon',
  other: 'Autre raison',
};

export type CompetitorDecisionRecord = {
  listingUrl: string;
  listingHost: string;
  decision: 'accepted' | 'rejected';
  reason: DecisionReason | null;
  price: number | null;
  surfaceArea: number | null;
  district: string | null;
  propertyType: string | null;
};

export type LearnedPreferences = {
  // Annonces déjà tranchées : on les signale au lieu de les proposer à nouveau.
  judged: Record<string, 'accepted' | 'rejected'>;
  priceCeiling: number | null;
  priceFloor: number | null;
  demotedDistricts: string[];
  demotedPropertyTypes: string[];
  demotedHosts: string[];
  // Phrases lisibles décrivant ce qui a été appris.
  notes: string[];
};

export const EMPTY_PREFERENCES: LearnedPreferences = {
  judged: {},
  priceCeiling: null,
  priceFloor: null,
  demotedDistricts: [],
  demotedPropertyTypes: [],
  demotedHosts: [],
  notes: [],
};

// Deux décisions concordantes : en dessous, on ne conclut rien.
const MIN_AGREEING = 2;
// Un portail doit être écarté plus souvent avant d'être déclassé : il propose
// beaucoup d'annonces, dont certaines bonnes.
const MIN_AGREEING_HOST = 3;

function normalize(value: string | null): string | null {
  if (value == null) {
    return null;
  }
  const cleaned = value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  return cleaned === '' ? null : cleaned;
}

function countBy(values: Array<string | null>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const value of values) {
    if (value == null) {
      continue;
    }
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

function euro(value: number): string {
  return `${Math.round(value).toLocaleString('fr-FR')} €`;
}

export function learnFromDecisions(
  decisions: readonly CompetitorDecisionRecord[],
): LearnedPreferences {
  const judged: Record<string, 'accepted' | 'rejected'> = {};
  for (const decision of decisions) {
    judged[decision.listingUrl] = decision.decision;
  }

  const rejected = decisions.filter((decision) => decision.decision === 'rejected');
  const accepted = decisions.filter((decision) => decision.decision === 'accepted');
  const notes: string[] = [];

  // Prix — le plafond est le prix le PLUS BAS parmi ceux jugés trop chers :
  // c'est la limite que le conseiller a lui-même posée.
  const tooHigh = rejected
    .filter((d) => d.reason === 'price_too_high' && d.price != null)
    .map((d) => d.price!);
  let priceCeiling: number | null = null;
  if (tooHigh.length >= MIN_AGREEING) {
    priceCeiling = Math.min(...tooHigh);
    notes.push(
      `Vous avez écarté ${tooHigh.length} annonces jugées trop chères, dès ${euro(priceCeiling)}.`,
    );
  }

  const tooLow = rejected
    .filter((d) => d.reason === 'price_too_low' && d.price != null)
    .map((d) => d.price!);
  let priceFloor: number | null = null;
  if (tooLow.length >= MIN_AGREEING) {
    priceFloor = Math.max(...tooLow);
    notes.push(
      `Vous avez écarté ${tooLow.length} annonces jugées trop bon marché, jusqu’à ${euro(priceFloor)}.`,
    );
  }

  // Un plancher au-dessus du plafond signifie des décisions contradictoires :
  // on préfère ne rien appliquer plutôt que d'écarter toute la fourchette.
  if (priceFloor != null && priceCeiling != null && priceFloor >= priceCeiling) {
    notes.push('Vos décisions de prix se contredisent : aucune limite n’a été retenue.');
    priceFloor = null;
    priceCeiling = null;
  }

  const acceptedDistricts = new Set(
    accepted.map((d) => normalize(d.district)).filter((v): v is string => v != null),
  );
  const demotedDistricts: string[] = [];
  for (const [district, count] of countBy(
    rejected.filter((d) => d.reason === 'wrong_district').map((d) => normalize(d.district)),
  )) {
    // Un quartier déjà retenu ailleurs n'est pas déclassé : le conseiller y a
    // trouvé un concurrent valable.
    if (count >= MIN_AGREEING && !acceptedDistricts.has(district)) {
      demotedDistricts.push(district);
      notes.push(`Vous écartez régulièrement le quartier « ${district} ».`);
    }
  }

  const demotedPropertyTypes: string[] = [];
  for (const [type, count] of countBy(
    rejected.filter((d) => d.reason === 'wrong_property_type').map((d) => d.propertyType),
  )) {
    if (count >= MIN_AGREEING) {
      demotedPropertyTypes.push(type);
      notes.push('Vous écartez régulièrement ce type de bien.');
    }
  }

  const acceptedHosts = new Set(accepted.map((d) => d.listingHost));
  const demotedHosts: string[] = [];
  for (const [host, count] of countBy(rejected.map((d) => d.listingHost))) {
    if (count >= MIN_AGREEING_HOST && !acceptedHosts.has(host)) {
      demotedHosts.push(host);
      notes.push(`Aucune annonce de ${host} n’a encore été retenue (${count} écartées).`);
    }
  }

  return {
    judged,
    priceCeiling,
    priceFloor,
    demotedDistricts,
    demotedPropertyTypes,
    demotedHosts,
    notes,
  };
}

export type LearnedAdjustment = {
  score: number;
  penalties: string[];
  alreadyJudged: 'accepted' | 'rejected' | null;
};

// Applique ce qui a été appris au score de ressemblance. Les pénalités sont
// listées en clair : le conseiller voit POURQUOI une annonce est descendue.
export function applyLearning(
  base: CandidateScore,
  facts: CandidateFacts & { listingUrl: string; listingHost: string },
  preferences: LearnedPreferences,
): LearnedAdjustment {
  let score = base.score;
  const penalties: string[] = [];

  if (
    preferences.priceCeiling != null &&
    facts.price != null &&
    facts.price >= preferences.priceCeiling
  ) {
    score -= 25;
    penalties.push(
      `Au-dessus du prix que vous écartez d’habitude (${euro(preferences.priceCeiling)})`,
    );
  }
  if (
    preferences.priceFloor != null &&
    facts.price != null &&
    facts.price <= preferences.priceFloor
  ) {
    score -= 25;
    penalties.push(`Sous le prix que vous écartez d’habitude (${euro(preferences.priceFloor)})`);
  }

  const district = normalize(facts.district);
  if (district != null && preferences.demotedDistricts.includes(district)) {
    score -= 30;
    penalties.push('Quartier que vous écartez d’habitude');
  }

  if (facts.propertyType != null && preferences.demotedPropertyTypes.includes(facts.propertyType)) {
    score -= 30;
    penalties.push('Type de bien que vous écartez d’habitude');
  }

  if (preferences.demotedHosts.includes(facts.listingHost)) {
    score -= 10;
    penalties.push('Portail dont vous n’avez encore rien retenu');
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    penalties,
    alreadyJudged: preferences.judged[facts.listingUrl] ?? null,
  };
}
