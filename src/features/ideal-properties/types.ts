import type { Database } from '@/lib/supabase/database.types';

// Mission 118 (partie B) — « Trouver les biens idéaux » : ce que l'agence a déjà (M86), puis le
// marché (Stream Estate, M99/M110), en trois catégories décidées par les indispensables de la
// fiche (M117) ; le conseiller retient jusqu'à trois biens.

export const IDEAL_CATEGORIES = ['strong', 'compromise', 'explore'] as const;
export type IdealCategory = (typeof IDEAL_CATEGORIES)[number];
export const IDEAL_CATEGORY_LABELS: Record<IdealCategory, string> = {
  strong: 'Correspondance forte',
  compromise: 'Bon compromis',
  explore: 'À explorer',
};
export const IDEAL_CATEGORY_HINTS: Record<IdealCategory, string> = {
  strong: 'Tous les indispensables, et les préférences aussi.',
  compromise: 'Tous les indispensables ; une ou plusieurs préférences non.',
  explore: 'Un indispensable que l’annonce n’indique pas : à vérifier.',
};

// La source d'un bien retenu : un dossier vendeur de l'agence, un concurrent à prospecter, une
// annonce du marché.
export const SELECTION_SOURCES = ['project', 'competitor', 'listing'] as const;
export type SelectionSource = (typeof SELECTION_SOURCES)[number];
export const SELECTION_SOURCE_LABELS: Record<SelectionSource, string> = {
  project: 'Dossier vendeur de l’agence',
  competitor: 'Concurrent à prospecter',
  listing: 'Annonce du marché',
};

// La catégorie d'un bien retenu : l'une des trois, ou « agency » pour un bien de l'agence (M86).
export type SelectionCategory = IdealCategory | 'agency';
export const SELECTION_CATEGORY_LABELS: Record<SelectionCategory, string> = {
  ...IDEAL_CATEGORY_LABELS,
  agency: 'Dans l’agence',
};

export const MAX_IDEAL_SELECTION = 3;

export type SelectionItemRow = Database['public']['Tables']['buyer_selection_items']['Row'];
export type SelectionRow = Database['public']['Tables']['buyer_selections']['Row'];

export type IdealSelectionItem = {
  id: string;
  position: number;
  source: SelectionSource;
  reference: string;
  label: string;
  listedPrice: number | null;
  priceSeenOn: string | null;
  category: SelectionCategory | null;
  gaps: string[];
  // Pour une annonce : les photos et ce que la recherche puis l'import en ont dit.
  photoUrl: string | null;
  imported: boolean;
};

export type IdealSelection = {
  id: string;
  createdAt: string;
  items: IdealSelectionItem[];
};
