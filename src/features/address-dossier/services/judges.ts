import { z } from 'zod';

import type {
  CondoData,
  DpeData,
  ParcelData,
  RisksData,
  Servitude,
  UrbanismData,
} from '@/features/address-dossier/types';
import { addressKey } from '@/features/prospecting/services/address-key';

// Mission 141 — chaque réponse d'une source publique, jugée. Partie PURE : ce qui n'a pas la forme
// attendue lève une erreur (la source est dite en panne, jamais lue comme « rien trouvé ») ; ce qui
// a la forme attendue mais ne dit rien de l'adresse rend null (« Rien trouvé à cette adresse »).

export class UnexpectedResponse extends Error {}

function parse<T>(schema: z.ZodType<T>, json: unknown, source: string): T {
  const result = schema.safeParse(json);
  if (!result.success) throw new UnexpectedResponse(`${source} : réponse inattendue`);
  return result.data;
}

// ---- DPE (ADEME, base des DPE des logements existants depuis juillet 2021) ----------------------

const ENERGY = /^[A-G]$/;
const dpeSchema = z.object({
  total: z.number(),
  results: z.array(
    z.object({
      date_etablissement_dpe: z.string().optional(),
      etiquette_dpe: z.string().optional(),
      etiquette_ges: z.string().nullable().optional(),
      surface_habitable_logement: z.number().nullable().optional(),
      type_batiment: z.string().nullable().optional(),
    }),
  ),
});

export function judgeDpe(json: unknown): DpeData | null {
  const response = parse(dpeSchema, json, 'ADEME');
  // Le plus récent qui porte une classe et une date ; les autres comptent.
  const latest = response.results.find(
    (row) =>
      ENERGY.test(row.etiquette_dpe ?? '') &&
      /^\d{4}-\d{2}-\d{2}$/.test(row.date_etablissement_dpe ?? ''),
  );
  if (!latest) return null;
  const buildingType = latest.type_batiment;
  return {
    date: latest.date_etablissement_dpe!,
    energy: latest.etiquette_dpe!,
    ges: ENERGY.test(latest.etiquette_ges ?? '') ? latest.etiquette_ges! : null,
    surface:
      latest.surface_habitable_logement != null && latest.surface_habitable_logement > 0
        ? latest.surface_habitable_logement
        : null,
    buildingType:
      buildingType === 'maison' || buildingType === 'appartement' || buildingType === 'immeuble'
        ? buildingType
        : null,
    count: response.total,
  };
}

// ---- Risques (Géorisques) ------------------------------------------------------------------------

const gasparSchema = z.object({
  data: z.array(
    z.object({
      risques_detail: z.array(
        z.object({ num_risque: z.string(), libelle_risque_long: z.string() }),
      ),
    }),
  ),
});
const seismicSchema = z.object({
  data: z.array(z.object({ zone_sismicite: z.string(), code_insee: z.string().optional() })),
});
const radonSchema = z.object({ data: z.array(z.object({ classe_potentiel: z.string() })) });
// Hors de toute zone d'exposition, le service rend une réponse vide : lue comme un objet vide.
const claySchema = z.object({ exposition: z.string().nullable().optional() });
const countedSchema = z.object({ results: z.number() });
const sspSchema = z.record(z.string(), z.unknown());

export type RisksResponses = {
  gaspar: unknown;
  seismic: unknown;
  radon: unknown;
  clay: unknown;
  sites: unknown;
  movements: unknown;
};

