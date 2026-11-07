import 'server-only';

import type {
  AddressContext,
  SourceReaders,
} from '@/features/address-dossier/services/build-blocks';
import {
  probePoints,
  salesFromCsv,
  salesYears,
} from '@/features/address-dossier/services/dvf-sales';
import {
  judgeCondo,
  judgeDpe,
  judgeParcel,
  judgeRisks,
  judgeUrbanism,
} from '@/features/address-dossier/services/judges';
import type { RealSale } from '@/features/address-dossier/types';
import { liveGeo } from '@/features/competitor-search/services/geo-provider';
import { distanceMeters } from '@/features/competitor-search/services/proximity';
import { communeCentre } from '@/features/competitor-search/services/resolve-insee-code';
import {
  arrondissementInsee,
  arrondissementOfInsee,
  neighbourArrondissements,
} from '@/features/competitor-search/utils/arrondissements';

// Mission 141 — les sources publiques et gratuites, lues côté serveur, sans clé et sans IA. Chaque
// lecture a son délai ; une source qui ne répond pas lève une erreur (« en panne »), jamais
// « rien trouvé ».

const DVF_FILES = 'https://files.data.gouv.fr/geo-dvf/latest/csv';
const ADEME_DPE = 'https://data.ademe.fr/data-fair/api/v1/datasets/dpe03existant/lines';
const GEORISQUES = 'https://georisques.gouv.fr/api/v1';
const API_CARTO = 'https://apicarto.ign.fr/api';
const DATA_GOUV = 'https://www.data.gouv.fr/api/1/datasets';
const TABULAR = 'https://tabular-api.data.gouv.fr/api/resources';
// Le registre national d'immatriculation des copropriétés (ANAH) : un fichier par trimestre.
const CONDO_DATASET = '62da71c068871f4c54258c7c';

const FILE_TIMEOUT_MS = 20_000;
// Les communes dont le centre est à moins du rayon + 8 km peuvent avoir des ventes à 1 km (la règle
// des communes voisines de M71).
const NEIGHBOUR_REACH_M = 1_000 + 8_000;
const PARALLEL_FILES = 8;

// Un fichier de ventes : null s'il n'existe pas (l'année n'est pas encore publiée).
async function dvfFile(url: string): Promise<string | null> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      // Plusieurs Mo pour une grande ville : jamais dans le cache des données de Next.js.
      const response = await fetch(url, {
        signal: AbortSignal.timeout(FILE_TIMEOUT_MS),
        cache: 'no-store',
      });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`files.data.gouv.fr ${response.status}`);
      return await response.text();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

// Une réponse JSON lue à neuf : « Actualiser » relit vraiment la source, jamais un cache d'un jour.
export async function fetchJson(url: string): Promise<unknown> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(8_000), cache: 'no-store' });
      if (!response.ok) throw new Error(`${new URL(url).hostname} ${response.status}`);
      return await response.json();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

const departmentOf = (inseeCode: string) => inseeCode.slice(0, inseeCode.startsWith('97') ? 3 : 2);

const GEO_COMMUNES = 'https://geo.api.gouv.fr/communes';
// Paris, Lyon, Marseille : geo.api rend la ville entière, les fichiers de ventes sont par
// arrondissement (M99).
const SPLIT_CITIES = new Set(['75056', '69123', '13055']);

type TouchedCommune = { code?: unknown; codeDepartement?: unknown };

// Les communes que touche le cercle de 1 km : le point et huit points posés sur le cercle (M141,
// relecture du 07/11 — une commune d'un autre département, Boulogne près du 16e, compte aussi).
async function communesAt(point: { lat: number; lon: number }): Promise<TouchedCommune[]> {
  const params = new URLSearchParams({
    lat: String(point.lat),
    lon: String(point.lon),
    fields: 'code,codeDepartement',
  });
  const found = await fetchJson(`${GEO_COMMUNES}?${params}`);
  if (!Array.isArray(found)) throw new Error('geo.api.gouv.fr : réponse inattendue');
  return found as TouchedCommune[];
}

