import type { BuyerLanguage } from '@/features/buyer-messages/languages';
import type { Database } from '@/lib/supabase/database.types';

// Mission 117 — la fiche acquéreur. Un acquéreur n'appartient à aucun dossier vendeur : il vit par
// lui-même, dans son agence, que toute l'agence partage (décision de Jean-Guy, 24/10). La fiche
// note ce que le conseiller entend en découverte : qui il est, ce qu'il cherche, ses lignes rouges.

export type BuyerRow = Database['public']['Tables']['buyers']['Row'];

// Mission 138 — « Sous offre » : posé par la base quand le vendeur accepte une offre de l'acquéreur ;
// il ne compte plus comme prêt à visiter, et y revient quand le conseiller remet son statut.
export const BUYER_STATUSES = [
  'searching',
  'visiting',
  'under_offer',
  'bought',
  'abandoned',
] as const;
export type BuyerStatus = (typeof BUYER_STATUSES)[number];
export const BUYER_STATUS_LABELS: Record<BuyerStatus, string> = {
  searching: 'En recherche',
  visiting: 'En visite',
  under_offer: 'Sous offre',
  bought: 'A acheté',
  abandoned: 'Abandonné',
};

// Mission 132 — le financement de l'acquéreur, posé par le conseiller (trois boutons sur la fiche) :
// « validé » = accord de principe ou apport suffisant.
export const BUYER_FINANCINGS = ['validated', 'in_progress', 'unknown'] as const;
export type BuyerFinancing = (typeof BUYER_FINANCINGS)[number];
export const BUYER_FINANCING_LABELS: Record<BuyerFinancing, string> = {
  validated: 'Validé',
  in_progress: 'En cours',
  unknown: 'Inconnu',
};
export const BUYER_FINANCING_HINT = 'Validé\u00a0: accord de principe ou apport suffisant.';

// Lot B (Jean-Guy, 27/11) — comment l'acquéreur finance son achat, à côté de l'état du financement
// (M132), qui ne change pas : comptant, avec prêt, ou pas encore dit, le défaut des fiches d'avant.
// Avec un prêt seulement : l'apport, le montant du prêt et l'accord de principe de sa banque, tous
// facultatifs. Écrit par un geste à part, jamais par le formulaire de la fiche ; jamais montré au
// vendeur.
export const BUYER_FINANCING_MODES = ['cash', 'loan', 'not_said'] as const;
export type BuyerFinancingMode = (typeof BUYER_FINANCING_MODES)[number];
export const BUYER_FINANCING_MODE_LABELS: Record<BuyerFinancingMode, string> = {
  cash: 'Comptant',
  loan: 'Avec prêt',
  not_said: 'Pas encore dit',
};
// Les bornes de la base (`buyers_loan_contribution_check`, `buyers_loan_amount_check`).
export const LOAN_AMOUNT_MAX = 99_999_999;

export const BUYER_PURPOSES = ['primary', 'secondary', 'investment', 'other'] as const;
export type BuyerPurpose = (typeof BUYER_PURPOSES)[number];
export const BUYER_PURPOSE_LABELS: Record<BuyerPurpose, string> = {
  primary: 'Résidence principale',
  secondary: 'Résidence secondaire',
  investment: 'Investissement',
  other: 'Autre',
};

export const BUYER_TIMELINES = ['now', 'three_months', 'six_months', 'later'] as const;
export type BuyerTimeline = (typeof BUYER_TIMELINES)[number];
export const BUYER_TIMELINE_LABELS: Record<BuyerTimeline, string> = {
  now: 'Dès maintenant',
  three_months: 'Dans 3 mois',
  six_months: 'Dans 6 mois',
  later: 'Plus tard',
};

// Pour commencer, un acquéreur cherche un appartement ou une maison (M54 : les deux ne se
// comparent pas).
export const BUYER_PROPERTY_TYPES = ['apartment', 'house'] as const;
export type BuyerPropertyType = (typeof BUYER_PROPERTY_TYPES)[number];

// Les critères de « ce qu'il cherche » : chacun est une PRÉFÉRENCE, sauf si le conseiller le
// coche INDISPENSABLE (`mustHave`).
export const BUYER_CRITERIA = [
  'property_types',
  'cities',
  'budget',
  'rooms',
  'bedrooms',
  'surface',
  'outdoor',
  'parking',
  'pool',
  'floor',
  'elevator',
  'energy_rating',
  'works',
] as const;
export type BuyerCriterion = (typeof BUYER_CRITERIA)[number];
export const BUYER_CRITERION_LABELS: Record<BuyerCriterion, string> = {
  property_types: 'Type de bien',
  cities: 'Communes',
  budget: 'Budget',
  rooms: 'Pièces',
  bedrooms: 'Chambres',
  surface: 'Surface',
  outdoor: 'Extérieur',
  parking: 'Parking',
  pool: 'Piscine',
  floor: 'Étage',
  elevator: 'Ascenseur',
  energy_rating: 'DPE',
  works: 'Travaux',
};

