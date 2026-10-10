import type { DpeClass } from '@/features/dpe/services/dpe';
import type { PropertyType } from '@/features/subject-property/constants/property-options';

// Mission 84 — le dossier de prospection : un document A4 remis au propriétaire d'un bien
// concurrent (recto-verso) ou au confrère qui l'a en exclusivité (une page). Il SORT de
// l'agence : n'y entrent que les informations publiques de NOTRE annonce et ce que l'annonce
// du concurrent publie. Jamais le nom du vendeur, sa valeur perçue, l'analyse ou la fourchette
// du conseiller ; jamais une photo du concurrent.

export const PROSPECTING_FILE_VERSIONS = ['owner', 'colleague'] as const;
export type ProspectingFileVersion = (typeof PROSPECTING_FILE_VERSIONS)[number];

export const PROSPECTING_FILE_VERSION_LABELS: Record<ProspectingFileVersion, string> = {
  owner: 'Propriétaire',
  colleague: 'Confrère',
};

// Le type du bien, tel que la recherche de concurrents le normalise ; `unknown` quand il ne se
// reconnaît pas : le document dit alors « bien ».
export type PropertyKind = PropertyType | 'unknown';

// Ce qu'une annonce publie d'un bien. Les deux côtés portent les mêmes champs : une ligne ne
// s'affiche que si elle est connue des deux.
export type ListedProperty = {
  surfaceArea: number | null;
  roomsCount: number | null;
  landArea: number | null;
  // Vocabulaires de la fiche (extérieurs, stationnements) ; liste vide = non renseigné.
  outdoorSpaces: string[];
  parkingTypes: string[];
  dpe: DpeClass | null;
  district: string | null;
  city: string | null;
  price: number | null;
};

export type ProspectingFileFacts = {
  kind: PropertyKind;
  // Notre bien : notre prix est le prix de commercialisation de la conclusion.
  ours: ListedProperty;
  theirs: ListedProperty;
  // Adresse du bien concurrent rendue par le Localisateur, seulement si elle est confirmée.
  theirAddress: string | null;
  // Distance entre les deux biens, seulement entre deux positions sûres ; sinon null.
  distanceMeters: number | null;
};

// Les textes que le conseiller peut réécrire. `*mot*` met en valeur.
export type ProspectingFileTexts = {
  title: string;
  letter: string;
  keyMessage: string;
  proposals: [string, string, string];
  contactHook: string;
};

export type CardRow = { label: string; value: string; dpe: DpeClass | null };

export type PropertyCard = { label: string; title: string; rows: CardRow[] };

export type ProspectingFile = {
  version: ProspectingFileVersion;
  kind: PropertyKind;
  pricesShown: boolean;
  addressee: { lead: string; name: string; detail: string | null };
  defaults: ProspectingFileTexts;
  ours: PropertyCard;
  theirs: PropertyCard;
  // À la place de la photo du concurrent, qui n'est jamais reprise.
  theirPlaceholder: string[];
  closeness: string[];
  differences: string[];
  fixed: FixedTexts;
};

// Les textes fixes de la maquette (non modifiables).
export type FixedTexts = {
  closenessTitle: string;
  differencesTitle: string;
  proposalTitle: string;
  chain: [string, string, string];
  // Verso de la version propriétaire ; null pour le confrère (une seule page).
  back: {
    kicker: string;
    title: string;
    alone: { label: string; visits: number; caption: string; note: string };
    together: { label: string; visits: number; caption: string; note: string };
  } | null;
  turnPage: string | null;
  information: string;
  // « Pour ne plus être sollicité » : le téléphone du conseiller y est ajouté à l'affichage.
  optOut: string | null;
};

// Qui signe le dossier : le conseiller connecté et son agence.
export type ProspectingSender = {
  advisorName: string;
  email: string;
  phone: string | null;
  photoUrl: string | null;
  agencyName: string;
  logoUrl: string | null;
  postalAddress: string | null;
  professionalCard: string | null;
};

// Ce que le conseiller a réécrit et qui est gardé ; null = le texte ou le choix proposé.
export type ProspectingFileOverrides = {
  title: string | null;
  letter: string | null;
  keyMessage: string | null;
  proposals: [string | null, string | null, string | null];
  contactHook: string | null;
  showPrices: boolean | null;
  photoPath: string | null;
};

export const NO_OVERRIDES: ProspectingFileOverrides = {
  title: null,
  letter: null,
  keyMessage: null,
  proposals: [null, null, null],
  contactHook: null,
  showPrices: null,
  photoPath: null,
};
