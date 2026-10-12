import { normalizeCommuneName } from '@/features/competitor-search/utils/commune-name';

// MISSION 99 — PARIS, LYON, MARSEILLE : les trois villes à arrondissements. Partie PURE, partagée
// par la recherche, l'affichage, la tournée et le rapprochement acquéreur.
//
// Un bien y est rattaché à son ARRONDISSEMENT, pas à la ville : Stream Estate range les biens sous
// le code INSEE de l'arrondissement (75115, « Paris 15e », code postal 75015 — mesuré le 12/10 ;
// 13208, « Marseille 8e » — mesuré le 12/10 ; Lyon sur le même modèle, 69381 à 69389), et le code
// de la ville entière (75056, 69123, 13055) n'y désigne aucun bien.
//
// L'arrondissement se lit dans le code postal (75015, 69003, 13008 ; 75116 est aussi le 16e) ou
// dans le nom (« Paris 15e », « Paris 15ème », « Paris 15e Arrondissement », « Lyon 3 »). Si le
// nom et le code postal ne disent pas le même arrondissement, on ne devine pas : aucun des deux.

export type ArrondissementCity = 'paris' | 'lyon' | 'marseille';
export type Arrondissement = { city: ArrondissementCity; number: number };

type CityFacts = {
  name: string; // nom officiel de la commune (geo.api.gouv.fr), qui sert aussi au géocodage
  communeInsee: string; // la ville entière
  count: number;
  inseeBase: number; // + numéro = code INSEE de l'arrondissement
  postalBase: number; // + numéro = code postal
};

const CITIES: Record<ArrondissementCity, CityFacts> = {
  paris: { name: 'Paris', communeInsee: '75056', count: 20, inseeBase: 75100, postalBase: 75000 },
  lyon: { name: 'Lyon', communeInsee: '69123', count: 9, inseeBase: 69380, postalBase: 69000 },
  marseille: {
    name: 'Marseille',
    communeInsee: '13055',
    count: 16,
    inseeBase: 13200,
    postalBase: 13000,
  },
};
const CITY_KEYS = Object.keys(CITIES) as ArrondissementCity[];

// LES ARRONDISSEMENTS VOISINS. Source : les contours des arrondissements municipaux publiés par
// geo.api.gouv.fr (`communes?type=arrondissement-municipal&geometry=contour`, données IGN
// Admin Express), relevés le 12/10/2026. Deux arrondissements sont voisins s'ils partagent au
// moins 100 m de limite : un simple point de contact ne compte pas (Paris 9e et 17e ne se touchent
// qu'à la place de Clichy), une limite au milieu de la Seine, du Rhône ou de la Saône compte
// (Paris 1er et 7e). La liste est symétrique, un test le vérifie.
const NEIGHBOURS: Record<ArrondissementCity, Record<number, number[]>> = {
  marseille: {
    1: [2, 3, 4, 5, 6, 7],
    2: [1, 3, 15],
    3: [1, 2, 4, 14, 15],
    4: [1, 3, 5, 12, 13],
    5: [1, 4, 6, 10, 12],
    6: [1, 5, 7, 8, 10],
    7: [1, 6, 8],
    8: [6, 7, 9, 10],
    9: [8, 10, 11],
    10: [5, 6, 8, 9, 11, 12],
    11: [9, 10, 12],
    12: [4, 5, 10, 11, 13],
    13: [4, 12, 14],
    14: [3, 13, 15],
    15: [2, 3, 14, 16],
    16: [15],
  },
  lyon: {
    1: [2, 4, 5, 6, 9],
    2: [1, 3, 5, 6, 7],
    3: [2, 6, 7, 8],
    4: [1, 6, 9],
    5: [1, 2, 9],
    6: [1, 2, 3, 4],
    7: [2, 3, 8],
    8: [3, 7],
    9: [1, 4, 5],
  },
  paris: {
    1: [2, 3, 4, 6, 7, 8, 9],
    2: [1, 3, 9, 10],
    3: [1, 2, 4, 10, 11],
    4: [1, 3, 5, 11, 12],
    5: [4, 6, 12, 13, 14],
    6: [1, 5, 7, 14, 15],
    7: [1, 6, 8, 15, 16],
    8: [1, 7, 9, 16, 17],
    9: [1, 2, 8, 10, 18],
    10: [2, 3, 9, 11, 18, 19],
    11: [3, 4, 10, 12, 20],
    12: [4, 5, 11, 13, 20],
    13: [5, 12, 14],
    14: [5, 6, 13, 15],
    15: [6, 7, 14, 16],
    16: [7, 8, 15, 17],
    17: [8, 16, 18],
    18: [9, 10, 17, 19],
    19: [10, 18, 20],
    20: [11, 12, 19],
  },
};

const valid = (city: ArrondissementCity, number: number): boolean =>
  Number.isInteger(number) && number >= 1 && number <= CITIES[city].count;

export function arrondissementInsee({ city, number }: Arrondissement): string {
  return String(CITIES[city].inseeBase + number);
}

export function arrondissementPostalCode({ city, number }: Arrondissement): string {
  return String(CITIES[city].postalBase + number);
}

// Le code INSEE de la ville entière (75056) : il ne désigne aucun bien chez Stream Estate.
export function arrondissementCityInsee(city: ArrondissementCity): string {
  return CITIES[city].communeInsee;
}

// Le nom officiel de la ville entière : « Paris » — c'est lui que la Base Adresse Nationale rend
// pour une adresse d'arrondissement, et lui qu'on lui envoie.
export function arrondissementCityName(city: ArrondissementCity): string {
  return CITIES[city].name;
}

