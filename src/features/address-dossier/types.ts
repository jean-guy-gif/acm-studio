// Mission 141 — le dossier d'adresse : ce que les données publiques et gratuites disent de
// l'adresse du bien vendeur. Écran du conseiller seulement : rien ne va devant le vendeur.

export type DossierPropertyType = 'house' | 'apartment';

// Une vente réelle (DVF) : jamais une adresse, une parcelle ni un nom.
export type RealSale = {
  date: string; // AAAA-MM-JJ
  price: number;
  surface: number;
  pricePerM2: number;
  rooms: number | null;
  distanceM: number;
};

export type SalesStats = { count: number; median: number; q1: number; q3: number };

export type SalesData = {
  propertyType: DossierPropertyType;
  radiusM: 500 | 1000;
  // Toutes les ventes du rayon, comptées ; médiane et quartiles sur elles toutes (null sous 5).
  count: number;
  stats: SalesStats | null;
  // Les plus récentes, pour la liste (une vingtaine au plus).
  recent: RealSale[];
  // La vente la plus récente trouvée dans les fichiers lus : la date de la source.
  latestSaleDate: string | null;
};

export type DpeData = {
  date: string;
  energy: string;
  ges: string | null;
  surface: number | null;
  buildingType: 'maison' | 'appartement' | 'immeuble' | null;
  // Les DPE trouvés à cette adresse exacte (identifiant de la Base Adresse Nationale).
  count: number;
};

export type RisksData = {
  communeRisks: string[];
  seismicZone: string | null;
  radonClass: '1' | '2' | '3' | null;
  clayExposure: string | null;
  pollutedSites: number;
  groundMovements: number;
};

export type Servitude = { code: string; label: string; name: string | null };

export type UrbanismData = {
  zone: { code: string; label: string | null } | null;
  servitudes: Servitude[];
};

export type ParcelData = { section: string; number: string; area: number | null };

export type CondoSyndic =
  | { kind: 'professional'; name: string | null }
  | { kind: 'volunteer' }
  | {
      kind: 'unknown';
    };

export type CondoData = {
  name: string | null;
  lots: number | null;
  housingLots: number | null;
  period: string | null;
  syndic: CondoSyndic;
  updatedOn: string | null;
};

// L'état d'une source : lue (`ok`), rien trouvé à cette adresse (`empty`), en panne
// (`unavailable`). Une source en panne à l'actualisation garde sa dernière lecture réussie, avec
// sa date, et dit quand elle n'a pas répondu (`failedAt`).
export type SourceBlock<T> =
  | { state: 'ok'; readAt: string; sourceDate: string | null; data: T; failedAt?: string }
  | { state: 'empty'; readAt: string; sourceDate: string | null; note?: EmptyNote }
  | { state: 'unavailable'; readAt: string };

// Pourquoi rien n'a été trouvé, quand ce n'est pas l'adresse elle-même.
export type EmptyNote = 'street_only' | 'parcel_undetermined' | 'not_a_house_or_apartment';

export type DossierBlocks = {
  sales: SourceBlock<SalesData>;
  dpe: SourceBlock<DpeData>;
  risks: SourceBlock<RisksData>;
  urbanism: SourceBlock<UrbanismData>;
  parcel: SourceBlock<ParcelData>;
  condo: SourceBlock<CondoData>;
};

export type SourceKey = keyof DossierBlocks;

export const SOURCE_KEYS: readonly SourceKey[] = [
  'sales',
  'dpe',
  'risks',
  'urbanism',
  'parcel',
  'condo',
];

export type AddressDossier = {
  builtAt: string;
  fingerprint: string;
  blocks: DossierBlocks;
};
