import type { Exclusivity } from '@/features/competitor-mandate/types';
import type { DpeClass } from '@/features/dpe/services/dpe';
import type {
  Exposure,
  GeneralCondition,
  GesRating,
  HeatingType,
  OutdoorSpace,
  ParkingType,
} from '@/features/subject-property/constants/property-options';

// Mission 114 — le jeu de données de la démonstration : trois scénarios, chacun un bien vendeur à
// importer et 12 à 15 biens que la recherche simulée peut proposer. VRAIES communes, RUES
// FICTIVES (un test tient la liste), prix et surfaces cohérents avec le marché local, agences
// fictives, annonces sur un hôte réservé, photos libres de droits rangées dans l'application.
// Rien ici ne désigne un bien, une annonce ou une agence réels.

export type DemoScenarioId = 'antibes' | 'vence' | 'mougins';

export type DemoPropertyType = 'apartment' | 'house';

export type DemoAddress = {
  // « 12 » — le numéro, et la rue, prise dans la liste des rues fictives.
  number: string;
  street: string;
};

export type DemoPriceChange = {
  daysAgo: number;
  from: number;
  to: number;
};

export type DemoSeller = {
  // Qui vend, tel que l'annonce le dirait (M83) : une agence fictive, ou rien (inconnu).
  agencyName: string | null;
  exclusivity: Exclusivity | null;
};

export type DemoListing = {
  // Identifiant publié par le portail de démonstration (clé d'identité M47) : « ant-01 ».
  id: string;
  scenario: DemoScenarioId;
  propertyType: DemoPropertyType;
  title: string;
  price: number;
  surfaceArea: number;
  landArea: number | null;
  roomsCount: number;
  bedroomsCount: number;
  bathroomsCount: number | null;
  floor: number | null;
  floorsCount: number | null;
  hasElevator: boolean | null;
  energyRating: DpeClass | null;
  gesRating: GesRating | null;
  constructionYear: number | null;
  heatingType: HeatingType | null;
  generalCondition: GeneralCondition | null;
  exposure: Exposure | null;
  outdoorSpaces: OutdoorSpace[];
  parkingTypes: ParkingType[];
  hasPool: boolean | null;
  // La commune (code INSEE de la table locale), le quartier, l'adresse fictive et sa position.
  inseeCode: string;
  district: string | null;
  address: DemoAddress;
  location: { lat: number; lon: number };
  // Les photos : des noms de fichiers de `public/demo/photos` (2 à 4 par bien).
  photos: string[];
  publishedDaysAgo: number;
  priceChanges: DemoPriceChange[];
  seller: DemoSeller;
  description: string;
  // Le prix affiché APRÈS le rendez-vous, pour « Mettre à jour les prix des concurrents » (M105) :
  // null = inchangé ; un montant plus bas = une baisse simulée.
  priceAfterMeeting: number | null;
  // Mission 127 — l'annonce a disparu après le rendez-vous : « Mettre à jour les concurrents » la
  // marque retirée (preuve simulée, M103), et la règle des annonces disparues conclut.
  goneAfterMeeting?: true;
};

export type DemoSubject = {
  propertyType: DemoPropertyType;
  title: string;
  surfaceArea: number;
  landArea: number | null;
  roomsCount: number;
  bedroomsCount: number;
  bathroomsCount: number | null;
  floor: number | null;
  floorsCount: number | null;
  hasElevator: boolean | null;
  energyRating: DpeClass;
  gesRating: GesRating;
  constructionYear: number;
  heatingType: HeatingType;
  generalCondition: GeneralCondition;
  exposure: Exposure;
  outdoorSpaces: OutdoorSpace[];
  parkingTypes: ParkingType[];
  hasPool: boolean | null;
  inseeCode: string;
  postalCode: string;
  district: string | null;
  address: DemoAddress;
  location: { lat: number; lon: number };
  photos: string[];
  // Le prix affiché par l'annonce du bien (information seulement, M38 : il ne remplit rien).
  listedPrice: number;
  // La fourchette que le conseiller saisira (M38) — proposée au closer dans le scénario.
  advisorRange: { min: number; max: number };
  description: string;
  strengths: string[];
  // Les montants factuels de la fiche (M44).
  monthlyCharges: number | null;
  propertyTax: number | null;
};

export type DemoScenario = {
  id: DemoScenarioId;
  label: string;
  sellerName: string;
  subject: DemoSubject;
  listings: DemoListing[];
};
