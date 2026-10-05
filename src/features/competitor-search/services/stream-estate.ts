import { z } from 'zod';

import { detectSource } from '@/features/comparable-import/utils/detect-source';
import { normalizePropertyType } from '@/features/competitor-search/utils/normalize-property-type';
import {
  readLocation,
  readStreamEstateFeatures,
  repeatedLocations,
} from '@/features/competitor-search/services/stream-estate-features';
import {
  SURFACE_FLOOR_SQM,
  WIDEST_SURFACE_TOLERANCE,
} from '@/features/competitor-search/services/rank-candidates';
import type {
  CompetitorCandidate,
  CompetitorSearchCriteria,
} from '@/features/competitor-search/types';

// ESSAI STREAM ESTATE — la partie PURE (aucun réseau, aucune clé) : construire la requête depuis
// le bien vendeur, et ramener la réponse de l'API à des candidats ordinaires, qui passeront par
// rankCandidates comme ceux des portails. L'API ne décide de rien : elle propose, le classement
// filtre, le conseiller tranche.

export const STREAM_ESTATE_ENDPOINT = 'https://api.stream.estate/documents/properties';
export const STREAM_ESTATE_PAGE_SIZE = 30; // une seule page : l'API facture à l'annonce renvoyée
const UPDATED_WITHIN_DAYS = 30; // mesure du 05/10 : à 30 jours, les totaux rejoignent SeLoger

// Les sites que l'extension sait relire (copie de ALLOWED_HOST_SUFFIXES, extension/
// page-readiness.js — un test vérifie qu'elles restent égales). Une annonce d'origine ailleurs
// (leboncoin, paruvendu…) ne peut pas être relue : elle n'est pas importable.
export const IMPORTABLE_HOST_SUFFIXES = [
  'seloger.com',
  'bienici.com',
  'green-acres.fr',
  'immobilier.lefigaro.fr',
  'maisonsetappartements.fr',
];

const STREAM_PROPERTY_TYPES: Record<string, number> = { apartment: 0, house: 1 };

export type StreamEstateQuery =
  { ok: true; params: URLSearchParams } | { ok: false; reason: 'unsupported_type' };

