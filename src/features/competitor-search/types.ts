// Mission 27 — Recherche de concurrents sur les portails.
// Suggestions éphémères : rien n'est persisté tant que le conseiller n'a pas
// importé puis enregistré un bien via la création existante.

export const SEARCH_PORTALS = [
  'green_acres',
  'seloger',
  'bienici',
  'figaro',
  'maisons_appartements',
] as const;
export type SearchPortal = (typeof SEARCH_PORTALS)[number];

export const SEARCH_PORTAL_LABELS: Record<SearchPortal, string> = {
  green_acres: 'Green Acres',
  seloger: 'SeLoger',
  bienici: 'Bien’ici',
  figaro: 'Figaro Immobilier',
  maisons_appartements: 'Maisons et Appartements',
};

// Critères dérivés du bien vendeur, côté serveur uniquement.
export type CompetitorSearchCriteria = {
  city: string;
  postalCode: string | null;
  propertyType: string | null; // vocabulaire subject_properties (apartment/house/…)
};

// Une annonce candidate détectée sur une page de résultats. Champs best-effort :
// tout champ non détecté reste null — l'import de la fiche fera foi.
export type CompetitorCandidate = {
  url: string;
  title: string | null;
  price: number | null;
  surfaceArea: number | null;
  roomsCount: number | null;
  photoUrl: string | null;
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

export type CompetitorSearchResult =
  | { ok: true; criteria: CompetitorSearchCriteria; portals: PortalSearchResult[] }
  | { ok: false; error: string };

export type SearchResultsHtmlImport =
  { ok: true; portal: PortalSearchResult } | { ok: false; error: string };
