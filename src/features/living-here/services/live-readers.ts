import 'server-only';

import { z } from 'zod';

import { clayExposure, fetchJson } from '@/features/address-dossier/services/live-sources';
import type { GeoPoint } from '@/features/competitor-search/types';
import type { LivingHereReaders } from '@/features/living-here/services/build-sheet';
import {
  judgeOverpass,
  judgeRisksLine,
  judgeRoute,
  judgeSchools,
} from '@/features/living-here/services/living-here-judges';

// Mission 142 — les sources publiques et gratuites de « Vivre ici », lues côté serveur, sans clé et
// sans IA : OpenStreetMap (Overpass), l'annuaire de l'Éducation nationale, les itinéraires de l'IGN
// (Géoplateforme), Géorisques. Mesurées le 07/11 autour de Mougins : Overpass jusqu'à 30 s (serveur
// public partagé), le reste sous la seconde.

const OVERPASS = 'https://overpass-api.de/api/interpreter';
const SCHOOLS =
  'https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-annuaire-education/records';
const ROUTE = 'https://data.geopf.fr/navigation/itineraire';
const GEORISQUES = 'https://georisques.gouv.fr/api/v1';
const OVERPASS_TIMEOUT_MS = 45_000;
// Overpass demande qu'on se présente.
const USER_AGENT = 'ACM-Studio/1.0 (contact formation@start-academy.fr)';

async function readPlaces(from: GeoPoint) {
  const at = `${from.lat},${from.lon}`;
  const query = `[out:json][timeout:40];(
nwr[shop~"^(bakery|supermarket)$"](around:2000,${at});
nwr[amenity~"^(pharmacy|doctors)$"](around:2000,${at});
nwr[healthcare=doctor](around:2000,${at});
nwr[highway=bus_stop](around:1000,${at});
nwr[railway~"^(station|tram_stop)$"](around:1000,${at});
nwr[leisure~"^(park|garden)$"](around:1500,${at});
);out center tags 400;`;
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(OVERPASS, {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          accept: 'application/json',
          'user-agent': USER_AGENT,
        },
        body: new URLSearchParams({ data: query }),
        signal: AbortSignal.timeout(OVERPASS_TIMEOUT_MS),
        cache: 'no-store',
      });
      if (!response.ok) throw new Error(`overpass-api.de ${response.status}`);
      return judgeOverpass(await response.json());
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

async function readSchools(from: GeoPoint) {
  const params = new URLSearchParams({
    select: 'nom_etablissement,libelle_nature,type_etablissement,latitude,longitude',
    where: `within_distance(position, geom'POINT(${from.lon} ${from.lat})', 3km) and etat = 'OUVERT'`,
    limit: '100',
  });
  return judgeSchools(await fetchJson(`${SCHOOLS}?${params}`));
}

async function routeSeconds(profile: 'pedestrian' | 'car', from: GeoPoint, to: GeoPoint) {
  const params = new URLSearchParams({
    resource: 'bdtopo-osrm',
    profile,
    optimization: 'fastest',
    start: `${from.lon},${from.lat}`,
    end: `${to.lon},${to.lat}`,
    getSteps: 'false',
    geometryFormat: 'geojson',
  });
  return judgeRoute(await fetchJson(`${ROUTE}?${params}`));
}

async function readRisks(from: GeoPoint, inseeCode: string) {
  const at = `latlon=${from.lon},${from.lat}`;
  const [gaspar, seismic, clay] = await Promise.all([
    fetchJson(`${GEORISQUES}/gaspar/risques?${at}`),
    fetchJson(`${GEORISQUES}/zonage_sismique?${at}`),
    clayExposure(`${GEORISQUES}/rga?${at}`),
  ]);
  return judgeRisksLine({ gaspar, seismic, clay }, inseeCode);
}

// « Un lieu qui compte pour vous » (texte libre) : sa position par la Base Adresse Nationale, une
// rue, une commune ou un lieu-dit, avec un score suffisant ; sinon rien (on ne devine pas). Seul ce
// texte part vers le service, jamais le nom de l'acquéreur.
const BAN = 'https://api-adresse.data.gouv.fr/search/';
const LOCATE_MIN_SCORE = 0.5;
const banSchema = z.object({
  features: z.array(
    z.object({
      geometry: z.object({ coordinates: z.tuple([z.number(), z.number()]) }),
      properties: z.object({ score: z.number() }),
    }),
  ),
});
async function locate(place: string): Promise<GeoPoint | null> {
  const params = new URLSearchParams({ q: place.slice(0, 200), limit: '1' });
  const parsed = banSchema.safeParse(await fetchJson(`${BAN}?${params}`));
  if (!parsed.success) throw new Error('api-adresse.data.gouv.fr : réponse inattendue');
  const first = parsed.data.features[0];
  if (!first || first.properties.score < LOCATE_MIN_SCORE) return null;
  const [lon, lat] = first.geometry.coordinates;
  return { lat, lon };
}

export const liveLivingHereReaders: LivingHereReaders = {
  locate,
  places: readPlaces,
  schools: readSchools,
  walkSeconds: (from, to) => routeSeconds('pedestrian', from, to),
  driveSeconds: (from, to) => routeSeconds('car', from, to),
  risks: readRisks,
};
