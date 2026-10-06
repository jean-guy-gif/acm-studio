// ESSAI STREAM ESTATE — le code INSEE de la commune du bien vendeur, depuis son nom et son code
// postal (geo.api.gouv.fr). Fail-closed : sans UNE commune qui porte exactement ce nom (et ce
// code postal quand il est connu), on ne cherche pas — chercher dans une commune devinée, c'est
// proposer des concurrents d'ailleurs.

import type { GeoPoint } from '@/features/competitor-search/types';
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
    }
  | { ok: false; reason: 'not_found' | 'ambiguous' | 'arrondissements' };

export function communeCentre(commune: Pick<GeoCommune, 'centre'>): GeoPoint | null {
  const coordinates = commune.centre?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length !== 2) return null;
  const [lon, lat] = coordinates;
  return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
}

// Paris, Lyon, Marseille : l'API Stream Estate range les biens par ARRONDISSEMENT (75118 pour
// Paris 18e, relevé le 05/10), jamais sous le code de la commune entière. Sans arrondissement
// connu, la recherche serait vide : on le dit plutôt que de la lancer.
const CITIES_WITH_ARRONDISSEMENTS = new Set(['75056', '69123', '13055']);

export function pickInseeCode(
  communes: GeoCommune[],
  city: string,
  postalCode: string | null,
): InseeResolution {
  const wanted = normalizeCommuneName(city);
  const postal = postalCode?.trim() || null;
  const matches = communes.filter(
    (commune) =>
      normalizeCommuneName(commune.nom) === wanted &&
      (postal == null || (commune.codesPostaux ?? []).includes(postal)),
  );
  if (matches.length === 0) return { ok: false, reason: 'not_found' };
  if (matches.length > 1) return { ok: false, reason: 'ambiguous' };
  if (CITIES_WITH_ARRONDISSEMENTS.has(matches[0].code)) {
    return { ok: false, reason: 'arrondissements' };
  }
  return {
    ok: true,
    code: matches[0].code,
    name: matches[0].nom,
    centre: communeCentre(matches[0]),
    departement: matches[0].codeDepartement ?? null,
  };
}

// Mission 71 — avec un code postal, on demande TOUTES les communes de ce code postal et c'est
// pickInseeCode qui compare les noms (St/Saint, tirets) : geo.api.gouv.fr ne trouve pas
// « St Laurent du Var » par son nom (mesuré le 06/10 : réponse vide). Sans code postal, par le nom.
export function geoCommunesUrl(city: string, postalCode: string | null): string {
  const params = new URLSearchParams();
  if (postalCode?.trim()) params.set('codePostal', postalCode.trim());
  else params.set('nom', city);
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
