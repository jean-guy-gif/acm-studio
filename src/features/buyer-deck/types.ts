import type { BuyerCriterion } from '@/features/buyers/types';
import type { PresentedItemInput } from '@/features/buyer-presentation/types';

// Mission 122 — le dossier qui fait agir. Tout part de SA recherche : ses mots, la grille de ses
// critères bien par bien, un bien par écran décrit par ses critères, puis SA réponse. Un seul
// déroulé, construit par un service pur, que la présentation (partie A), le lien et le PDF
// (partie B) ne font qu'afficher.

// Sa réponse à un bien.
export const ITEM_ANSWERS = ['visit', 'maybe', 'no'] as const;
export type ItemAnswer = (typeof ITEM_ANSWERS)[number];
export const ITEM_ANSWER_LABELS: Record<ItemAnswer, string> = {
  visit: 'Je veux le visiter',
  maybe: 'Peut-être',
  no: 'Pas pour moi',
};
// Sur la grille, sous la lettre de chaque bien : la réponse déjà donnée.
export const GRID_ANSWER_LABELS: Record<ItemAnswer, string> = {
  visit: 'À visiter',
  maybe: 'Peut-être',
  no: 'Pas pour moi',
};
// Les mêmes, dits par le conseiller (fiche, Visites).
export const ITEM_ANSWER_REPORT: Record<ItemAnswer, string> = {
  visit: 'Veut le visiter',
  maybe: 'Peut-être',
  no: 'Pas pour lui',
};

// Pourquoi « Pas pour moi » : des puces, aucun texte libre.
export const NO_REASONS = [
  'district',
  'surface',
  'outdoor',
  'parking',
  'price',
  'works',
  'photos',
  'other',
] as const;
export type NoReason = (typeof NO_REASONS)[number];
export const NO_REASON_LABELS: Record<NoReason, string> = {
  district: 'Le quartier',
  surface: 'La surface',
  outdoor: 'L’extérieur',
  parking: 'Le parking',
  price: 'Le prix',
  works: 'Les travaux',
  photos: 'Les photos',
  other: 'Autre',
};

// Ses disponibilités, s'il veut visiter au moins un bien.
export const AVAILABILITY_SLOTS = [
  'sat_morning',
  'sat_afternoon',
  'sunday',
  'weekday_day',
  'weekday_evening',
] as const;
export type AvailabilitySlot = (typeof AVAILABILITY_SLOTS)[number];
export const AVAILABILITY_LABELS: Record<AvailabilitySlot, string> = {
  sat_morning: 'Samedi matin',
  sat_afternoon: 'Samedi après-midi',
  sunday: 'Dimanche',
  weekday_day: 'En semaine en journée',
  weekday_evening: 'En semaine en soirée',
};

export const ANSWERED_DURING = ['presentation', 'dossier'] as const;
export type AnsweredDuring = (typeof ANSWERED_DURING)[number];
export const ANSWERED_DURING_LABELS: Record<AnsweredDuring, string> = {
  presentation: 'pendant la présentation',
  dossier: 'depuis le lien',
};

export type ItemResponse = {
  id: string;
  itemId: string;
  answer: ItemAnswer;
  reasons: NoReason[];
  answeredDuring: AnsweredDuring;
  answeredAt: string;
};

// Une case de la grille : ✓ satisfait · ≈ proche (écart dans la marge, nommé) · ✗ non · ? à
// vérifier ensemble (non indiqué par l'annonce).
export type GridMark = 'ok' | 'near' | 'no' | 'check';
export const GRID_SYMBOLS: Record<GridMark, string> = {
  ok: '✓',
  near: '≈',
  no: '✗',
  check: '?',
};
export const GRID_LEGEND = '★ indispensable · ✓ oui · ≈ proche · ✗ non · ? à vérifier ensemble';

// Une ligne de la grille : un critère de la fiche, indispensable ou préférence.
export type DeckCriterion = {
  criterion: BuyerCriterion;
  label: string;
  mustHave: boolean;
};

// Un critère vu sur un bien : sa marque et son fait (« ✓ 2 chambres, comme demandé »).
export type DeckMark = {
  criterion: BuyerCriterion;
  mark: GridMark;
  text: string;
};

// Les faits d'un bien que le déroulé lit : la liste d'autorisation de la présentation (M119), plus
// ce qu'il faut pour juger chaque critère et dater un fait.
export type DeckItemInput = PresentedItemInput & {
  // La phrase « Pourquoi je vous le propose » modifiée par le conseiller ; null = proposée.
  pitch: string | null;
};

export type DeckItem = {
  letter: string;
  item: PresentedItemInput;
  photos: string[];
  marks: DeckMark[];
  okCount: number;
  total: number;
  // « Prix affiché : 415 000 € · affiché le 24/10/2026 », en petit sous le budget ; null sans prix.
  priceLine: string | null;
  pricePerSqm: number | null;
  pitch: string | null;
  pitchProposed: string | null;
  // « En vente depuis 9 jours · Baisse de prix de 10 000 € il y a 8 jours » ; null sans fait daté.
  datedFact: string | null;
  // Un indispensable que le bien ne satisfait pas (cas restant, décision du 25/10) : signalé au
  // conseiller avant de présenter, jamais recommandé par la phrase de tête.
  blocked: boolean;
  // Le fait de chaque indispensable ✗, et lui seul : ce que l'écran conseiller signale.
  blockedBy: string[];
};

export type BuyerDeck = {
  buyerId: string;
  buyerName: string;
  selectionId: string;
  selectedAt: string;
  presentedAt: string | null;
  // « Vous m'avez dit : … » ; la phrase du conseiller, sinon celle proposée.
  words: string;
  wordsProposed: string;
  criteria: DeckCriterion[];
  items: DeckItem[];
  // « Le bien A coche tous vos critères : … » ; null si aucun bien ne peut être recommandé.
  lead: string | null;
  // La lettre du bien de tête, donnée par le service (jamais relue dans la phrase).
  leadLetter: string | null;
  // Les créneaux donnés en rendez-vous, rangés dans le déroulé figé à « Terminer » (décision de
  // Jean-Guy, 25/10) ; vide avant, et pour une présentation terminée sans eux.
  meetingAvailability: AvailabilitySlot[];
};

export const PITCH_MAX = 140;
export const WORDS_MAX = 300;
