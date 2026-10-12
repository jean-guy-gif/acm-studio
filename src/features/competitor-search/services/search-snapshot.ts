import { z } from 'zod';

import { detectSource } from '@/features/comparable-import/utils/detect-source';
import type { ComparableInput } from '@/features/comparables/utils/comparable-input';
import type { CompetitorCandidate } from '@/features/competitor-search/types';
import { normalizePropertyType } from '@/features/competitor-search/utils/normalize-property-type';
import { DPE_CLASSES } from '@/features/dpe/services/dpe';
import { OUTDOOR_SPACES } from '@/features/subject-property/constants/property-options';

// Mission 101 — ce que la RECHERCHE a déjà donné sur un bien retenu (carte Stream Estate ou carte
// d'un portail), gardé côté serveur tant que son import n'a pas abouti. Si la page de l'annonce
// reste illisible, le concurrent est créé depuis ces données : aucun nouvel appel payant, aucun
// champ inventé. Champs STRUCTURÉS seulement : jamais de description (décision Stream Estate).
// Pur.

const text = (max: number) => z.string().trim().min(1).max(max).nullable().catch(null);
const amount = (max: number) => z.number().finite().positive().max(max).nullable().catch(null);
const count = z.number().int().positive().max(200).nullable().catch(null);

export const searchSnapshotSchema = z.object({
  source: z.enum(['stream_estate', 'portal']),
  title: text(300),
  price: amount(1_000_000_000),
  surfaceArea: amount(100_000),
  landArea: amount(100_000_000),
  roomsCount: count,
  bedroomsCount: count,
  propertyType: text(60),
  city: text(120),
  district: text(120),
  pricePerSqm: amount(1_000_000),
  energyClass: z.enum(DPE_CLASSES).nullable().catch(null),
  constructionYear: z.number().int().min(1000).max(2100).nullable().catch(null),
  outdoorSpaces: z.array(z.enum(OUTDOOR_SPACES)).max(10).catch([]),
  photoUrls: z.array(z.string().url().startsWith('https://').max(2000)).max(40).catch([]),
  // Stream Estate : la dernière baisse connue, avec ses montants quand l'API les donne.
  lastPriceDrop: z
    .object({
      at: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .nullable()
        .catch(null),
      amount: amount(1_000_000_000),
      percent: z.number().finite().positive().max(100).nullable().catch(null),
    })
    .nullable()
    .catch(null),
});

export type SearchSnapshot = z.infer<typeof searchSnapshotSchema>;

export function parseSearchSnapshot(raw: unknown): SearchSnapshot | null {
  const parsed = searchSnapshotSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

const isOutdoor = (value: string): value is (typeof OUTDOOR_SPACES)[number] =>
  (OUTDOOR_SPACES as readonly string[]).includes(value);

// La carte telle que l'écran la tient → ce que le serveur garde. Rien n'est calculé : la dernière
// baisse est celle que dit Stream Estate (montant = ancien prix − nouveau prix, s'il les donne).
export function candidateSnapshot(candidate: CompetitorCandidate): SearchSnapshot {
  const stream = candidate.streamEstate;
  const lastChange = stream?.priceChanges?.at(-1) ?? null;
  const lastPercent = lastChange?.percent ?? stream?.priceDrops.at(-1) ?? null;
  const dropAmount =
    lastChange?.from != null && lastChange.to != null && lastChange.from > lastChange.to
      ? lastChange.from - lastChange.to
      : null;
  const raw = {
    source: stream ? 'stream_estate' : 'portal',
    title: candidate.title,
    price: candidate.price,
    surfaceArea: candidate.surfaceArea,
    landArea: candidate.landArea,
    roomsCount: candidate.roomsCount,
    bedroomsCount: stream?.bedrooms ?? null,
    propertyType: candidate.propertyType,
    city: candidate.city,
    district: candidate.features?.district ?? null,
    pricePerSqm: candidate.pricePerSqm,
    energyClass: candidate.energyClass ?? null,
    constructionYear: candidate.features?.constructionYear ?? null,
    outdoorSpaces: (candidate.features?.outdoor?.present ?? []).filter(isOutdoor),
    // Les adresses sûres seulement : une adresse douteuse est écartée, les autres restent.
    photoUrls: candidate.photoUrls.filter((photo) => photo.startsWith('https://')).slice(0, 40),
    lastPriceDrop:
      lastPercent != null && lastPercent < 0
        ? { at: lastChange?.at ?? null, amount: dropAmount, percent: Math.abs(lastPercent) }
        : null,
  };
  // Une valeur hors bornes devient absente (`catch`) : la forme rendue est toujours valide.
  return searchSnapshotSchema.parse(raw);
}

// Les champs que la création depuis la recherche laisse « À vérifier » même VIDES : le vendeur et
// l'exclusivité (seule la page de l'annonce les dit, M83), et les chambres quand la recherche ne
// les a pas données.
export const ALWAYS_VERIFY_AFTER_SEARCH_IMPORT = ['sold_by', 'exclusivity'] as const;

// Le concurrent tel que la recherche le décrit. null : pas de prix — un concurrent sans prix n'a
// pas de sens (et le prix est requis en base), on n'invente pas un zéro : le bien reste en attente.
export function snapshotToComparableInput(
  snapshot: SearchSnapshot,
  listingUrl: URL,
): ComparableInput | null {
  if (snapshot.price == null) return null;
  return {
    title: snapshot.title,
    address: null,
    postal_code: null,
    city: snapshot.city,
    surface_area: snapshot.surfaceArea,
    land_area: snapshot.landArea,
    rooms_count: snapshot.roomsCount,
    bedrooms_count: snapshot.bedroomsCount,
    bathrooms_count: null,
    energy_rating: snapshot.energyClass,
    ges_rating: null,
    construction_year: snapshot.constructionYear,
    heating_type: null,
    energy_source: null,
    district: snapshot.district,
    portal_price_per_square_meter: snapshot.pricePerSqm,
    listing_url: listingUrl.href,
    source: detectSource(listingUrl.hostname),
    price: snapshot.price,
    // La date de mise en ligne est celle que PUBLIE le portail (M47) : la recherche ne la donne
    // pas, elle reste vide plutôt que d'y écrire la date du premier passage de Stream Estate.
    days_on_market: null,
    listing_published_at: null,
    price_drop_amount: snapshot.lastPriceDrop?.amount ?? null,
    price_drop_percentage: snapshot.lastPriceDrop?.percent ?? null,
    advisor_notes: null,
    photo_urls: snapshot.photoUrls,
    listing_description: null,
    listing_features: [],
    general_condition: null,
    exposure: null,
    outdoor_spaces: snapshot.outdoorSpaces,
    parking_types: [],
  };
}

// Le type canonique écrit en base, comme à l'import d'une page.
export function snapshotPropertyType(snapshot: SearchSnapshot): string | null {
  return normalizePropertyType(snapshot.propertyType);
}
