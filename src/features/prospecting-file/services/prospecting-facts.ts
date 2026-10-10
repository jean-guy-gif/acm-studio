import { normalizePropertyType } from '@/features/competitor-search/utils/normalize-property-type';
import { dpeClass } from '@/features/dpe/services/dpe';
import type {
  ListedProperty,
  PropertyKind,
  ProspectingFileFacts,
} from '@/features/prospecting-file/types';
import {
  PROPERTY_TYPES,
  type PropertyType,
} from '@/features/subject-property/constants/property-options';

// Mission 84 — ce qui ENTRE dans le dossier. Deux listes de colonnes, et rien d'autre : ce qui
// n'est pas lu ne peut pas sortir de l'agence.

// Notre bien : seulement ce que notre annonce publie. Ni adresse, ni fourchette du conseiller.
export const OUR_LISTING_SELECT =
  'property_type, surface_area, rooms_count, land_area, outdoor_spaces, parking_types, energy_rating, district, city' as const;

// Le bien concurrent : ce que son annonce publie. Ni ses photos, ni son titre, ni sa
// description, ni les notes du conseiller.
export const THEIR_LISTING_SELECT =
  'property_type, surface_area, rooms_count, land_area, outdoor_spaces, parking_types, energy_rating, district, city, price' as const;

export type OurListingRow = {
  property_type: string | null;
  surface_area: number | null;
  rooms_count: number | null;
  land_area: number | null;
  outdoor_spaces: string[] | null;
  parking_types: string[] | null;
  energy_rating: string | null;
  district: string | null;
  city: string | null;
};

export type TheirListingRow = OurListingRow & { price: number | null };

const positive = (value: number | null): number | null =>
  value != null && Number.isFinite(value) && value > 0 ? value : null;

const text = (value: string | null): string | null => value?.trim() || null;

function listed(row: OurListingRow, price: number | null): ListedProperty {
  return {
    surfaceArea: positive(row.surface_area),
    roomsCount: positive(row.rooms_count),
    landArea: positive(row.land_area),
    outdoorSpaces: row.outdoor_spaces ?? [],
    parkingTypes: row.parking_types ?? [],
    dpe: dpeClass(row.energy_rating),
    district: text(row.district),
    city: text(row.city),
    price: positive(price),
  };
}

function propertyKind(...types: (string | null)[]): PropertyKind {
  for (const type of types) {
    const canonical = normalizePropertyType(type);
    if (canonical != null && (PROPERTY_TYPES as readonly string[]).includes(canonical)) {
      return canonical as PropertyType;
    }
  }
  return 'unknown';
}

export function buildProspectingFacts(input: {
  ours: OurListingRow;
  // Notre prix : le prix de commercialisation de la conclusion, ou null.
  ourPrice: number | null;
  theirs: TheirListingRow;
  // Adresse du Localisateur, à ne passer que si elle est confirmée.
  theirAddress: string | null;
  distanceMeters: number | null;
}): ProspectingFileFacts {
  return {
    // Le type est un filtre dur de la recherche (M54) : les deux biens ont le même. Celui du
    // bien vendeur d'abord, celui du concurrent si le premier ne se reconnaît pas.
    kind: propertyKind(input.ours.property_type, input.theirs.property_type),
    ours: listed(input.ours, input.ourPrice),
    theirs: listed(input.theirs, input.theirs.price),
    theirAddress: text(input.theirAddress),
    distanceMeters:
      input.distanceMeters != null && Number.isFinite(input.distanceMeters)
        ? input.distanceMeters
        : null,
  };
}
