// Classement des annonces candidates par ressemblance avec le bien du vendeur.
//
// Choix de conception (MISSION 36) : on CLASSE, on ne filtre pas. Une annonce
// hors fourchette descend dans la liste mais reste visible — un concurrent
// atypique existe, et c'est au conseiller de trancher, pas à l'outil.
//
// Chaque point attribué est justifié par une phrase affichée à l'écran : le
// conseiller doit pouvoir contester le classement. Aucun score n'est inventé :
// un critère que l'annonce ne renseigne pas ne rapporte ni ne coûte rien, il
// sort simplement du calcul.

export type ScoringCriteria = {
  city: string | null;
  district: string | null;
  propertyType: string | null;
  surfaceArea: number | null;
  roomsCount: number | null;
  // Avis du conseiller, jamais une estimation de l'outil.
  advisorPriceMin: number | null;
  advisorPriceMax: number | null;
};

export type ScoredFacet = {
  // Poids maximal de ce critère (0 si le critère n'a pas pu être évalué).
  weight: number;
  earned: number;
  label: string;
  positive: boolean;
};

export type CandidateFacts = {
  price: number | null;
  surfaceArea: number | null;
  roomsCount: number | null;
  city: string | null;
  district: string | null;
  propertyType: string | null;
};

const WEIGHTS = {
  price: 30,
  surface: 25,
  district: 20,
  propertyType: 15,
  rooms: 10,
} as const;

function normalizeLabel(value: string | null): string | null {
  if (value == null) {
    return null;
  }
  const cleaned = value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  return cleaned === '' ? null : cleaned;
}

function scorePrice(criteria: ScoringCriteria, price: number | null): ScoredFacet {
  const { advisorPriceMin: min, advisorPriceMax: max } = criteria;
  if (price == null || price <= 0 || (min == null && max == null)) {
    return { weight: 0, earned: 0, label: 'Prix non comparable', positive: false };
  }
  const low = min ?? max!;
  const high = max ?? min!;
  if (price >= low && price <= high) {
    return {
      weight: WEIGHTS.price,
      earned: WEIGHTS.price,
      label: 'Dans la fourchette',
      positive: true,
    };
  }
  // Juste au bord : un bien à 5 % au-dessus reste un concurrent direct.
  const distance = price < low ? (low - price) / low : (price - high) / high;
  if (distance <= 0.15) {
    return {
      weight: WEIGHTS.price,
      earned: Math.round(WEIGHTS.price * 0.5),
      label: 'Proche de la fourchette',
      positive: true,
    };
  }
  return {
    weight: WEIGHTS.price,
    earned: 0,
    label: price < low ? 'Sous la fourchette' : 'Au-dessus de la fourchette',
    positive: false,
  };
}

function scoreSurface(criteria: ScoringCriteria, surface: number | null): ScoredFacet {
  const reference = criteria.surfaceArea;
  if (reference == null || reference <= 0 || surface == null || surface <= 0) {
    return { weight: 0, earned: 0, label: 'Surface non comparable', positive: false };
  }
  const gap = Math.abs(surface - reference) / reference;
  if (gap <= 0.1) {
    return {
      weight: WEIGHTS.surface,
      earned: WEIGHTS.surface,
      label: 'Surface très proche',
      positive: true,
    };
  }
  if (gap <= 0.25) {
    return {
      weight: WEIGHTS.surface,
      earned: Math.round(WEIGHTS.surface * 0.6),
      label: 'Surface proche',
      positive: true,
    };
  }
  if (gap <= 0.4) {
    return {
      weight: WEIGHTS.surface,
      earned: Math.round(WEIGHTS.surface * 0.2),
      label: 'Surface assez différente',
      positive: false,
    };
  }
  return { weight: WEIGHTS.surface, earned: 0, label: 'Surface très différente', positive: false };
}

function scoreDistrict(criteria: ScoringCriteria, facts: CandidateFacts): ScoredFacet {
  const reference = normalizeLabel(criteria.district);
  const candidate = normalizeLabel(facts.district);
  if (reference != null && candidate != null) {
    return reference === candidate
      ? {
          weight: WEIGHTS.district,
          earned: WEIGHTS.district,
          label: 'Même quartier',
          positive: true,
        }
      : { weight: WEIGHTS.district, earned: 0, label: 'Autre quartier', positive: false };
  }
  // À défaut de quartier, la commune vaut la moitié du critère.
  const refCity = normalizeLabel(criteria.city);
  const candidateCity = normalizeLabel(facts.city);
  if (refCity != null && candidateCity != null) {
    const half = Math.round(WEIGHTS.district / 2);
    return refCity === candidateCity
      ? { weight: half, earned: half, label: 'Même commune', positive: true }
      : { weight: half, earned: 0, label: 'Autre commune', positive: false };
  }
  return { weight: 0, earned: 0, label: 'Localisation non comparable', positive: false };
}

function scorePropertyType(criteria: ScoringCriteria, type: string | null): ScoredFacet {
  if (criteria.propertyType == null || type == null) {
    return { weight: 0, earned: 0, label: 'Type non comparable', positive: false };
  }
  return criteria.propertyType === type
    ? {
        weight: WEIGHTS.propertyType,
        earned: WEIGHTS.propertyType,
        label: 'Même type de bien',
        positive: true,
      }
    : { weight: WEIGHTS.propertyType, earned: 0, label: 'Type de bien différent', positive: false };
}

function scoreRooms(criteria: ScoringCriteria, rooms: number | null): ScoredFacet {
  if (criteria.roomsCount == null || rooms == null) {
    return { weight: 0, earned: 0, label: 'Nombre de pièces non comparable', positive: false };
  }
  const gap = Math.abs(rooms - criteria.roomsCount);
  if (gap === 0) {
    return {
      weight: WEIGHTS.rooms,
      earned: WEIGHTS.rooms,
      label: 'Même nombre de pièces',
      positive: true,
    };
  }
  if (gap === 1) {
    return {
      weight: WEIGHTS.rooms,
      earned: Math.round(WEIGHTS.rooms / 2),
      label: 'Une pièce d’écart',
      positive: true,
    };
  }
  return { weight: WEIGHTS.rooms, earned: 0, label: `${gap} pièces d’écart`, positive: false };
}

export type CandidateScore = {
  // 0 à 100. Calculé sur les seuls critères comparables : une annonce dont on
  // ignore la surface n'est pas pénalisée pour cette ignorance.
  score: number;
  facets: ScoredFacet[];
  // Ce qui a fait monter l'annonce, puis ce qui l'a fait descendre.
  strengths: string[];
  weaknesses: string[];
  comparedFacets: number;
};

export function scoreCandidate(criteria: ScoringCriteria, facts: CandidateFacts): CandidateScore {
  const facets = [
    scorePrice(criteria, facts.price),
    scoreSurface(criteria, facts.surfaceArea),
    scoreDistrict(criteria, facts),
    scorePropertyType(criteria, facts.propertyType),
    scoreRooms(criteria, facts.roomsCount),
  ];

  const total = facets.reduce((sum, facet) => sum + facet.weight, 0);
  const earned = facets.reduce((sum, facet) => sum + facet.earned, 0);
  const comparable = facets.filter((facet) => facet.weight > 0);

  return {
    score: total === 0 ? 0 : Math.round((earned / total) * 100),
    facets,
    strengths: comparable.filter((facet) => facet.positive).map((facet) => facet.label),
    weaknesses: comparable.filter((facet) => !facet.positive).map((facet) => facet.label),
    comparedFacets: comparable.length,
  };
}
