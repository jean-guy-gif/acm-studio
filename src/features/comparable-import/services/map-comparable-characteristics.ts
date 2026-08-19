// Deterministic, conservative mapping of free listing text (features + description
// + title) to the structured comparable characteristics. No AI, no scraping. When
// a value is ambiguous (e.g. two different exposures mentioned), it is left null /
// the array simply omits unclear items — nothing is invented.

export type MappedCharacteristics = {
  generalCondition: string | null;
  exposure: string | null;
  outdoorSpaces: string[];
  parkingTypes: string[];
};

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

// Single-value match: exactly one distinct hit wins; 0 or >1 → null.
function singleMatch(text: string, patterns: [RegExp, string][]): string | null {
  const hits = new Set<string>();
  for (const [pattern, value] of patterns) {
    if (pattern.test(text)) {
      hits.add(value);
    }
  }
  return hits.size === 1 ? [...hits][0] : null;
}

const CONDITION_PATTERNS: [RegExp, string][] = [
  [/gros travaux|gros oeuvre/, 'major_renovation'],
  [/a renover|a rehabiliter|renovation complete/, 'to_renovate'],
  [/a rafraichir|travaux de rafraichissement/, 'to_refresh'],
  [/\bneuf\b|\bneuve\b|programme neuf/, 'new'],
  // Terrain (19/08, SeLoger) : le portail affiche « État : Entièrement rénové »
  // et la case restait vide. À ne pas confondre avec « à rénover », traité
  // au-dessus — ce sont deux états opposés.
  [/excellent etat|parfait etat|entierement renove|entierement refait|refait a neuf/, 'excellent'],
  [/bon etat|tres bon etat/, 'good'],
];

function mapExposure(text: string): string | null {
  const hits = new Set<string>();
  let rest = text;
  const compound: [RegExp, string][] = [
    [/traversant/g, 'dual_aspect'],
    [/sud[\s-]?est/g, 'south_east'],
    [/sud[\s-]?ouest/g, 'south_west'],
    [/nord[\s-]?est/g, 'north_east'],
    [/nord[\s-]?ouest/g, 'north_west'],
  ];
  for (const [pattern, value] of compound) {
    if (pattern.test(rest)) {
      hits.add(value);
      rest = rest.replace(pattern, ' ');
    }
  }
  const simple: [RegExp, string][] = [
    [/\bsud\b/, 'south'],
    [/\bnord\b/, 'north'],
    [/\best\b/, 'east'],
    [/\bouest\b/, 'west'],
  ];
  for (const [pattern, value] of simple) {
    if (pattern.test(rest)) {
      hits.add(value);
    }
  }
  return hits.size === 1 ? [...hits][0] : null;
}

// Multi-value: include every clearly-matched item (order = declaration order).
function multiMatch(text: string, patterns: [RegExp, string][]): string[] {
  const result: string[] = [];
  for (const [pattern, value] of patterns) {
    if (pattern.test(text) && !result.includes(value)) {
      result.push(value);
    }
  }
  return result;
}

const OUTDOOR_PATTERNS: [RegExp, string][] = [
  [/toit[\s-]?terrasse|rooftop/, 'roof_terrace'],
  [/balcon/, 'balcony'],
  [/terrasse/, 'terrace'],
  [/jardin/, 'garden'],
  [/loggia/, 'loggia'],
  [/veranda/, 'veranda'],
];

const PARKING_PATTERNS: [RegExp, string][] = [
  // Terrain (19/08, Green Acres) : « emplacement de parking fermé » ne cochait
  // rien. Un stationnement dit fermé est un box — ce n'est pas une supposition.
  [/box(\s|$|ferme)/, 'closed_box'],
  [/(?:parking|stationnement|emplacement|place)[a-z' ]{0,14}\bferme/, 'closed_box'],
  [/garage/, 'garage'],
  [
    /parking souterrain|parking couvert|parking sous[\s-]?sol|stationnement couvert/,
    'indoor_parking',
  ],
  [/parking exterieur|stationnement exterieur/, 'outdoor_parking'],
  [/carport/, 'carport'],
];

export function mapComparableCharacteristics(input: {
  features?: string[] | null;
  description?: string | null;
  title?: string | null;
}): MappedCharacteristics {
  const text = normalize(
    [...(input.features ?? []), input.description ?? '', input.title ?? ''].join(' \n '),
  );
  // A `toit-terrasse` must not also register as a plain `terrasse` when there is
  // no standalone terrasse elsewhere.
  const outdoor = multiMatch(text, OUTDOOR_PATTERNS);
  if (outdoor.includes('roof_terrace')) {
    const withoutRoof = text.replace(/toit[\s-]?terrasse/g, ' ');
    if (!/terrasse/.test(withoutRoof)) {
      const idx = outdoor.indexOf('terrace');
      if (idx !== -1) {
        outdoor.splice(idx, 1);
      }
    }
  }
  return {
    generalCondition: singleMatch(text, CONDITION_PATTERNS),
    exposure: mapExposure(text),
    outdoorSpaces: outdoor,
    parkingTypes: multiMatch(text, PARKING_PATTERNS),
  };
}
