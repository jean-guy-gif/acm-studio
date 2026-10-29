import { poolFromLabels } from '@/features/competitor-search/services/stream-estate-features';
import { listingPhotoUrls } from '@/features/prospecting-file/services/their-photo';
import type { BuyerProspectFacts } from '@/features/buyer-prospecting/types';
import {
  OUTDOOR_SPACES,
  PARKING_TYPES,
} from '@/features/subject-property/constants/property-options';

// Mission 120 — ce que l'annonce d'un bien démarché publie, en LISTE D'AUTORISATION : rien d'autre
// n'entre dans `buyer_prospects.facts`, et ce qui y est relu repasse par le même tri (une valeur
// hors bornes ou hors liste devient absente, M101). Ni titre, ni description, ni adresse de
// l'annonce : le courrier au propriétaire n'en a pas besoin. Pur.

const MAX_TEXT = 120;
const MAX_PHOTOS = 20;

const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' && value.trim().length <= MAX_TEXT
    ? value.trim()
    : null;

const positive = (value: unknown, max: number): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= max ? value : null;

const inList = (value: unknown, list: readonly string[]): string[] =>
  Array.isArray(value)
    ? [...new Set(value.filter((entry): entry is string => list.includes(entry as string)))].filter(
        (entry) => entry !== 'none',
      )
    : [];

const flag = (value: unknown): boolean | null => (typeof value === 'boolean' ? value : null);

const rating = (value: unknown): string | null =>
  typeof value === 'string' && /^[A-G]$/.test(value.trim().toUpperCase())
    ? value.trim().toUpperCase()
    : null;

export const NO_FACTS: BuyerProspectFacts = {
  propertyType: null,
  surfaceArea: null,
  roomsCount: null,
  landArea: null,
  outdoorSpaces: [],
  parkingTypes: [],
  hasPool: null,
  energyRating: null,
  district: null,
  city: null,
  price: null,
  photoUrls: [],
};

// Une source de faits, sous les noms de l'import d'annonce (M38) ou de la recherche (M118).
type FactsSource = Record<string, unknown> | null | undefined;

const pick = (sources: FactsSource[], key: string): unknown =>
  sources.map((source) => source?.[key]).find((value) => value != null);

// Les faits d'un bien retenu : ce que l'import a lu d'abord, puis ce que la recherche en disait
// (un bien dont la page est restée illisible garde les données de la recherche, M118).
export function prospectFacts(...sources: FactsSource[]): BuyerProspectFacts {
  return {
    propertyType: text(pick(sources, 'propertyType')),
    surfaceArea: positive(pick(sources, 'surfaceArea'), 100_000),
    roomsCount: positive(pick(sources, 'roomsCount'), 100),
    landArea: positive(pick(sources, 'landArea'), 10_000_000),
    outdoorSpaces: inList(pick(sources, 'outdoorSpaces'), OUTDOOR_SPACES),
    parkingTypes: inList(pick(sources, 'parkingTypes'), PARKING_TYPES),
    hasPool: flag(pick(sources, 'hasPool')),
    energyRating: rating(pick(sources, 'energyRating')),
    district: text(pick(sources, 'district')),
    city: text(pick(sources, 'city')),
    price: positive(pick(sources, 'price'), 1_000_000_000),
    photoUrls: listingPhotoUrls(pick(sources, 'photoUrls')).slice(0, MAX_PHOTOS),
  };
}

// Les faits d'un concurrent (colonnes de `comparables`), sous les mêmes noms.
export function comparableFacts(row: {
  property_type: string | null;
  surface_area: number | null;
  rooms_count: number | null;
  land_area: number | null;
  outdoor_spaces: string[] | null;
  parking_types: string[] | null;
  listing_features?: unknown;
  energy_rating: string | null;
  district: string | null;
  city: string | null;
  price: number | null;
  photo_urls: unknown;
}): BuyerProspectFacts {
  return prospectFacts({
    propertyType: row.property_type,
    surfaceArea: row.surface_area,
    roomsCount: row.rooms_count,
    landArea: row.land_area,
    outdoorSpaces: row.outdoor_spaces,
    parkingTypes: row.parking_types,
    // Mission 122 — la piscine se lit dans les étiquettes de l'annonce (M110).
    hasPool: Array.isArray(row.listing_features)
      ? poolFromLabels(
          row.listing_features.filter((label): label is string => typeof label === 'string'),
        )
      : null,
    energyRating: row.energy_rating,
    district: row.district,
    city: row.city,
    price: row.price,
    photoUrls: row.photo_urls,
  });
}

// Relu en base : la colonne `facts` repasse par la même liste.
export function storedFacts(raw: unknown): BuyerProspectFacts {
  return raw != null && typeof raw === 'object' && !Array.isArray(raw)
    ? prospectFacts(raw as Record<string, unknown>)
    : NO_FACTS;
}
