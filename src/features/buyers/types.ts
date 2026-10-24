import type { Database } from '@/lib/supabase/database.types';

// Mission 117 — la fiche acquéreur. Un acquéreur n'appartient à aucun dossier vendeur : il vit par
// lui-même, dans son agence, que toute l'agence partage (décision de Jean-Guy, 24/10). La fiche
// note ce que le conseiller entend en découverte : qui il est, ce qu'il cherche, ses lignes rouges.

export type BuyerRow = Database['public']['Tables']['buyers']['Row'];

export const BUYER_STATUSES = ['searching', 'visiting', 'bought', 'abandoned'] as const;
export type BuyerStatus = (typeof BUYER_STATUSES)[number];
export const BUYER_STATUS_LABELS: Record<BuyerStatus, string> = {
  searching: 'En recherche',
  visiting: 'En visite',
  bought: 'A acheté',
  abandoned: 'Abandonné',
};

export const BUYER_PURPOSES = ['primary', 'secondary', 'investment', 'other'] as const;
export type BuyerPurpose = (typeof BUYER_PURPOSES)[number];
export const BUYER_PURPOSE_LABELS: Record<BuyerPurpose, string> = {
  primary: 'Résidence principale',
  secondary: 'Résidence secondaire',
  investment: 'Investissement',
  other: 'Autre',
};

export const BUYER_TIMELINES = ['now', 'three_months', 'six_months', 'later'] as const;
export type BuyerTimeline = (typeof BUYER_TIMELINES)[number];
export const BUYER_TIMELINE_LABELS: Record<BuyerTimeline, string> = {
  now: 'Dès maintenant',
  three_months: 'Dans 3 mois',
  six_months: 'Dans 6 mois',
  later: 'Plus tard',
};

// Pour commencer, un acquéreur cherche un appartement ou une maison (M54 : les deux ne se
// comparent pas).
export const BUYER_PROPERTY_TYPES = ['apartment', 'house'] as const;
export type BuyerPropertyType = (typeof BUYER_PROPERTY_TYPES)[number];

// Les critères de « ce qu'il cherche » : chacun est une PRÉFÉRENCE, sauf si le conseiller le
// coche INDISPENSABLE (`mustHave`).
export const BUYER_CRITERIA = [
  'property_types',
  'cities',
  'budget',
  'rooms',
  'bedrooms',
  'surface',
  'outdoor',
  'parking',
  'pool',
  'floor',
  'elevator',
  'energy_rating',
  'works',
] as const;
export type BuyerCriterion = (typeof BUYER_CRITERIA)[number];
export const BUYER_CRITERION_LABELS: Record<BuyerCriterion, string> = {
  property_types: 'Type de bien',
  cities: 'Communes',
  budget: 'Budget',
  rooms: 'Pièces',
  bedrooms: 'Chambres',
  surface: 'Surface',
  outdoor: 'Extérieur',
  parking: 'Parking',
  pool: 'Piscine',
  floor: 'Étage',
  elevator: 'Ascenseur',
  energy_rating: 'DPE',
  works: 'Travaux',
};

export const ENERGY_RATINGS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const;
export type EnergyRating = (typeof ENERGY_RATINGS)[number];

// Ce que le conseiller saisit : tout facultatif, sauf le nom et au moins une commune.
export type BuyerInput = {
  name: string;
  phone: string | null;
  email: string | null;
  purpose: BuyerPurpose | null;
  timeline: BuyerTimeline | null;
  notes: string | null;
  propertyTypes: BuyerPropertyType[];
  // Les communes telles que tapées, dédoublonnées par leur clé (M71, M86, M99).
  cities: string[];
  budgetIdeal: number | null;
  budgetMax: number | null;
  roomsMin: number | null;
  bedroomsMin: number | null;
  surfaceMin: number | null;
  outdoor: boolean | null;
  parking: boolean | null;
  pool: boolean | null;
  floorMin: number | null;
  elevator: boolean | null;
  // « DPE minimum » : la plus mauvaise lettre acceptée.
  energyRatingMax: EnergyRating | null;
  worksAccepted: boolean | null;
  mustHave: BuyerCriterion[];
  dealBreakers: string | null;
};

export type Buyer = BuyerInput & {
  id: string;
  agencyId: string;
  advisorId: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  status: BuyerStatus;
  statusChangedAt: string;
  demo: boolean;
};
