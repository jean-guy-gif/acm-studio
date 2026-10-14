import 'server-only';

import {
  geocodeUrl,
  judgeGeocode,
  type SubjectGeocode,
} from '@/features/competitor-search/services/geocode-subject';
import {
  geoCommuneLookupUrl,
  geoCommunesUrl,
  geoDepartmentCommunesUrl,
  pickInseeCode,
  type GeoCommune,
  type InseeResolution,
} from '@/features/competitor-search/services/resolve-insee-code';
import { reportServerError } from '@/lib/app-errors/report-server-error';

// Les services publics et gratuits de géographie (geo.api.gouv.fr, api-adresse.data.gouv.fr), lus
// côté serveur. Partagés par le classement (secteur, code INSEE) et la recherche Stream Estate
// (crans, communes voisines). Une même question a la même réponse : mise en cache un jour.

// Mission 104 — depuis Vercel, le service dépassait souvent 5 s (5 fois le 14/10 au matin) :
// 8 s d'attente, et un second essai quand le premier n'a pas abouti (délai, réseau, erreur du
// service). Une adresse refusée par le service (4xx) n'est pas redemandée : la réponse ne
// changerait pas.
export const GEO_TIMEOUT_MS = 8_000;
export const GEO_ATTEMPTS = 2;
const ONE_DAY = 86_400;

class GeoRefused extends Error {}

async function getJsonOnce(url: string): Promise<unknown> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(GEO_TIMEOUT_MS),
    next: { revalidate: ONE_DAY },
  });
  if (!response.ok) {
    const message = `${new URL(url).hostname} ${response.status}`;
    throw response.status < 500 ? new GeoRefused(message) : new Error(message);
  }
  return response.json();
}

export async function getJson(url: string): Promise<unknown> {
  let lastError: unknown;
  for (let attempt = 0; attempt < GEO_ATTEMPTS; attempt += 1) {
    try {
      return await getJsonOnce(url);
    } catch (error) {
      lastError = error;
      if (error instanceof GeoRefused) break;
    }
  }
  throw lastError;
}

// Étape 2 — le secteur : l'adresse du bien vendeur géocodée (Base Adresse Nationale). Un échec
// réseau ne bloque rien : le secteur devient neutre et l'écran le dit.
export async function geocodeSubject(
  address: string | null,
  postalCode: string | null,
  city: string,
): Promise<SubjectGeocode> {
  const url = geocodeUrl(address, postalCode, city);
  if (url == null) {
    return { ok: false, sector: { status: 'neutral', reason: 'no_address' } };
  }
  try {
    return judgeGeocode(await getJson(url), city);
  } catch (error) {
    await reportServerError('geocodeSubject', error);
    return { ok: false, sector: { status: 'neutral', reason: 'unavailable' } };
  }
}

// Le code INSEE de la commune du bien (avec son centre et son département). `unavailable` : le
// service n'a pas répondu.
export async function resolveCommune(
  city: string,
  postalCode: string | null,
): Promise<InseeResolution | { ok: false; reason: 'unavailable' }> {
  try {
    const communes = await getJson(geoCommunesUrl(city, postalCode));
    if (!Array.isArray(communes)) throw new Error('geo.api.gouv.fr : réponse inattendue');
    return pickInseeCode(communes as GeoCommune[], city, postalCode);
  } catch (error) {
    await reportServerError('resolveCommune', error);
    return { ok: false, reason: 'unavailable' };
  }
}

// Mission 71 — les communes d'un département avec leur centre. null : indisponible (la recherche
// Stream Estate cherche alors le cercle seul et le dit).
export async function fetchDepartmentCommunes(departement: string): Promise<GeoCommune[] | null> {
  try {
    const communes = await getJson(geoDepartmentCommunesUrl(departement));
    if (!Array.isArray(communes)) throw new Error('geo.api.gouv.fr : réponse inattendue');
    return communes as GeoCommune[];
  } catch (error) {
    await reportServerError('fetchDepartmentCommunes', error);
    return null;
  }
}

// Mission 103 — les communes d'un code postal, ou celles qui portent un nom. null : le service
// n'a pas répondu — une panne n'est jamais lue comme « aucune commune ».
export async function fetchCommunes(
  query: { postalCode: string } | { name: string },
): Promise<GeoCommune[] | null> {
  try {
    const communes = await getJson(geoCommuneLookupUrl(query));
    if (!Array.isArray(communes)) throw new Error('geo.api.gouv.fr : réponse inattendue');
    return communes as GeoCommune[];
  } catch (error) {
    await reportServerError('fetchCommunes', error);
    return null;
  }
}
