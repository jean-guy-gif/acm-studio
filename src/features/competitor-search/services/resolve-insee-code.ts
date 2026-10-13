// ESSAI STREAM ESTATE — le code INSEE de la commune du bien vendeur, depuis son nom et son code
// postal (geo.api.gouv.fr). Fail-closed : sans UNE commune qui porte exactement ce nom (et ce
// code postal quand il est connu), on ne cherche pas — chercher dans une commune devinée, c'est
// proposer des concurrents d'ailleurs.

import type { GeoPoint } from '@/features/competitor-search/types';
import {
  arrondissementCityName,
  arrondissementCityOfInsee,
  arrondissementInsee,
  arrondissementLabel,
  readArrondissementName,
  resolveArrondissement,
  type Arrondissement,
} from '@/features/competitor-search/utils/arrondissements';
import { normalizeCommuneName } from '@/features/competitor-search/utils/commune-name';

export { normalizeCommuneName };

export const GEO_COMMUNES_ENDPOINT = 'https://geo.api.gouv.fr/communes';

// Mission 71 — `centre` (point GeoJSON, [lon, lat]) et `codeDepartement` : le centre sert de point
// de départ au rayon de 10 km quand l'adresse du bien n'est pas géocodée, le département à lister
// les communes voisines à exclure.
export type GeoCommune = {
  nom: string;
  code: string;
  codesPostaux?: string[];
  centre?: { coordinates?: [number, number] } | null;
  codeDepartement?: string;
};

export type InseeResolution =
  | {
      ok: true;
      code: string;
      name: string;
      centre: GeoPoint | null;
      departement: string | null;
      // Mission 99 — Paris, Lyon, Marseille : `code` est celui de l'ARRONDISSEMENT (75115), `name`
      // reste la ville entière (« Paris », pour le géocodage), `display` dit « Paris 15e ».
      // Ailleurs : `display` est le nom de la commune, `arrondissement` est null.
      display: string;
      arrondissement: Arrondissement | null;
    }
  | { ok: false; reason: 'not_found' | 'ambiguous' | 'arrondissements' };

export function communeCentre(commune: Pick<GeoCommune, 'centre'>): GeoPoint | null {
  const coordinates = commune.centre?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length !== 2) return null;
  const [lon, lat] = coordinates;
  return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
}

// Paris, Lyon, Marseille : l'API Stream Estate range les biens par ARRONDISSEMENT (75118 pour
// Paris 18e, relevé le 05/10 ; 75115 et 13208 mesurés le 12/10), jamais sous le code de la commune
// entière. MISSION 99 — le bien est donc rattaché à son arrondissement, lu dans le code postal ou
// dans le nom (utils/arrondissements.ts). Sans arrondissement connu (« Paris » sans code postal,
// ou nom et code postal en désaccord), la recherche serait vide : on le dit plutôt que de la lancer.
export function pickInseeCode(
  communes: GeoCommune[],
  city: string,
  postalCode: string | null,
): InseeResolution {
  // « Paris 15e » se cherche sous le nom de la ville entière.
  const named = readArrondissementName(city);
  const wanted = normalizeCommuneName(named ? arrondissementCityName(named.city) : city);
  const postal = postalCode?.trim() || null;
  const matches = communes.filter(
    (commune) =>
      normalizeCommuneName(commune.nom) === wanted &&
      (postal == null || (commune.codesPostaux ?? []).includes(postal)),
  );
  if (matches.length === 0) return { ok: false, reason: 'not_found' };
  if (matches.length > 1) return { ok: false, reason: 'ambiguous' };
  const [match] = matches;
  if (arrondissementCityOfInsee(match.code) != null) {
    const arrondissement = resolveArrondissement(city, postal);
    if (arrondissement == null) return { ok: false, reason: 'arrondissements' };
    const code = arrondissementInsee(arrondissement);
    // Le centre de l'arrondissement quand la réponse le porte, sinon celui de la ville.
    const own = communes.find((commune) => commune.code === code);
    return {
      ok: true,
      code,
      name: match.nom,
      centre: (own ? communeCentre(own) : null) ?? communeCentre(match),
      departement: match.codeDepartement ?? null,
      display: arrondissementLabel(arrondissement),
      arrondissement,
    };
  }
  return {
    ok: true,
    code: match.code,
    name: match.nom,
    centre: communeCentre(match),
    departement: match.codeDepartement ?? null,
    display: match.nom,
    arrondissement: null,
  };
}

// Mission 71 — avec un code postal, on demande TOUTES les communes de ce code postal et c'est
// pickInseeCode qui compare les noms (St/Saint, tirets) : geo.api.gouv.fr ne trouve pas
// « St Laurent du Var » par son nom (mesuré le 06/10 : réponse vide). Sans code postal, par le nom.
// Mission 99 — les arrondissements municipaux sont demandés avec les communes : la même réponse
// porte « Lyon » (69123) et « Lyon 3e Arrondissement » (69383) avec son centre (mesuré le 12/10).
export function geoCommunesUrl(city: string, postalCode: string | null): string {
  const params = new URLSearchParams();
  const named = readArrondissementName(city);
  if (postalCode?.trim()) params.set('codePostal', postalCode.trim());
  else params.set('nom', named ? arrondissementCityName(named.city) : city);
  params.set('type', 'commune-actuelle,arrondissement-municipal');
  params.set('fields', 'nom,code,codesPostaux,centre,codeDepartement');
  params.set('format', 'json');
  return `${GEO_COMMUNES_ENDPOINT}?${params}`;
}

// Mission 71 — toutes les communes d'un département, avec leur centre : de quoi lister celles qui
// peuvent toucher un cercle autour du bien (geo.api.gouv.fr, gratuit).
export function geoDepartmentCommunesUrl(departement: string): string {
  const params = new URLSearchParams({ fields: 'nom,code,centre', format: 'json' });
  return `https://geo.api.gouv.fr/departements/${encodeURIComponent(departement)}/communes?${params}`;
}

// Mission 103 — les communes d'un code postal, ou celles d'un nom : de quoi reconnaître la commune
// d'une adresse tapée (opposition inscrite à la main). Les communes seulement, sans les
// arrondissements municipaux : « 75015 » rend « Paris », et l'arrondissement se lit ailleurs.
export function geoCommuneLookupUrl(query: { postalCode: string } | { name: string }): string {
  const params = new URLSearchParams();
  if ('postalCode' in query) params.set('codePostal', query.postalCode);
  else params.set('nom', query.name);
  params.set('type', 'commune-actuelle');
  params.set('fields', 'nom,code,codesPostaux');
  params.set('format', 'json');
  return `${GEO_COMMUNES_ENDPOINT}?${params}`;
}