// « Paris 15e », « Lyon 3e », « Marseille 8e », « Paris 1er » : la forme de l'écran (et celle que
// Stream Estate rend).
export function arrondissementLabel({ city, number }: Arrondissement): string {
  return `${CITIES[city].name} ${number}${number === 1 ? 'er' : 'e'}`;
}

export function neighbourArrondissements({ city, number }: Arrondissement): Arrondissement[] {
  return (NEIGHBOURS[city][number] ?? []).map((neighbour) => ({ city, number: neighbour }));
}

// Tous les autres arrondissements de la même ville.
export function siblingArrondissements({ city, number }: Arrondissement): Arrondissement[] {
  return Array.from({ length: CITIES[city].count }, (_, index) => index + 1)
    .filter((other) => other !== number)
    .map((other) => ({ city, number: other }));
}

// Le code INSEE de la ville entière est-il celui d'une ville à arrondissements ?
export function arrondissementCityOfInsee(inseeCode: string): ArrondissementCity | null {
  return CITY_KEYS.find((city) => CITIES[city].communeInsee === inseeCode) ?? null;
}

export function arrondissementOfInsee(inseeCode: string | null | undefined): Arrondissement | null {
  const code = Number(inseeCode);
  if (!/^\d{5}$/.test(inseeCode ?? '')) return null;
  for (const city of CITY_KEYS) {
    const number = code - CITIES[city].inseeBase;
    if (valid(city, number)) return { city, number };
  }
  return null;
}

export function arrondissementOfPostalCode(
  postalCode: string | null | undefined,
): Arrondissement | null {
  const text = postalCode?.trim() ?? '';
  if (!/^\d{5}$/.test(text)) return null;
  if (text === '75116') return { city: 'paris', number: 16 };
  for (const city of CITY_KEYS) {
    const number = Number(text) - CITIES[city].postalBase;
    if (valid(city, number)) return { city, number };
  }
  return null;
}

// La ville à arrondissements que nomme un texte, avec ou sans arrondissement : « Paris »,
// « PARIS 15EME », « Lyon 3e arrondissement », « Marseille 08 », « Paris 75015 ».
export function readArrondissementName(
  value: string | null | undefined,
): { city: ArrondissementCity; arrondissement: Arrondissement | null } | null {
  if (value == null) return null;
  const postal = /\b\d{5}\b/.exec(value)?.[0] ?? null;
  const key = normalizeCommuneName(value.replace(/\b\d{5}\b/g, ' '));
  const match =
    /^(paris|lyon|marseille)(?: (\d{1,2}) ?(?:er|ere|e|eme|nd)?(?: arrondissement)?)?$/.exec(key);
  if (!match) return null;
  const city = match[1] as ArrondissementCity;
  const named =
    match[2] != null && valid(city, Number(match[2])) ? { city, number: Number(match[2]) } : null;
  if (match[2] != null && named == null) return null; // « Paris 25 » : pas un arrondissement
  const fromPostal = arrondissementOfPostalCode(postal);
  if (fromPostal != null && fromPostal.city !== city) return { city, arrondissement: named };
  if (named != null && fromPostal != null && named.number !== fromPostal.number) {
    return { city, arrondissement: null }; // deux arrondissements différents : on ne devine pas
  }
  return { city, arrondissement: named ?? fromPostal };
}

// L'arrondissement d'un bien, depuis sa ville et son code postal. null : pas une ville à
// arrondissements, arrondissement inconnu, ou nom et code postal en désaccord.
export function resolveArrondissement(
  city: string | null | undefined,
  postalCode: string | null | undefined,
): Arrondissement | null {
  const named = readArrondissementName(city);
  if (named == null) return null;
  const fromPostal = arrondissementOfPostalCode(postalCode);
  if (fromPostal != null && fromPostal.city !== named.city) return named.arrondissement;
  if (named.arrondissement != null && fromPostal != null) {
    return named.arrondissement.number === fromPostal.number ? fromPostal : null;
  }
  return named.arrondissement ?? fromPostal;
}

// CE QUE L'ÉCRAN ÉCRIT pour une commune : « Paris 15e » quand l'arrondissement est connu, la
// ville telle que saisie sinon. La base garde ce qui a été saisi ; seul l'affichage change.
export function displayCommune(
  city: string | null | undefined,
  postalCode?: string | null,
): string | null {
  const text = city?.trim() ?? '';
  if (text === '') return null;
  const arrondissement = resolveArrondissement(text, postalCode);
  if (arrondissement != null) return arrondissementLabel(arrondissement);
  // « Paris 15e Arrondissement » dont le code postal dit autre chose : la ville seule.
  const named = readArrondissementName(text);
  return named != null ? CITIES[named.city].name : text;
}

// Deux communes sont-elles la même, arrondissement compris ? `unknown` : même ville, mais l'un des
// deux côtés ne dit pas son arrondissement — la provenance décidera (M61).
export function compareArrondissements(
  a: { city: string | null | undefined; postalCode?: string | null },
  b: { city: string | null | undefined; postalCode?: string | null },
): 'same' | 'different' | 'unknown' | 'not_applicable' {
  const cityA = readArrondissementName(a.city);
  const cityB = readArrondissementName(b.city);
  if (cityA == null && cityB == null) return 'not_applicable';
  if (cityA == null || cityB == null || cityA.city !== cityB.city) return 'different';
  const arrA = resolveArrondissement(a.city, a.postalCode);
  const arrB = resolveArrondissement(b.city, b.postalCode);
  if (arrA == null || arrB == null) return 'unknown';
  return arrA.number === arrB.number ? 'same' : 'different';
}
