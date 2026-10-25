import type { AvailabilitySlot, BuyerDeck, ItemResponse } from '@/features/buyer-deck/types';
import type { QrCode } from '@/features/contact-card/services/qr-code';

// Mission 119 (partie B) — le dossier acquéreur, à imprimer ou à envoyer par un lien. Mission 122
// (partie B) — il suit le déroulé du dossier qui fait agir (M122 A) : ses mots, la grille, un bien
// par page ou par écran, sa réponse. Une seule source : le déroulé de la sélection retenue, figé à
// « Terminer » s'il l'a été ; rien n'y entre que la liste d'autorisation de la présentation permette.

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

// « Sans photo », par bien, sur l'écran conseiller du dossier (M119 B).
export type DossierPhotoChoice = {
  itemId: string;
  letter: string;
  label: string;
  hasPhoto: boolean;
  photoHidden: boolean;
};

export type BuyerDossier = {
  buyerId: string;
  selectionId: string;
  selectedAt: string;
  // Le secteur : les communes de la fiche, pour le pied de page imprimé.
  sector: string;
  // Le déroulé tel que l'acquéreur le voit : sans ce qui est réservé au conseiller (phrases
  // proposées, signalement) et sans les photos retirées (« Sans photo »).
  deck: BuyerDeck;
  photoChoices: DossierPhotoChoice[];
  // Sa réponse déjà envoyée depuis le lien, et ses créneaux : une seule réponse.
  answers: ItemResponse[];
  availability: AvailabilitySlot[];
  agency: DossierAgency;
  brandDeclarations: string;
};

export const DOSSIER_DISCLAIMER =
  'Les prix cités sont ceux des annonces. Surfaces et caractéristiques telles qu’annoncées, à vérifier.';
export const DOSSIER_CHOICES_TITLE = 'Mes choix';
export const DOSSIER_THANKS = 'Merci, j’ai bien reçu votre réponse';
export const DOSSIER_NO_ANSWER = 'Répondez au moins pour un bien.';
export const DOSSIER_SEND = 'Envoyer ma réponse';
export const DOSSIER_ALREADY_ANSWERED =
  'Merci, j’ai bien reçu votre réponse : elle ne se renvoie pas.';
