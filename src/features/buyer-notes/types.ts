import type { BuyerLanguage } from '@/features/buyer-messages/languages';
import type {
  BuyerPropertyType,
  BuyerPurpose,
  BuyerSoftCriterionKey,
  BuyerTimeline,
  EnergyRating,
} from '@/features/buyers/types';
import type { QUICK_STAR_CRITERIA } from '@/features/buyers/schemas/buyer-input';

// Mission 151 — la fiche proposée depuis les notes du conseiller. Elle vit dans l'écran jusqu'à
// « Créer la fiche » : rien n'en est gardé, sources comprises (principe 2 de la fiche).

// Ce que le conseiller a donné à lire : jamais son contenu, seulement sa sorte (pour la trace).
export const NOTE_SOURCE_KINDS = ['photo', 'file', 'text'] as const;
export type NoteSourceKind = (typeof NOTE_SOURCE_KINDS)[number];

export type NoteStar = (typeof QUICK_STAR_CRITERIA)[number];

// Les valeurs qu'une lecture peut proposer, avec les noms de la fiche (M117).
export type NoteValues = {
  name: string;
  phone: string;
  email: string;
  purpose: BuyerPurpose;
  timeline: BuyerTimeline;
  language: BuyerLanguage;
  propertyTypes: BuyerPropertyType[];
  cities: string[];
  budgetIdeal: number;
  budgetMax: number;
  roomsMin: number;
  bedroomsMin: number;
  surfaceMin: number;
  outdoor: boolean;
  parking: boolean;
  pool: boolean;
  floorMin: number;
  elevator: boolean;
  energyRatingMax: EnergyRating;
  worksAccepted: boolean;
  condominiumAccepted: boolean;
  notes: string;
};
export type NoteField = keyof NoteValues;

// La vérification d'une commune lue, contre la liste officielle (règle de Jean-Guy, 12/11).
export type CommuneCheck =
  | { read: string; status: 'official'; name: string }
  // Un seul nom officiel s'en approche : proposé sous ce nom, avec « lu : … ».
  | { read: string; status: 'corrected'; name: string }
  // Un nom d'usage (Juan-les-Pins, M86) : gardé tel que lu.
  | { read: string; status: 'usage'; name: string }
  // Aucune, ou plusieurs : le champ reste au conseiller, jamais deviné.
  | { read: string; status: 'unknown' | 'ambiguous'; name: null }
  // Le service des communes n'a pas répondu : la commune telle que lue, « non vérifiée ».
  | { read: string; status: 'unverified'; name: string };

export type NoteProposal = {
  // Seuls les champs remplis sont présents ; chacun « À vérifier ».
  values: Partial<NoteValues>;
  // La ligne des notes d'où vient chaque champ : montrée à la validation, jamais gardée.
  sources: Partial<Record<NoteField, string>>;
  mustHave: { key: NoteStar; source: string }[];
  // « Comptant, à vérifier » : une suggestion que le conseiller transforme ou non en « Validé ».
  financing: 'validated' | 'in_progress' | null;
  cashSuggestion: boolean;
  financingSource: string | null;
  softCriteria: { key: BuyerSoftCriterionKey; words: string; source: string | null }[];
  communes: CommuneCheck[];
  // Ce qui n'a pas été relevé : un nombre, jamais le contenu.
  personalMentionsSkipped: number;
};

// Pourquoi une lecture n'a rien proposé : des causes fixes, jamais un message du fournisseur.
export type NoteReadingCause =
  | 'closed'
  | 'unconfigured'
  | 'budget_reached'
  | 'budget_unavailable'
  | 'unsupported_file'
  | 'too_large'
  | 'empty'
  | 'unavailable'
  | 'refused'
  | 'unreadable';
