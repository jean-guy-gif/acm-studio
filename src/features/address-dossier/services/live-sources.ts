import 'server-only';

import type {
  AddressContext,
  SourceReaders,
} from '@/features/address-dossier/services/build-blocks';
import { salesFromCsv, salesYears } from '@/features/address-dossier/services/dvf-sales';
import {
  judgeCondo,
  judgeDpe,
  judgeParcel,
  judgeRisks,
  judgeUrbanism,
} from '@/features/address-dossier/services/judges';
import type { RealSale } from '@/features/address-dossier/types';
import { getJson } from '@/features/competitor-search/services/fetch-geo';
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

const departmentOf = (inseeCode: string) => inseeCode.slice(0, inseeCode.startsWith('97') ? 3 : 2);

// La commune du bien et ses voisines : les arrondissements voisins à Paris, Lyon et Marseille
// (M99), ailleurs les communes du département dont le centre est assez près.
async function communesAround(context: AddressContext): Promise<string[]> {
  const arrondissement = arrondissementOfInsee(context.inseeCode);
  if (arrondissement) {
    return [
      context.inseeCode,
      ...neighbourArrondissements(arrondissement).map(arrondissementInsee),
    ];
  }
  const communes = await liveGeo.fetchDepartmentCommunes(departmentOf(context.inseeCode));
  if (communes == null) throw new Error('geo.api.gouv.fr : communes voisines indisponibles');
  const near = communes
    .filter((commune) => {
      const centre = communeCentre(commune);
      return centre != null && distanceMeters(context.point, centre) <= NEIGHBOUR_REACH_M;
    })
    .map((commune) => commune.code);
  return [...new Set([context.inseeCode, ...near])];
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
  return judgeDpe(await getJson(`${ADEME_DPE}?${params}`));
}

// Le retrait-gonflement des argiles : une réponse vide veut dire « hors zone d'exposition » (mesuré
// le 07/11 à Paris 15e), jamais une panne ; une erreur du service reste une panne.
async function clayExposure(url: string): Promise<unknown> {
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
    getJson(`${GEORISQUES}/gaspar/risques?${at}`),
    getJson(`${GEORISQUES}/zonage_sismique?${at}`),
    getJson(`${GEORISQUES}/radon?code_insee=${encodeURIComponent(context.inseeCode)}`),
    clayExposure(`${GEORISQUES}/rga?${at}`),
    getJson(`${GEORISQUES}/ssp?${at}&rayon=500`),
    getJson(`${GEORISQUES}/mvt?${at}&rayon=500`),
  ]);
  return judgeRisks({ gaspar, seismic, radon, clay, sites, movements }, context.inseeCode);
}

async function readUrbanism(context: AddressContext) {
  const geom = pointGeometry(context);
  const [zones, servitudes] = await Promise.all([
    getJson(`${API_CARTO}/gpu/zone-urba?geom=${geom}`),
    getJson(`${API_CARTO}/gpu/assiette-sup-s?geom=${geom}`),
  ]);
  return judgeUrbanism(zones, servitudes);
}

async function readParcel(context: AddressContext) {
  return judgeParcel(
    await getJson(`${API_CARTO}/cadastre/parcelle?geom=${pointGeometry(context)}`),
  );
}

type DatasetResource = { id?: unknown; format?: unknown; title?: unknown; created_at?: unknown };

// Les fichiers du registre, le plus récent d'abord ; seuls ceux que l'API tabulaire sert répondent.
async function condoResources(): Promise<string[]> {
  const dataset = (await getJson(`${DATA_GOUV}/${CONDO_DATASET}/`)) as {
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

async function readCondo(context: AddressContext) {
  const lat = context.point.lat;
  const lon = context.point.lon;
  const box = new URLSearchParams({
    lat__greater: String(lat - 0.0008),
    lat__less: String(lat + 0.0008),
    long__greater: String(lon - 0.0011),
    long__less: String(lon + 0.0011),
    page_size: '50',
  });
  let lastError: unknown = new Error('Registre des copropriétés : aucun fichier lisible');
  for (const id of await condoResources()) {
    try {
      return judgeCondo(
        await getJson(`${TABULAR}/${id}/data/?${box}`),
        context.address,
        context.city,
      );
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