async function arrondissementAt(point: { lat: number; lon: number }): Promise<string | null> {
  const params = new URLSearchParams({
    lat: String(point.lat),
    lon: String(point.lon),
    type: 'arrondissement-municipal',
    fields: 'code',
  });
  const found = await fetchJson(`${GEO_COMMUNES}?${params}`);
  if (!Array.isArray(found)) throw new Error('geo.api.gouv.fr : réponse inattendue');
  const code = (found[0] as TouchedCommune | undefined)?.code;
  return typeof code === 'string' ? code : null;
}

// Un arrondissement et ses voisins (M99) : un cercle de 1 km ne déborde que sur ses voisins.
const withNeighbours = (code: string): string[] => {
  const arrondissement = arrondissementOfInsee(code);
  return arrondissement
    ? [code, ...neighbourArrondissements(arrondissement).map(arrondissementInsee)]
    : [code];
};

// La commune du bien et ses voisines : dans chaque département que touche le cercle, les communes
// dont le centre est assez près ; à Paris, Lyon et Marseille, les arrondissements touchés et leurs
// voisins. Une lecture en échec rend la source en panne, jamais des ventes en moins sans le dire.
async function communesAround(context: AddressContext): Promise<string[]> {
  const probes = probePoints(context.point);
  const touched = (await Promise.all(probes.map(communesAt))).map((found) => found[0]);
  const codes = new Set<string>(withNeighbours(context.inseeCode));
  const departments = new Set<string>([departmentOf(context.inseeCode)]);
  await Promise.all(
    touched.map(async (commune, index) => {
      if (typeof commune?.code !== 'string') return; // la mer, une frontière
      if (typeof commune.codeDepartement === 'string') departments.add(commune.codeDepartement);
      if (SPLIT_CITIES.has(commune.code)) {
        const arrondissement = await arrondissementAt(probes[index]!);
        if (arrondissement) for (const code of withNeighbours(arrondissement)) codes.add(code);
        return;
      }
      codes.add(commune.code);
    }),
  );
  for (const department of departments) {
    const communes = await liveGeo.fetchDepartmentCommunes(department);
    if (communes == null) throw new Error('geo.api.gouv.fr : communes voisines indisponibles');
    for (const commune of communes) {
      if (SPLIT_CITIES.has(commune.code)) continue;
      const centre = communeCentre(commune);
      if (centre != null && distanceMeters(context.point, centre) <= NEIGHBOUR_REACH_M) {
        codes.add(commune.code);
      }
    }
  }
  return [...codes];
}

async function readSales(
  context: AddressContext & { propertyType: 'house' | 'apartment' },
): Promise<RealSale[]> {
  const today = new Date();
  const urls = (await communesAround(context)).flatMap((insee) =>
    salesYears(today).map(
      (year) => `${DVF_FILES}/${year}/communes/${departmentOf(insee)}/${insee}.csv`,
    ),
  );
  const texts: string[] = [];
  for (let start = 0; start < urls.length; start += PARALLEL_FILES) {
    const batch = await Promise.all(urls.slice(start, start + PARALLEL_FILES).map(dvfFile));
    for (const text of batch) if (text != null) texts.push(text);
  }
  return salesFromCsv(texts, { point: context.point, propertyType: context.propertyType, today });
}

const latlon = (context: AddressContext) => `${context.point.lon},${context.point.lat}`;
const pointGeometry = (context: AddressContext) =>
  encodeURIComponent(
    JSON.stringify({ type: 'Point', coordinates: [context.point.lon, context.point.lat] }),
  );

// L'identifiant BAN n'entre dans la requête que s'il a sa forme (rien d'autre ne passe).
const BAN_ID = /^[0-9A-Za-z]{5}_[0-9A-Za-z]{4,5}_[0-9A-Za-z]{5}(_[0-9A-Za-z]+)?$/;

async function readDpe(banId: string) {
  if (!BAN_ID.test(banId)) return null;
  const params = new URLSearchParams({
    size: '20',
    qs: `identifiant_ban:"${banId}"`,
    select:
      'date_etablissement_dpe,etiquette_dpe,etiquette_ges,surface_habitable_logement,type_batiment',
    sort: '-date_etablissement_dpe',
  });
  return judgeDpe(await fetchJson(`${ADEME_DPE}?${params}`));
}