// La sismicité se lit sur la commune du bien : le service rend aussi les communes voisines.
export function judgeRisks(responses: RisksResponses, inseeCode?: string): RisksData {
  const gaspar = parse(gasparSchema, responses.gaspar, 'Géorisques (risques)');
  // Les grandes familles de risques de la commune (numéro à deux chiffres), sans doublon.
  const communeRisks = [
    ...new Set(
      gaspar.data
        .flatMap((row) => row.risques_detail)
        .filter((risk) => /^\d{2}$/.test(risk.num_risque))
        .map((risk) => risk.libelle_risque_long.trim()),
    ),
  ];
  const seismic = parse(seismicSchema, responses.seismic, 'Géorisques (sismicité)');
  const radon = parse(radonSchema, responses.radon, 'Géorisques (radon)');
  const clay = parse(claySchema, responses.clay, 'Géorisques (argiles)');
  const sites = parse(sspSchema, responses.sites, 'Géorisques (sites pollués)');
  const movements = parse(countedSchema, responses.movements, 'Géorisques (mouvements de terrain)');
  const radonClass = radon.data[0]?.classe_potentiel;
  let pollutedSites = 0;
  for (const part of Object.values(sites)) {
    const counted = countedSchema.safeParse(part);
    if (counted.success) pollutedSites += counted.data.results;
  }
  return {
    communeRisks,
    seismicZone:
      (inseeCode == null
        ? seismic.data[0]
        : seismic.data.find((row) => row.code_insee === inseeCode)
      )?.zone_sismicite ?? null,
    radonClass: radonClass === '1' || radonClass === '2' || radonClass === '3' ? radonClass : null,
    clayExposure: clay.exposition?.trim() || null,
    pollutedSites,
    groundMovements: movements.results,
  };
}

// ---- Urbanisme (Géoportail de l'urbanisme, par l'API Carto de l'IGN) -----------------------------

const featuresSchema = z.object({
  features: z.array(z.object({ properties: z.record(z.string(), z.unknown()) })),
});

const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? repairMojibake(value.trim()) : null;

// Certains libellés arrivent encodés deux fois (« CathÃ©drale ») : on les relit en UTF-8.
export function repairMojibake(value: string): string {
  if (!/Ã|Â/.test(value)) return value;
  try {
    const bytes = Uint8Array.from([...value].map((char) => char.charCodeAt(0) & 0xff));
    const repaired = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return repaired;
  } catch {
    return value;
  }
}

// Les servitudes d'utilité publique les plus courantes, nommées ; les autres gardent leur code.
const SERVITUDE_LABELS: Record<string, string> = {
  AC1: 'Abords de monument historique',
  AC2: 'Site inscrit ou classé',
  AC4: 'Site patrimonial remarquable',
  A5: 'Canalisation d’eau ou d’assainissement',
  EL7: 'Alignement de voie',
  I3: 'Canalisation de gaz',
  I4: 'Ligne électrique',
  PM1: 'Plan de prévention des risques naturels',
  PM3: 'Plan de prévention des risques technologiques',
  PT1: 'Protection des télécommunications contre les perturbations',
  PT2: 'Protection des télécommunications contre les obstacles',
  T5: 'Dégagement aéronautique',
  T7: 'Servitude aéronautique hors dégagement',
};