// « 2026-09-05 15:16:18 », heure de Paris : le format de la doc pour fromUpdatedAt.
export function parisDateTime(date: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

// Les critères du bien vendeur, traduits pour l'API. Mêmes bornes que les portails (mission 69) :
// pièces exactes, surface ±10 % jamais moins de ±3 m², fourchette du conseiller STRICTE. Une
// donnée absente du bien vendeur n'est pas envoyée (le classement fera foi, comme ailleurs).
export function buildStreamEstateQuery(
  criteria: CompetitorSearchCriteria,
  inseeCode: string,
  now: Date,
): StreamEstateQuery {
  const type = normalizePropertyType(criteria.propertyType);
  const streamType = type != null ? STREAM_PROPERTY_TYPES[type] : undefined;
  if (streamType == null) {
    return { ok: false, reason: 'unsupported_type' };
  }

  const params = new URLSearchParams();
  params.append('transactionType', '0');
  params.append('propertyTypes[]', String(streamType));
  params.append('includedInseeCodes[]', inseeCode);
  if (criteria.roomsCount != null) {
    params.append('roomMin', String(criteria.roomsCount));
    params.append('roomMax', String(criteria.roomsCount));
  }
  if (criteria.surfaceArea != null && criteria.surfaceArea > 0) {
    const tolerance = Math.max(criteria.surfaceArea * WIDEST_SURFACE_TOLERANCE, SURFACE_FLOOR_SQM);
    params.append('surfaceMin', String(Math.floor(criteria.surfaceArea - tolerance)));
    params.append('surfaceMax', String(Math.ceil(criteria.surfaceArea + tolerance)));
  }
  const { advisorPriceMin: min, advisorPriceMax: max } = criteria;
  if (min != null || max != null) {
    params.append('budgetMin', String(min ?? max));
    params.append('budgetMax', String(max ?? min));
  }
  params.append('expired', 'false');
  const since = new Date(now.getTime() - UPDATED_WITHIN_DAYS * 24 * 60 * 60 * 1000);
  params.append('fromUpdatedAt', parisDateTime(since));
  params.append('itemsPerPage', String(STREAM_ESTATE_PAGE_SIZE));
  return { ok: true, params };
}

// La réponse de l'API, lue au plus juste : seuls les champs utilisés sont décrits, tout le
// reste (contacts, descriptions…) est ignoré et ne quitte jamais le serveur.
const nullableNumber = z.number().nullable().optional();
const nullableString = z.string().nullable().optional();

const advertSchema = z.object({
  url: z.string(),
  expired: z.boolean().nullable().optional(),
  lastCrawledAt: nullableString,
  // Étape 2 — champs structurés de l'annonce (ordre, jamais filtre).
  floor: nullableNumber,
  elevator: z.boolean().nullable().optional(),
  constructionYear: nullableNumber,
  features: z.array(z.string()).nullable().optional(),
  events: z
    .array(
      z.object({
        createdAt: nullableString,
        fieldName: nullableString,
        percentVariation: nullableNumber,
      }),
    )
    .nullable()
    .optional(),
});

const propertySchema = z.object({
  uuid: z.string(),
  title: nullableString,
  propertyType: nullableNumber,
  price: nullableNumber,
  surface: nullableNumber,
  landSurface: nullableNumber,
  room: nullableNumber,
  pricePerMeter: nullableNumber,
  createdAt: nullableString,
  lastCrawledAt: nullableString,
  pictures: z.array(z.string()).nullable().optional(),
  city: z.object({ name: nullableString }).nullable().optional(),
  // Étape 2 — position, étage, ascenseur du bien (valeurs consolidées par Stream Estate).
  location: z.object({ lat: nullableNumber, lon: nullableNumber }).nullable().optional(),
  floor: nullableNumber,
  elevator: z.boolean().nullable().optional(),
  adverts: z.array(advertSchema),
});

const responseSchema = z.object({
  'hydra:totalItems': z.number().optional(),
  'hydra:member': z.array(z.unknown()),
});

export type StreamEstateProperty = z.infer<typeof propertySchema>;
type StreamEstateAdvert = z.infer<typeof advertSchema>;

export type ParsedStreamEstateResponse = {
  candidates: CompetitorCandidate[];
  // Annonces renvoyées par l'API = annonces FACTURÉES (l'API facture à l'élément renvoyé).
  billed: number;
  // Total annoncé par l'API pour ces critères (toutes pages confondues).
  totalItems: number | null;
  // Biens renvoyés mais illisibles (sans annonce exploitable) : comptés, jamais devinés.
  unreadable: number;
};

export function isImportableUrl(rawUrl: string): boolean {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:') return false;
  const host = url.hostname.toLowerCase();
  return IMPORTABLE_HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
}

// Les adresses de l'API portent parfois des marqueurs de suivi (utm_*) : on les retire, l'annonce
// reste la même.
function cleanAdvertUrl(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    for (const key of [...url.searchParams.keys()]) {
      if (key.toLowerCase().startsWith('utm_')) url.searchParams.delete(key);
    }
    return url.href;
  } catch {
    return null;
  }
}

// L'annonce d'ORIGINE : celle que l'import relira. Parmi les annonces encore en ligne d'abord,
// une annonce relisible par l'extension d'abord, puis la plus récemment vue par le robot.
export function pickOriginAdvert(adverts: StreamEstateAdvert[]): StreamEstateAdvert | null {
  const usable = adverts.filter((advert) => cleanAdvertUrl(advert.url) != null);
  if (usable.length === 0) return null;
  const rank = (advert: StreamEstateAdvert): number =>
    (advert.expired === true ? 0 : 2) + (isImportableUrl(advert.url) ? 1 : 0);
  return [...usable].sort(
    (a, b) => rank(b) - rank(a) || (b.lastCrawledAt ?? '').localeCompare(a.lastCrawledAt ?? ''),
  )[0];
}