// Le retrait-gonflement des argiles : une réponse vide veut dire « hors zone d'exposition » (mesuré
// le 07/11 à Paris 15e), jamais une panne ; une erreur du service reste une panne.
export async function clayExposure(url: string): Promise<unknown> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(8_000), cache: 'no-store' });
      if (!response.ok) throw new Error(`georisques.gouv.fr ${response.status}`);
      const body = (await response.text()).trim();
      return body === '' ? {} : JSON.parse(body);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

async function readRisks(context: AddressContext) {
  const at = `latlon=${latlon(context)}`;
  const [gaspar, seismic, radon, clay, sites, movements] = await Promise.all([
    fetchJson(`${GEORISQUES}/gaspar/risques?${at}`),
    fetchJson(`${GEORISQUES}/zonage_sismique?${at}`),
    fetchJson(`${GEORISQUES}/radon?code_insee=${encodeURIComponent(context.inseeCode)}`),
    clayExposure(`${GEORISQUES}/rga?${at}`),
    fetchJson(`${GEORISQUES}/ssp?${at}&rayon=500`),
    fetchJson(`${GEORISQUES}/mvt?${at}&rayon=500`),
  ]);
  return judgeRisks({ gaspar, seismic, radon, clay, sites, movements }, context.inseeCode);
}

async function readUrbanism(context: AddressContext) {
  const geom = pointGeometry(context);
  const [zones, servitudes] = await Promise.all([
    fetchJson(`${API_CARTO}/gpu/zone-urba?geom=${geom}`),
    fetchJson(`${API_CARTO}/gpu/assiette-sup-s?geom=${geom}`),
  ]);
  return judgeUrbanism(zones, servitudes);
}

async function readParcel(context: AddressContext) {
  return judgeParcel(
    await fetchJson(`${API_CARTO}/cadastre/parcelle?geom=${pointGeometry(context)}`),
  );
}

type DatasetResource = { id?: unknown; format?: unknown; title?: unknown; created_at?: unknown };

// Les fichiers du registre, le plus récent d'abord ; seuls ceux que l'API tabulaire sert répondent.
async function condoResources(): Promise<string[]> {
  const dataset = (await fetchJson(`${DATA_GOUV}/${CONDO_DATASET}/`)) as {
    resources?: DatasetResource[];
  };
  return (dataset.resources ?? [])
    .filter(
      (resource) =>
        typeof resource.id === 'string' &&
        resource.format === 'csv' &&
        typeof resource.title === 'string' &&
        !/dictionnaire/i.test(resource.title),
    )
    .sort((a, b) => String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')))
    .map((resource) => resource.id as string)
    .slice(0, 3);
}

const CONDO_PAGE = 50;
const CONDO_PAGES = 6;

// Toutes les copropriétés du carré autour du point, page après page : une absence ne s'affirme
// que sur une lecture complète (M98) ; trop de pages, la source est dite en panne.
async function condosAround(id: string, lat: number, lon: number): Promise<unknown[]> {
  const rows: unknown[] = [];
  for (let page = 1; page <= CONDO_PAGES; page += 1) {
    const box = new URLSearchParams({
      lat__greater: String(lat - 0.0008),
      lat__less: String(lat + 0.0008),
      long__greater: String(lon - 0.0011),
      long__less: String(lon + 0.0011),
      page_size: String(CONDO_PAGE),
      page: String(page),
    });
    const response = (await fetchJson(`${TABULAR}/${id}/data/?${box}`)) as {
      data?: unknown;
      meta?: { total?: unknown };
    };
    if (!Array.isArray(response.data) || typeof response.meta?.total !== 'number') {
      throw new Error('Registre des copropriétés : réponse inattendue');
    }
    rows.push(...response.data);
    if (rows.length >= response.meta.total || response.data.length === 0) return rows;
  }
  throw new Error('Registre des copropriétés : trop de copropriétés autour du point');
}

async function readCondo(context: AddressContext) {
  let lastError: unknown = new Error('Registre des copropriétés : aucun fichier lisible');
  for (const id of await condoResources()) {
    try {
      const rows = await condosAround(id, context.point.lat, context.point.lon);
      return judgeCondo({ data: rows }, context.address, context.city);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

export const liveSources: SourceReaders = {
  sales: readSales,
  dpe: readDpe,
  risks: readRisks,
  urbanism: readUrbanism,
  parcel: readParcel,
  condo: readCondo,
};
