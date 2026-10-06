import { z } from 'zod';

import { detectSource } from '@/features/comparable-import/utils/detect-source';
import { normalizePropertyType } from '@/features/competitor-search/utils/normalize-property-type';
import {
  isGeneratedNewBuildTitle,
  isNewBuildAddress,
} from '@/features/competitor-search/services/new-build';
import {
  readLocation,
  readStreamEstateFeatures,
  repeatedLocations,
} from '@/features/competitor-search/services/stream-estate-features';
import type {
  CompetitorCandidate,
  CompetitorSearchCriteria,
  GeoPoint,
} from '@/features/competitor-search/types';

// ESSAI STREAM ESTATE — la partie PURE (aucun réseau, aucune clé) : construire la requête depuis
// le bien vendeur, et ramener la réponse de l'API à des candidats ordinaires, qui passeront par
// rankCandidates comme ceux des portails. L'API ne décide de rien : elle propose, le classement
// filtre, le conseiller tranche.

export const STREAM_ESTATE_ENDPOINT = 'https://api.stream.estate/documents/properties';
export const STREAM_ESTATE_PAGE_SIZE = 20; // l'API facture à l'annonce renvoyée
const UPDATED_WITHIN_DAYS = 30; // mesure du 05/10 : à 30 jours, les totaux rejoignent SeLoger

// ANNONCE D'ORIGINE UTILISABLE (décision de Laurent, 05/10) : PAS marquée expirée ET revue par le
// robot il y a 7 jours au plus. Le filtre `expired=false` de la requête ne suffit pas : pour l'API,
// un bien n'est expiré que si TOUTES ses annonces le sont, et son `lastCrawledAt` est celui de sa
// plus récente annonce en ligne, TOUS sites confondus. Mesure sur la réponse enregistrée du 05/10
// (30 biens, 23 sur un site de la liste blanche) : 3 biens n'avaient plus d'annonce d'origine
// utilisable — 2 dont toutes les annonces SeLoger étaient expirées (le bien restait « en ligne »
// par une annonce ParuVendu), 1 dont la seule annonce en ligne d'un site relisible (Figaro) n'avait
// pas été revue depuis 10 jours alors que le bien avait été vu 6 jours plus tôt (via une autre
// annonce). Aucun filtre de l'API ne porte sur la fraîcheur des ANNONCES (doc du 05/10 : `fromUpdatedAt`
// porte sur le bien, `fromExpiredAt` sur la date d'expiration) : le tri se fait donc sur la réponse,
// et ces biens restent facturés — comptés à l'écran.
export const ORIGIN_SEEN_WITHIN_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

// LISTE BLANCHE (décision de Laurent, 05/10) : on ne garde que les biens IMPORTABLES, c'est-à-dire
// ayant au moins une annonce sur un site que l'extension sait relire (copie de
// ALLOWED_HOST_SUFFIXES, extension/page-readiness.js — un test vérifie qu'elles restent égales).
// Un bien publié seulement ailleurs (leboncoin, paruvendu, logic-immo…) n'est pas proposé.
//
// La liste s'applique à la RÉPONSE, pas à la requête : l'API accepte un paramètre `includedSites[]`
// mais ne publie pas ses identifiants de site (ni dans la doc, ni dans les annonces), et ni le nom
// d'éditeur (« SL »), ni le domaine, ni le nom du portail ne sont reconnus (sondé le 05/10 : 0
// résultat en inclusion, aucun effet en exclusion). Conséquence : les biens hors liste sont encore
// renvoyés, donc facturés, puis écartés et comptés.
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

// Mission 71 — le socle commun à toutes les requêtes des crans : le type du bien vendeur, la vente,
// les annonces en ligne, mises à jour depuis 30 jours. Les tranches (secteur, surface, pièces,
// prix) et la page sont ajoutées par stream-estate-tiers.ts. Seuls l'appartement et la maison sont
// cherchés.
export function baseStreamEstateQuery(
  criteria: Pick<CompetitorSearchCriteria, 'propertyType'>,
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
  params.append('expired', 'false');
  const since = new Date(now.getTime() - UPDATED_WITHIN_DAYS * DAY_MS);
  params.append('fromUpdatedAt', parisDateTime(since));
  return { ok: true, params };
}

