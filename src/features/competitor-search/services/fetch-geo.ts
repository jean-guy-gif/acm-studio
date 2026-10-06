import 'server-only';

import {
  geocodeUrl,
  judgeGeocode,
  type SubjectGeocode,
} from '@/features/competitor-search/services/geocode-subject';
import {
  geoCommunesUrl,
  geoDepartmentCommunesUrl,
  pickInseeCode,
  type GeoCommune,
  type InseeResolution,
} from '@/features/competitor-search/services/resolve-insee-code';

// Les services publics et gratuits de géographie (geo.api.gouv.fr, api-adresse.data.gouv.fr), lus
// côté serveur. Partagés par le classement (secteur, code INSEE) et la recherche Stream Estate
// (crans, communes voisines). Une même question a la même réponse : mise en cache un jour.

const TIMEOUT_MS = 5_000;
const ONE_DAY = 86_400;

async function getJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    next: { revalidate: ONE_DAY },
  });
  if (!response.ok) throw new Error(`${new URL(url).hostname} ${response.status}`);
  return response.json();
}

const message = (error: unknown): unknown => (error instanceof Error ? error.message : error);

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
    console.error('[geocodeSubject]', message(error));
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
    console.error('[resolveCommune]', message(error));
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
    console.error('[fetchDepartmentCommunes]', message(error));
    return null;
  }
}
