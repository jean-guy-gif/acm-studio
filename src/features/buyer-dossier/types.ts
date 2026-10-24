import type { QrCode } from '@/features/contact-card/services/qr-code';

// Mission 119 (partie B) — le dossier acquéreur : la même sélection (M118) que la présentation, dans
// la forme de la synthèse vendeur (M113), à imprimer ou à envoyer par un lien. Une seule source : la
// sélection retenue. Rien n'y entre que la liste d'autorisation de la présentation ne permette.

export type DossierItem = {
  itemId: string;
  position: number;
  label: string;
  where: string | null;
  // Le prix affiché, figé à la sélection ; null : « Prix à confirmer avec le propriétaire ».
  price: number | null;
  pricePerSqm: number | null;
  seenOnLabel: string | null;
  facts: { label: string; value: string }[];
  why: string[];
  gaps: string[];
  // La photo retenue pour le dossier, ou aucune (« Sans photo »).
  photoUrl: string | null;
  hasPhoto: boolean;
  photoHidden: boolean;
  // Une visite déjà demandée (coche posée avant, par le dossier ou la présentation).
  visitRequested: boolean;
};

export type DossierAgency = {
  name: string;
  logoUrl: string | null;
  postalAddress: string | null;
  professionalCard: string | null;
  professionalCardIssuer: string | null;
  financialGuarantee: string | null;
  advisorName: string | null;
  advisorPhone: string | null;
  advisorEmail: string | null;
  advisorPhotoUrl: string | null;
  advisorQr: QrCode | null;
};

export type BuyerDossier = {
  buyerId: string;
  selectionId: string;
  buyerName: string;
  selectedAt: string;
  // Le secteur : les communes de la fiche.
  sector: string;
  criteria: string[];
  items: DossierItem[];
  agency: DossierAgency;
  brandDeclarations: string;
};

export const DOSSIER_DISCLAIMER =
  'Les prix cités sont ceux des annonces. Surfaces et caractéristiques telles qu’annoncées, à vérifier.';
export const DOSSIER_VISIT_QUESTION = 'Quels biens souhaitez-vous visiter ?';
export const DOSSIER_NO_CHOICE = 'Cochez au moins un bien.';