// Les baisses de prix (events « price » à variation négative), dans l'ordre chronologique. Une
// même baisse relevée sur deux annonces du bien n'est comptée qu'une fois.
export function priceDrops(adverts: StreamEstateAdvert[]): number[] {
  const seen = new Set<string>();
  const drops: { at: string; value: number }[] = [];
  for (const advert of adverts) {
    for (const event of advert.events ?? []) {
      const value = event.percentVariation;
      if (event.fieldName !== 'price' || value == null || value >= 0) continue;
      const at = (event.createdAt ?? '').slice(0, 10);
      const id = `${at}|${value}`;
      if (seen.has(id)) continue;
      seen.add(id);
      drops.push({ at, value });
    }
  }
  return drops.sort((a, b) => a.at.localeCompare(b.at)).map((drop) => drop.value);
}

const positive = (value: number | null | undefined): number | null =>
  value != null && value > 0 ? value : null;

const STREAM_TYPE_NAMES: Record<number, string> = { 0: 'apartment', 1: 'house' };

// `repeated` : les points portés par plusieurs biens de la même réponse (coordonnées de
// remplissage, écartées) — calculés sur toute la réponse par parseStreamEstateResponse.
export function toCandidate(
  property: StreamEstateProperty,
  repeated: ReadonlySet<string> = new Set(),
): CompetitorCandidate | null {
  const origin = pickOriginAdvert(property.adverts);
  const url = origin ? cleanAdvertUrl(origin.url) : null;
  if (origin == null || url == null) return null;
  const host = new URL(url).hostname;
  return {
    key: property.uuid,
    url,
    title: property.title?.trim() || null,
    price: positive(property.price),
    surfaceArea: positive(property.surface),
    roomsCount: positive(property.room),
    propertyType:
      property.propertyType != null ? (STREAM_TYPE_NAMES[property.propertyType] ?? null) : null,
    pricePerSqm: positive(property.pricePerMeter),
    landArea: positive(property.landSurface),
    city: property.city?.name?.trim() || null,
    photoUrls: (property.pictures ?? []).filter((picture) => picture.startsWith('https://')),
    isNewBuild: false,
    streamEstate: {
      propertyId: property.uuid,
      originSite: detectSource(host),
      onlineSince: property.createdAt ?? null,
      lastSeenAt: origin.lastCrawledAt ?? property.lastCrawledAt ?? null,
      priceDrops: priceDrops(property.adverts),
      importable: isImportableUrl(url),
    },
    features: readStreamEstateFeatures(property, repeated),
  };
}

// Toute la réponse : chaque bien devient un candidat, dédupliqué par son identifiant Stream
// Estate. Une réponse qui n'a pas la forme attendue → null (l'action le dira, sans deviner).
export function parseStreamEstateResponse(json: unknown): ParsedStreamEstateResponse | null {
  const response = responseSchema.safeParse(json);
  if (!response.success) return null;
  const members = response.data['hydra:member'];
  const properties = members.map((member) => propertySchema.safeParse(member));
  // Un point répété se compte par BIEN distinct (un même bien renvoyé deux fois ne compte qu'une).
  const byUuid = new Map<string, StreamEstateProperty>();
  for (const property of properties) {
    if (property.success) byUuid.set(property.data.uuid, property.data);
  }
  const repeated = repeatedLocations(
    [...byUuid.values()].map((property) => readLocation(property.location)),
  );
  const seen = new Set<string>();
  const candidates: CompetitorCandidate[] = [];
  let unreadable = 0;
  for (const property of properties) {
    const candidate = property.success ? toCandidate(property.data, repeated) : null;
    if (candidate == null) {
      unreadable += 1;
      continue;
    }
    if (seen.has(candidate.key!)) continue;
    seen.add(candidate.key!);
    candidates.push(candidate);
  }
  return {
    candidates,
    billed: members.length,
    totalItems: response.data['hydra:totalItems'] ?? null,
    unreadable,
  };
}
