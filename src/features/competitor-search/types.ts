// Mission 27 — Recherche de concurrents sur les portails.
// Suggestions éphémères : rien n'est persisté tant que le conseiller n'a pas
// importé puis enregistré un bien via la création existante.

// Figaro a été retiré (septembre 2026) : il n'est plus proposé au conseiller.
// Portails réellement supportés par la recherche.
export const SEARCH_PORTALS = [
  'green_acres',
  'seloger',
  'bienici',
  'maisons_appartements',
] as const;
export type SearchPortal = (typeof SEARCH_PORTALS)[number];

export const SEARCH_PORTAL_LABELS: Record<SearchPortal, string> = {
  green_acres: 'Green Acres',
  seloger: 'SeLoger',
  bienici: 'Bien’ici',
  maisons_appartements: 'Maisons et Appartements',
};

// Critères dérivés du bien vendeur, côté serveur uniquement.
//
// MISSION 36 : la recherche ne se contente plus de la commune. Elle compare
// aussi surface, pièces, quartier et la fourchette de prix donnée par le
// conseiller — c'est ce qui permet de CLASSER les annonces par ressemblance.
export type CompetitorSearchCriteria = {
  city: string;
  postalCode: string | null;
  propertyType: string | null; // vocabulaire subject_properties (apartment/house/…)
  district: string | null;
  surfaceArea: number | null;
  roomsCount: number | null;
  advisorPriceMin: number | null;
  advisorPriceMax: number | null;
};

// Une annonce candidate détectée sur une page de résultats. Champs best-effort :
// tout champ non détecté reste null — l'import de la fiche fera foi.
//
// MISSION 50 : la carte porte assez pour classer, aucune fiche n'est ouverte. La
// `key` est l'identifiant publié PAR LE PORTAIL (jamais une référence d'agence,
// mission 47 §3) ; elle sert d'identité stable et de base de déduplication. Le neuf
// est écarté (§6) mais on garde le drapeau pour le journaliser sans mentir.
export type CompetitorCandidate = {
  // Identifiant publié par le portail : id SeLoger, data-id Bien'ici,
  // data-advertid Green Acres, id M&A. null seulement si la carte n'en porte pas.
  key: string | null;
  url: string;
  title: string | null;
  price: number | null;
  surfaceArea: number | null;
  roomsCount: number | null;
  // Prix au m² tel que le portail l'affiche, jamais recalculé par nous.
  pricePerSqm: number | null;
  // Commune lue sur la carte : sert à repérer une commune voisine (la carte le DIT,
  // on ne masque pas — §6) et à dédupliquer (prix+surface+pièces+commune).
  city: string | null;
  photoUrl: string | null;
  // Programme neuf reconnu à la STRUCTURE (titre « neuf », segment /programme/,
  // fourchette de prix, domaine selogerneuf.com). Écarté du classement, journalisé.
  isNewBuild: boolean;
};

// Résultat de la lecture d'une page de résultats : les cartes retenues, plus le
// compte de ce qui a été écarté, pour le dire au conseiller sans rien cacher.
export type SearchExtraction = {
  candidates: CompetitorCandidate[];
  excludedNewBuild: number;
  excludedDuplicates: number;
};

export type PortalSearchStatus = 'ok' | 'blocked' | 'empty';

export type PortalSearchResult = {
  portal: SearchPortal;
  label: string;
  searchUrl: string;
  status: PortalSearchStatus;
  // Message utilisateur contrôlé (jamais de détail technique interne).
  message: string | null;
  candidates: CompetitorCandidate[];
};

// Une annonce candidate, classée par ressemblance avec le bien du vendeur.
// Rien n'est masqué : une annonce éloignée descend, elle ne disparaît pas.
export type RankedCandidate = {
  candidate: CompetitorCandidate;
  portal: SearchPortal;
  portalLabel: string;
  host: string;
  // 0 à 100, calculé sur les seuls critères comparables.
  score: number;
  // Ce qui rapproche cette annonce du bien du vendeur, puis ce qui l'en éloigne.
  strengths: string[];
  weaknesses: string[];
  // Ce que l'outil a appris des décisions passées et qui a fait bouger le score.
  learnedPenalties: string[];
  // Le conseiller a déjà tranché sur cette annonce : on le dit au lieu de la
  // reproposer comme neuve.
  alreadyJudged: 'accepted' | 'rejected' | null;
};

export type CompetitorSearchResult =
  | {
      ok: true;
      criteria: CompetitorSearchCriteria;
      portals: PortalSearchResult[];
      ranked: RankedCandidate[];
      // Phrases lisibles décrivant ce que l'outil a retenu des décisions
      // passées. Le conseiller doit pouvoir les contester.
      learnedNotes: string[];
    }
  | { ok: false; error: string };

// Décision du conseiller sur une annonce proposée.
export type RecordDecisionResult = { ok: true } | { ok: false; error: string };

export type SearchResultsHtmlImport =
  { ok: true; portal: PortalSearchResult } | { ok: false; error: string };