export function judgeUrbanism(zones: unknown, servitudes: unknown): UrbanismData | null {
  const zoneFeatures = parse(featuresSchema, zones, 'Géoportail de l’urbanisme (zones)').features;
  const servitudeFeatures = parse(
    featuresSchema,
    servitudes,
    'Géoportail de l’urbanisme (servitudes)',
  ).features;
  const first = zoneFeatures[0]?.properties;
  const zoneCode = text(first?.libelle);
  const seen = new Set<string>();
  const list: Servitude[] = [];
  for (const { properties } of servitudeFeatures) {
    const code = text(properties.suptype)?.toUpperCase();
    if (!code) continue;
    const name = text(properties.nomsuplitt);
    const key = `${code}|${name ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    list.push({ code, label: SERVITUDE_LABELS[code] ?? `Servitude ${code}`, name });
  }
  if (!zoneCode && list.length === 0) return null;
  return {
    zone: zoneCode ? { code: zoneCode, label: text(first?.libelong) } : null,
    servitudes: list.slice(0, 12),
  };
}

// ---- Parcelle (cadastre, par l'API Carto de l'IGN) -----------------------------------------------

// Une seule parcelle contient le point de l'adresse : c'est elle. Aucune, ou plusieurs : on ne
// devine pas (décision du 07/11) — null, « Parcelle à vérifier au cadastre ».
export function judgeParcel(json: unknown): ParcelData | null {
  const features = parse(featuresSchema, json, 'Cadastre').features;
  if (features.length !== 1) return null;
  const properties = features[0]!.properties;
  const section = text(properties.section);
  const number = text(properties.numero);
  if (!section || !number) return null;
  const area =
    typeof properties.contenance === 'number' && properties.contenance > 0
      ? properties.contenance
      : null;
  return { section, number, area };
}

// ---- Copropriété (registre national d'immatriculation des copropriétés, ANAH) --------------------

const condoSchema = z.object({
  data: z.array(
    z.object({
      numero_et_voie_adresse_de_reference: z.string().nullable().optional(),
      commune_adresse_de_reference: z.string().nullable().optional(),
      nom_d_usage_de_la_copropriete: z.string().nullable().optional(),
      nombre_total_de_lots: z.number().nullable().optional(),
      nombre_de_lots_a_usage_d_habitation: z.number().nullable().optional(),
      periode_de_construction: z.string().nullable().optional(),
      type_de_syndic_benevole_professionnel_non_connu: z.string().nullable().optional(),
      raison_sociale_du_representant_legal: z.string().nullable().optional(),
      date_de_la_derniere_maj: z.string().nullable().optional(),
    }),
  ),
});

const PERIODS: Record<string, string> = {
  AVANT_1949: 'avant 1949',
  DE_1949_A_1960: 'de 1949 à 1960',
  DE_1961_A_1974: 'de 1961 à 1974',
  DE_1975_A_1993: 'de 1975 à 1993',
  DE_1994_A_2000: 'de 1994 à 2000',
  DE_2001_A_2010: 'de 2001 à 2010',
  A_COMPTER_DE_2011: 'depuis 2011',
};

const known = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed && trimmed.toLowerCase() !== 'non connu' ? trimmed : null;
};

// Le registre abrège la voie (« 32 r de la convention ») : on la déplie ici, avant la clé
// d'immeuble de M102, sans toucher à cette clé (elle porte aussi les oppositions).
const REGISTRY_STREET_TYPES: Record<string, string> = {
  r: 'rue',
  pl: 'place',
  sq: 'square',
  crs: 'cours',
  qu: 'quai',
  qua: 'quai',
  pass: 'passage',
};
export function expandRegistryStreet(street: string): string {
  return street.replace(
    /^(\s*\d+\s*(?:bis|ter)?\s+)([a-z]+)\.?(?=\s)/i,
    (whole, number: string, type: string) => {
      const full = REGISTRY_STREET_TYPES[type.toLowerCase()];
      return full ? `${number}${full}` : whole;
    },
  );
}

// La copropriété dont l'adresse de référence est EXACTEMENT celle du bien (même clé d'immeuble,
// M102) ; aucune, ou plusieurs différentes : null. Le syndic bénévole peut être une personne :
// jamais son nom (décision du 07/11).
export function judgeCondo(json: unknown, address: string, city: string): CondoData | null {
  const rows = parse(condoSchema, json, 'Registre des copropriétés').data;
  const wanted = addressKey(`${address} ${city}`);
  if (!wanted) return null;
  const matches = rows.filter((row) => {
    const street = known(row.numero_et_voie_adresse_de_reference);
    const commune = known(row.commune_adresse_de_reference);
    return (
      street != null &&
      commune != null &&
      addressKey(`${expandRegistryStreet(street)} ${commune}`) === wanted
    );
  });
  if (matches.length !== 1) return null;
  const row = matches[0]!;
  const kind = row.type_de_syndic_benevole_professionnel_non_connu?.trim().toLowerCase();
  return {
    name: known(row.nom_d_usage_de_la_copropriete),
    lots: row.nombre_total_de_lots ?? null,
    housingLots: row.nombre_de_lots_a_usage_d_habitation ?? null,
    period: PERIODS[row.periode_de_construction ?? ''] ?? null,
    syndic:
      kind === 'professionnel'
        ? { kind: 'professional', name: known(row.raison_sociale_du_representant_legal) }
        : kind === 'bénévole' || kind === 'benevole'
          ? { kind: 'volunteer' }
          : { kind: 'unknown' },
    updatedOn: /^\d{4}-\d{2}-\d{2}$/.test(row.date_de_la_derniere_maj ?? '')
      ? row.date_de_la_derniere_maj!
      : null,
  };
}
