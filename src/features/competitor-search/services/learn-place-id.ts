import { slugifyCity } from '@/features/competitor-search/services/build-portal-search-urls';
import type { PlacePortal } from '@/features/competitor-search/services/build-filtered-search-urls';
import { detectSearchPortal } from '@/features/competitor-search/services/extract-search-results';

// MISSION 69 — les identifiants de lieu sont APPRIS, jamais devinés. Quand le conseiller lit une
// recherche SeLoger, M&A ou Green Acres, on relève dans l'adresse de l'onglet l'identifiant de la
// commune — à deux conditions :
//   1. l'adresse en porte UN SEUL (une recherche sur deux communes n'apprend rien) ;
//   2. les CARTES lues confirment la commune : celle du bien est la commune la plus fréquente sur
//      la page. Green Acres ajoute des suggestions d'autres communes après ses vrais résultats
//      (mesuré le 05/10 : 13 cartes Nice sur 24) ; une recherche réglée sur une autre commune que
//      celle du bien ne montre pas la commune du bien en tête, et n'apprend rien.

export type PlaceIdInUrl = { portal: PlacePortal; placeId: string };

const SELOGER_LOCATION = /^[A-Z0-9]{4,20}$/;
const MAISONS_VILLE = /^\d{1,10}$/;
// city_id-gr_3668 (Nice), city_id-city_7123 (Antibes) : deux formes relevées, gardées telles quelles.
const GREEN_ACRES_CITY = /(?:^|-)city_id-([a-z]{1,10}_\d{1,10})(?=-|$)/g;

export function placeIdFromSearchUrl(rawUrl: string): PlaceIdInUrl | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  const portal = detectSearchPortal(url.hostname);
  if (portal === 'seloger') {
    const locations = url.searchParams.getAll('locations');
    if (locations.length !== 1 || !SELOGER_LOCATION.test(locations[0])) return null;
    return { portal, placeId: locations[0] };
  }
  if (portal === 'maisons_appartements') {
    const villes = url.searchParams.getAll('villes');
    if (villes.length !== 1 || !MAISONS_VILLE.test(villes[0])) return null;
    return { portal, placeId: villes[0] };
  }
  if (portal === 'green_acres') {
    const query = url.searchParams.get('searchQuery') ?? '';
    const found = [...query.matchAll(GREEN_ACRES_CITY)].map((match) => match[1]);
    if (found.length !== 1) return null;
    return { portal, placeId: found[0] };
  }
  return null;
}

// « St Laurent Du Var » et « Saint-Laurent-du-Var » sont la même commune.
function cityToken(city: string): string {
  return slugifyCity(city).replace(/(^|-)st(e?)(?=-)/g, '$1saint$2');
}

// La commune du bien est-elle LA commune la plus fréquente des cartes (à égalité : non) ?
export function cardsConfirmCity(cardCities: (string | null)[], city: string): boolean {
  const target = cityToken(city);
  if (target === '') return false;
  const counts = new Map<string, number>();
  for (const value of cardCities) {
    if (value == null || value.trim() === '') continue;
    const token = cityToken(value);
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  const mine = counts.get(target) ?? 0;
  if (mine === 0) return false;
  for (const [token, count] of counts) {
    if (token !== target && count >= mine) return false;
  }
  return true;
}

export function learnablePlaceId(
  rawUrl: string,
  cardCities: (string | null)[],
  city: string,
): PlaceIdInUrl | null {
  const found = placeIdFromSearchUrl(rawUrl);
  if (found == null) return null;
  return cardsConfirmCity(cardCities, city) ? found : null;
}
