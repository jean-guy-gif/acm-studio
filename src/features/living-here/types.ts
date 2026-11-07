import type { SourceBlock } from '@/features/address-dossier/types';

// Mission 142 — « Vivre ici » : ce qui entoure un bien qu'un acquéreur va visiter, dans des données
// publiques et gratuites. Jamais l'adresse exacte d'un bien qui n'est pas de l'agence (M119).

// D'où partent les distances : l'adresse d'un mandat signé de l'agence, sinon le quartier (la
// position de l'annonce arrondie), sinon le centre de la commune ; l'écran le dit (décision du 07/11).
export type StartOrigin = 'address' | 'district' | 'commune';

export const DAILY_CATEGORIES = ['bakery', 'supermarket', 'pharmacy', 'doctor'] as const;
export const SCHOOL_CATEGORIES = [
  'nursery_school',
  'primary_school',
  'middle_school',
  'high_school',
] as const;
export type DailyCategory = (typeof DAILY_CATEGORIES)[number];
export type SchoolCategory = (typeof SCHOOL_CATEGORIES)[number];
export type PlaceCategory = DailyCategory | SchoolCategory | 'transit' | 'green_space';

// Un lieu : sa catégorie, son nom public et les minutes à pied ; jamais son adresse (décision du
// 07/11, pour ne rien laisser trianguler).
export type NearbyPlace = {
  category: PlaceCategory;
  name: string | null;
  walkMinutes: number;
};

export type DriveKind = 'tgv_station' | 'airport' | 'town_centre';
export type Drive = { kind: DriveKind; name: string; minutes: number };

export type DailyData = { places: NearbyPlace[] };
export type SchoolsData = { places: NearbyPlace[] };
export type MovesData = { transit: NearbyPlace | null; drives: Drive[] };
export type SurroundingsData = { green: NearbyPlace | null };
// Les risques de la commune par leur code Géorisques (deux chiffres), dits dans la langue du lecteur.
export type RisksLine = {
  riskCodes: string[];
  seismicZone: string | null; // « 1 » à « 5 »
  clay: 'low' | 'medium' | 'high' | null;
};

export type LivingHereBlocks = {
  daily: SourceBlock<DailyData>;
  schools: SourceBlock<SchoolsData>;
  moves: SourceBlock<MovesData>;
  surroundings: SourceBlock<SurroundingsData>;
  risks: SourceBlock<RisksLine>;
};

export type LivingHereSheet = {
  propertyKey: string;
  origin: StartOrigin;
  // Le nom de la commune, pour « depuis le centre de … » et « depuis le quartier (…) ».
  commune: string;
  builtAt: string;
  blocks: LivingHereBlocks;
};

// Ce qui part vers le navigateur de l'acquéreur, par liste d'autorisation (relecture du 07/11) : ni
// la clé du bien (elle peut porter l'adresse de l'annonce), ni sa date de construction.
export type PublicLivingHereSheet = Pick<LivingHereSheet, 'origin' | 'commune' | 'blocks'>;

// Le trajet jusqu'au lieu de l'acquéreur, pour une visite : le lieu se relit sur sa fiche.
export type LivingPlaceTrip = { label: string; minutes: number };

export const SECTOR_PRIORITIES = ['quiet', 'schools', 'shops_on_foot'] as const;
export type SectorPriority = (typeof SECTOR_PRIORITIES)[number];