// La réponse de l'API, lue au plus juste : seuls les champs utilisés sont décrits, tout le
// reste (contacts, descriptions…) est ignoré et ne quitte jamais le serveur.
const nullableNumber = z.number().nullable().optional();
const nullableString = z.string().nullable().optional();

const advertSchema = z.object({
  url: z.string(),
  // Titre de l'annonce sur son site : celui que SeLoger génère dit « Appartement neuf à vendre ».
  title: nullableString,
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
  city: z.object({ name: nullableString, insee: nullableString }).nullable().optional(),
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
  // Biens écartés par la liste blanche : aucune annonce sur un site que l'extension relit.
  outsideWhitelist: number;
  // Biens écartés car leurs annonces sur un site de la liste sont toutes expirées, ou pas revues
  // par le robot depuis plus de 7 jours : aucune annonce d'origine utilisable.
  expiredOrigin: number;
  // Parmi les candidats, les biens NEUFS : gardés et marqués, tenus en réserve par le classement.
  newBuild: number;
  // Mission 71 — la position brute de chaque bien lu (même écarté), pour repérer un point de
  // remplissage d'une page à l'autre.
  locations: { uuid: string; point: GeoPoint | null }[];
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

function isImportableAdvert(advert: StreamEstateAdvert): boolean {
  return cleanAdvertUrl(advert.url) != null && isImportableUrl(advert.url);
}

// Pas marquée expirée, et revue par le robot dans les 7 derniers jours. Sans date de passage, rien
// ne prouve qu'elle soit encore en ligne : pas utilisable.
export function isUsableOrigin(advert: StreamEstateAdvert, now: Date): boolean {
  if (advert.expired === true || !advert.lastCrawledAt) return false;
  const seenAt = Date.parse(advert.lastCrawledAt);
  return Number.isFinite(seenAt) && now.getTime() - seenAt <= ORIGIN_SEEN_WITHIN_DAYS * DAY_MS;
}

// L'annonce d'ORIGINE : celle que l'import relira. SEULEMENT parmi les annonces sur un site de la
// liste blanche (un bien Leboncoin + SeLoger a SeLoger pour origine), et seulement si elle est
// utilisable ; la plus récemment vue par le robot. Aucune → null.
export function pickOriginAdvert(
  adverts: StreamEstateAdvert[],
  now: Date,
): StreamEstateAdvert | null {
  const usable = adverts.filter(
    (advert) => isImportableAdvert(advert) && isUsableOrigin(advert, now),
  );
  if (usable.length === 0) return null;
  return [...usable].sort((a, b) => b.lastCrawledAt!.localeCompare(a.lastCrawledAt!))[0];
}

// Le bien a-t-il au moins une annonce lisible ? Sinon il est illisible (compté à part de la liste
// blanche : ce n'est pas le même motif).
function hasUsableAdvert(property: StreamEstateProperty): boolean {
  return property.adverts.some((advert) => cleanAdvertUrl(advert.url) != null);
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

// LE NEUF chez Stream Estate : l'API ne le marque pas. Mesure du 05/10 sur les réponses
// enregistrées (136 biens distincts, 7 neufs vus) — repères STRUCTURELS seulement :
// - le titre généré par SeLoger « Appartement neuf à vendre », sur le bien ou sur l'une de ses
//   annonces (même expirée : c'est le bien qui est neuf) → 6 des 7, aucun faux positif (le titre
//   Leboncoin « …refait à neuf… » n'est pas un titre généré) ;
// - une année de construction POSTÉRIEURE à l'année en cours (2028 : livraison à venir) → 2 des 7,
//   dont le seul que le titre ne voit pas (« Appartement à vendre », année 2028). L'année en cours
//   ne suffit pas (une maison de 2026 à Levens n'est pas un programme) ;
// - une adresse /programme/ ou /neuf/ → 0 des 7 (SeLoger publie le neuf sous /annonce/achat/),
//   gardé pour les autres sites.
// L'éditeur ne distingue pas : « SL », type pro, contact « Agence professionnelle » pour 16 annonces
// neuves comme pour 64 de l'ancien. La description n'est JAMAIS lue.
export function isStreamEstateNewBuild(property: StreamEstateProperty, now: Date): boolean {
  if (isGeneratedNewBuildTitle(property.title)) return true;
  const year = now.getFullYear();
  return property.adverts.some(
    (advert) =>
      isGeneratedNewBuildTitle(advert.title) ||
      isNewBuildAddress(advert.url) ||
      (advert.constructionYear != null && advert.constructionYear > year),
  );
}

const positive = (value: number | null | undefined): number | null =>
  value != null && value > 0 ? value : null;

const STREAM_TYPE_NAMES: Record<number, string> = { 0: 'apartment', 1: 'house' };

// `repeated` : les points portés par plusieurs biens de la même réponse (coordonnées de
// remplissage, écartées) — calculés sur toute la réponse par parseStreamEstateResponse.
export function toCandidate(
  property: StreamEstateProperty,
  now: Date,
  repeated: ReadonlySet<string> = new Set(),
): CompetitorCandidate | null {
  const origin = pickOriginAdvert(property.adverts, now);
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
    isNewBuild: isStreamEstateNewBuild(property, now),
    streamEstate: {
      propertyId: property.uuid,
      originSite: detectSource(host),
      onlineSince: property.createdAt ?? null,
      lastSeenAt: origin.lastCrawledAt ?? property.lastCrawledAt ?? null,
      priceDrops: priceDrops(property.adverts),
      inseeCode: property.city?.insee?.trim() || null,
    },
    features: readStreamEstateFeatures(property, repeated),
  };
}

// Toute la réponse : chaque bien devient un candidat, dédupliqué par son identifiant Stream
// Estate. Une réponse qui n'a pas la forme attendue → null (l'action le dira, sans deviner).
// `now` : l'heure de la recherche, qui fixe la fenêtre des 7 jours.
// Mission 71 — `seenLocations` : les positions des biens DÉJÀ lus dans les pages précédentes de la
// même recherche (par identifiant), pour qu'un point de remplissage se repère d'une page à l'autre.
export function parseStreamEstateResponse(
  json: unknown,
  now: Date,
  seenLocations: ReadonlyMap<string, GeoPoint | null> = new Map(),
): ParsedStreamEstateResponse | null {
  const response = responseSchema.safeParse(json);
  if (!response.success) return null;
  const members = response.data['hydra:member'];
  const properties = members.map((member) => propertySchema.safeParse(member));
  // Un point répété se compte par BIEN distinct (un même bien renvoyé deux fois ne compte qu'une).
  const byUuid = new Map<string, GeoPoint | null>(seenLocations);
  for (const property of properties) {
    if (property.success) byUuid.set(property.data.uuid, readLocation(property.data.location));
  }
  const repeated = repeatedLocations([...byUuid.values()]);
  const locations = properties.flatMap((property) =>
    property.success
      ? [{ uuid: property.data.uuid, point: readLocation(property.data.location) }]
      : [],
  );
  const seen = new Set<string>();
  const candidates: CompetitorCandidate[] = [];
  let unreadable = 0;
  let outsideWhitelist = 0;
  let expiredOrigin = 0;
  for (const property of properties) {
    if (property.success && hasUsableAdvert(property.data)) {
      if (!property.data.adverts.some(isImportableAdvert)) {
        outsideWhitelist += 1;
        continue;
      }
      if (pickOriginAdvert(property.data.adverts, now) == null) {
        expiredOrigin += 1;
        continue;
      }
    }
    const candidate = property.success ? toCandidate(property.data, now, repeated) : null;
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
    newBuild: candidates.filter((candidate) => candidate.isNewBuild).length,
    billed: members.length,
    totalItems: response.data['hydra:totalItems'] ?? null,
    unreadable,
    outsideWhitelist,
    expiredOrigin,
    locations,
  };
}
