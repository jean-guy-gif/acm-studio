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
  // Sa réponse déjà envoyée depuis le lien : une seule par sélection. `answered` la sait même quand
  // les biens répondus ont été retirés depuis ; `answers` et `availability` (les créneaux donnés
  // SUR LE LIEN, et eux seuls) la redisent, sur les biens encore dans la sélection.
  answered: boolean;
  answers: ItemResponse[];
  availability: AvailabilitySlot[];
  // La présentation terminée : le lien devient « Ce que nous avons vu ensemble », ses réponses du
  // rendez-vous et ses créneaux, en lecture seule (décision de Jean-Guy, 25/10).
  meetingAnswers: ItemResponse[];
  meetingAvailability: AvailabilitySlot[];
  agency: DossierAgency;
  brandDeclarations: string;
  // Mission 147 (partie A) — le lien client « Vivre ici » d'Academia, collé sur le mandat, pour
  // chaque bien de l'agence de sa sélection qui en a un (décision de Jean-Guy, 09/11).
  academiaLinks?: DossierAcademiaLink[];
};

export type DossierAcademiaLink = {
  itemId: string;
  url: string;
};

export const DOSSIER_DISCLAIMER =
  'Les prix cités sont ceux des annonces. Surfaces et caractéristiques telles qu’annoncées, à vérifier.';
export const DOSSIER_CHOICES_TITLE = 'Mes choix';
export const DOSSIER_THANKS = 'Merci, j’ai bien reçu votre réponse';
export const DOSSIER_NO_ANSWER = 'Répondez au moins pour un bien.';
export const DOSSIER_SEND = 'Envoyer ma réponse';
export const DOSSIER_SEEN_TOGETHER = 'Ce que nous avons vu ensemble';
export const DOSSIER_DOWNLOAD = 'Télécharger en PDF';
// Un envoi refusé parce que la présentation est terminée : rien ne dit qu'il a répondu sur le lien.
export const DOSSIER_PRESENTED =
  'Nous avons regardé cette sélection ensemble\u00a0: ce lien ne prend plus de réponse.';
export const DOSSIER_ALREADY_ANSWERED =
  'Merci, j’ai bien reçu votre réponse\u00a0: elle ne se renvoie pas.';
