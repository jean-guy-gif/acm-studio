import type { DpeClass } from '@/features/dpe/services/dpe';
import type { PropertyType } from '@/features/subject-property/constants/property-options';

// Mission 84 — le dossier de prospection : un document A4 remis au propriétaire d'un bien
// concurrent (recto-verso) ou au confrère qui l'a en exclusivité (une page). Il SORT de
// l'agence : n'y entrent que les informations publiques de NOTRE annonce et ce que l'annonce
// du concurrent publie. Jamais le nom du vendeur, sa valeur perçue, l'analyse ou la fourchette
// du conseiller. Mission 87 — la photo du concurrent n'y entre que si le conseiller l'a choisie.

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
  // Mission 102 — d'où vient cette adresse : le courrier le dit, et dit vrai.
  theirAddressSource: AddressSource;
  // Distance entre les deux biens, seulement entre deux positions sûres ; sinon null.
  distanceMeters: number | null;
};

// Qui a établi l'adresse du bien concurrent : le Localisateur (données publiques : DPE,
// registre des copropriétés, cadastre) — que le conseiller l'ait confirmée ou non —, ou le
// conseiller qui l'a saisie ou corrigée. Mission 103 — `verified` : la source d'origine n'est
// plus connue (adresse confirmée avant la mission, ou dans le Localisateur lui-même).
export type AddressSource = 'locator' | 'advisor' | 'verified';

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
  // Le nom du destinataire, ligne par ligne : une adresse ne se coupe pas au milieu (M87).
  addressee: { lead: string; nameLines: string[]; detail: string | null };
  // Mission 102 — l'origine de l'adresse, pour la mention légale du courrier propriétaire.
  addressSource: AddressSource;
  defaults: ProspectingFileTexts;
  ours: PropertyCard;
  theirs: PropertyCard;
  // Dans le cadre gris, quand le dossier ne montre pas de photo du concurrent.
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
  // Pied de la version confrère. La version propriétaire porte à la place la mention sur le
  // traitement de l'adresse (legal-mention.ts), composée avec l'expéditeur : null ici.
  information: string | null;
};

// Qui signe le dossier : le conseiller connecté et son agence.
export type ProspectingSender = {
  advisorName: string;
  // Mission 87 — `agencyName` est le nom IMPRIMÉ : « Nom sur les documents » s'il est rempli,
  // sinon le nom de l'agence.
  email: string;
  phone: string | null;
  photoUrl: string | null;
  agencyName: string;
  logoUrl: string | null;
  postalAddress: string | null;
  // Mission 102 — la carte professionnelle et qui l'a délivrée (CCI ou préfecture) : exigées
  // pour imprimer. La garantie financière si l'agence en a une ; sinon le document dit « Ne
  // peut recevoir aucun fonds ».
  professionalCard: string | null;
  professionalCardIssuer: string | null;
  financialGuarantee: string | null;
  // L'adresse de la page de confidentialité, telle qu'elle s'imprime (sans « https:// »).
  privacyUrl: string;
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
