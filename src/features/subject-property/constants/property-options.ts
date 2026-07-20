// Controlled vocabularies for the structured seller-property fields. These MUST
// stay in sync with the CHECK constraints of the subject_property migration.

export const GES_RATINGS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const;
export type GesRating = (typeof GES_RATINGS)[number];

export const EXPOSURES = [
  'north',
  'north_east',
  'east',
  'south_east',
  'south',
  'south_west',
  'west',
  'north_west',
  'dual_aspect',
  'multiple',
  'unknown',
] as const;
export type Exposure = (typeof EXPOSURES)[number];

export const GENERAL_CONDITIONS = [
  'new',
  'excellent',
  'good',
  'to_refresh',
  'to_renovate',
  'major_renovation',
] as const;
export type GeneralCondition = (typeof GENERAL_CONDITIONS)[number];

export const HEATING_TYPES = [
  'individual_electric',
  'individual_gas',
  'individual_heat_pump',
  'individual_fuel',
  'individual_wood',
  'collective_gas',
  'collective_fuel',
  'collective_heat_network',
  'mixed',
  'none',
  'unknown',
] as const;
export type HeatingType = (typeof HEATING_TYPES)[number];

export const OUTDOOR_SPACES = [
  'balcony',
  'terrace',
  'garden',
  'loggia',
  'veranda',
  'roof_terrace',
  'none',
] as const;
export type OutdoorSpace = (typeof OUTDOOR_SPACES)[number];

export const PARKING_TYPES = [
  'garage',
  'closed_box',
  'indoor_parking',
  'outdoor_parking',
  'carport',
  'none',
] as const;
export type ParkingType = (typeof PARKING_TYPES)[number];

// Limits for the free-text argument lists (strengths / watch points).
export const MAX_LIST_ITEMS = 10;
export const MAX_LIST_ITEM_LENGTH = 200;

// Value that must never coexist with another in a multi-select array.
export const EXCLUSIVE_NONE = 'none';

// French display labels — used by the read-only presentation / Live layers.
export const GES_LABELS: Record<GesRating, string> = {
  A: 'A',
  B: 'B',
  C: 'C',
  D: 'D',
  E: 'E',
  F: 'F',
  G: 'G',
};

export const EXPOSURE_LABELS: Record<Exposure, string> = {
  north: 'Nord',
  north_east: 'Nord-Est',
  east: 'Est',
  south_east: 'Sud-Est',
  south: 'Sud',
  south_west: 'Sud-Ouest',
  west: 'Ouest',
  north_west: 'Nord-Ouest',
  dual_aspect: 'Traversant',
  multiple: 'Multiple',
  unknown: 'Non renseignée',
};

export const GENERAL_CONDITION_LABELS: Record<GeneralCondition, string> = {
  new: 'Neuf',
  excellent: 'Excellent',
  good: 'Bon',
  to_refresh: 'À rafraîchir',
  to_renovate: 'À rénover',
  major_renovation: 'Gros travaux',
};

export const HEATING_TYPE_LABELS: Record<HeatingType, string> = {
  individual_electric: 'Individuel électrique',
  individual_gas: 'Individuel gaz',
  individual_heat_pump: 'Individuel pompe à chaleur',
  individual_fuel: 'Individuel fioul',
  individual_wood: 'Individuel bois',
  collective_gas: 'Collectif gaz',
  collective_fuel: 'Collectif fioul',
  collective_heat_network: 'Réseau de chaleur',
  mixed: 'Mixte',
  none: 'Aucun',
  unknown: 'Non renseigné',
};

export const OUTDOOR_SPACE_LABELS: Record<OutdoorSpace, string> = {
  balcony: 'Balcon',
  terrace: 'Terrasse',
  garden: 'Jardin',
  loggia: 'Loggia',
  veranda: 'Véranda',
  roof_terrace: 'Toit-terrasse',
  none: 'Aucun',
};

export const PARKING_TYPE_LABELS: Record<ParkingType, string> = {
  garage: 'Garage',
  closed_box: 'Box fermé',
  indoor_parking: 'Parking couvert',
  outdoor_parking: 'Parking extérieur',
  carport: 'Carport',
  none: 'Aucun',
};