// Mission 151 — « Ce qui compte pour eux », la liste fermée de Jean-Guy (10/11). Chacun garde leurs
// mots, tels qu'écrits ; ils rangent les biens trouvés et disent pourquoi, ils n'en écartent aucun.
export const BUYER_SOFT_CRITERIA = [
  'calme',
  'sans_vis_a_vis',
  'cachet',
  'lumineux',
  'vue',
  'plain_pied',
  'traversant',
  'commerces_ecoles_a_pied',
  'jardin_sans_entretien',
  'pret_a_vivre',
] as const;
export type BuyerSoftCriterionKey = (typeof BUYER_SOFT_CRITERIA)[number];
export const BUYER_SOFT_CRITERION_LABELS: Record<BuyerSoftCriterionKey, string> = {
  calme: 'Au calme',
  sans_vis_a_vis: 'Sans vis-à-vis',
  cachet: 'Du cachet, de caractère',
  lumineux: 'Lumineux',
  vue: 'Une vue',
  plain_pied: 'De plain-pied',
  traversant: 'Traversant',
  commerces_ecoles_a_pied: 'Commerces et écoles à pied',
  jardin_sans_entretien: 'Un jardin sans gros entretien',
  pret_a_vivre: 'Prêt à vivre, sans travaux',
};
export const BUYER_SOFT_WORDS_MAX = 80;
export type BuyerSoftCriterion = { key: BuyerSoftCriterionKey; words: string };

export const ENERGY_RATINGS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const;
export type EnergyRating = (typeof ENERGY_RATINGS)[number];

// Ce que le conseiller saisit : tout facultatif, sauf le nom et au moins une commune.
export type BuyerInput = {
  name: string;
  phone: string | null;
  email: string | null;
  // Mission 139 — la langue de ses messages ; absente : celle de la fiche ne change pas.
  language?: BuyerLanguage;
  purpose: BuyerPurpose | null;
  timeline: BuyerTimeline | null;
  notes: string | null;
  propertyTypes: BuyerPropertyType[];
  // Les communes telles que tapées, dédoublonnées par leur clé (M71, M86, M99).
  cities: string[];
  budgetIdeal: number | null;
  budgetMax: number | null;
  roomsMin: number | null;
  bedroomsMin: number | null;
  surfaceMin: number | null;
  outdoor: boolean | null;
  parking: boolean | null;
  pool: boolean | null;
  floorMin: number | null;
  elevator: boolean | null;
  // « DPE minimum » : la plus mauvaise lettre acceptée.
  energyRatingMax: EnergyRating | null;
  worksAccepted: boolean | null;
  mustHave: BuyerCriterion[];
  dealBreakers: string | null;
  // Mission 151 — la copropriété acceptée et son ★ (à part de `mustHave`, que la migration en
  // ajouts seulement ne touche pas) ; absents : la fiche ne change pas.
  condominiumAccepted?: boolean | null;
  condominiumMustHave?: boolean;
  // Mission 151 — « Ce qui compte pour eux » ; absent : la fiche ne change pas.
  softCriteria?: BuyerSoftCriterion[];
};

export type Buyer = BuyerInput & {
  // Mission 139 — lue en base : toujours une langue (le français par défaut).
  language: BuyerLanguage;
  id: string;
  agencyId: string;
  advisorId: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  status: BuyerStatus;
  statusChangedAt: string;
  demo: boolean;
  // Mission 122 — les suggestions ignorées par le conseiller, par raison : elles ne reviennent plus.
  ignoredSuggestions: string[];
  // Mission 132 — son financement, et le dernier contact déclaré (« J'ai eu l'acquéreur
  // aujourd'hui »), à l'heure du serveur. Jamais écrits par le formulaire de la fiche.
  financing: BuyerFinancing;
  financingChangedAt: string | null;
  contactedAt: string | null;
  // Lot B — comment il finance ; l'apport, le prêt et l'accord, seulement avec un prêt.
  financingMode: BuyerFinancingMode;
  loanContribution: number | null;
  loanAmount: number | null;
  loanAgreement: boolean | null;
  // Mission 151 — lus en base : toujours une valeur.
  condominiumAccepted: boolean | null;
  condominiumMustHave: boolean;
  softCriteria: BuyerSoftCriterion[];
  // Les champs proposés par une lecture de notes, « À vérifier » jusqu'au geste du conseiller (M97).
  fieldsToVerify: string[];
};
