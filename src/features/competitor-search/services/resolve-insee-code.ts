// ESSAI STREAM ESTATE — le code INSEE de la commune du bien vendeur, depuis son nom et son code
// postal (geo.api.gouv.fr). Fail-closed : sans UNE commune qui porte exactement ce nom (et ce
// code postal quand il est connu), on ne cherche pas — chercher dans une commune devinée, c'est
// proposer des concurrents d'ailleurs.

export const GEO_COMMUNES_ENDPOINT = 'https://geo.api.gouv.fr/communes';

export type GeoCommune = { nom: string; code: string; codesPostaux?: string[] };

export type InseeResolution =
  | { ok: true; code: string; name: string }
  | { ok: false; reason: 'not_found' | 'ambiguous' | 'arrondissements' };

// Paris, Lyon, Marseille : l'API Stream Estate range les biens par ARRONDISSEMENT (75118 pour
// Paris 18e, relevé le 05/10), jamais sous le code de la commune entière. Sans arrondissement
// connu, la recherche serait vide : on le dit plutôt que de la lancer.
const CITIES_WITH_ARRONDISSEMENTS = new Set(['75056', '69123', '13055']);

export function normalizeCommuneName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[-'’]/g, ' ')
    .replace(/\bst\b/g, 'saint')
    .replace(/\bste\b/g, 'sainte')
    .replace(/\s+/g, ' ')
    .trim();
}

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
  return { ok: true, code: matches[0].code, name: matches[0].nom };
}

export function geoCommunesUrl(city: string, postalCode: string | null): string {
  const params = new URLSearchParams({
    nom: city,
    fields: 'nom,code,codesPostaux',
    format: 'json',
  });
  if (postalCode?.trim()) params.set('codePostal', postalCode.trim());
  return `${GEO_COMMUNES_ENDPOINT}?${params}`;
}
