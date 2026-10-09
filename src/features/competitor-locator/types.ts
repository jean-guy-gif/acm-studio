// Mission 75 — l'adresse d'un concurrent, telle que le Localisateur Academia la rend.
//
// ACM ne calcule rien ici : pas de seuil, pas de chiffre de certitude. Il décide sur `labelKey`
// et `confirmed`, jamais en lisant `label`, qui est un texte à afficher tel quel.

export const LOCATOR_STATES = ['inconnu', 'en-cours', 'fiche', 'pret'] as const;
export type LocatorState = (typeof LOCATOR_STATES)[number];

export const LOCATOR_LABEL_KEYS = ['confirmee', 'pistes', 'copro', 'rien', 'vous'] as const;
export type LocatorLabelKey = (typeof LOCATOR_LABEL_KEYS)[number];

export const LOCATOR_SOURCES = [
  'vous',
  'dpe',
  'copropriete',
  'residence',
  'terrain',
  'meme-bien',
  'cercle',
] as const;
export type LocatorSource = (typeof LOCATOR_SOURCES)[number];

// Ce qu'ACM garde d'une réponse du Localisateur pour un concurrent.
export type CompetitorLocation = {
  state: LocatorState;
  label: string | null;
  labelKey: LocatorLabelKey | null;
  address: string | null;
  source: LocatorSource | null;
  confirmed: boolean;
  propertyId: string | null;
  latitude: number | null;
  longitude: number | null;
  analyzedAt: string | null;
};

// `unavailable` : absent, sans réponse, ou bêta terminée — une seule ligne discrète.
// `sharing_off` : installé, mais « Partager avec ACM Studio » est éteint.
export type LocatorAvailability = 'ready' | 'sharing_off' | 'unavailable';

export const LOCATOR_UNAVAILABLE_MESSAGE =
  'Installez le Localisateur Academia pour retrouver les adresses des concurrents';
export const LOCATOR_SHARING_OFF_MESSAGE =
  'Activez « Partager avec ACM Studio » dans le Localisateur';

// Un concurrent retenu dont l'adresse reste à demander au Localisateur.
export type CompetitorToLocate = { id: string; listingUrl: string };

// Une réponse brute du Localisateur pour une annonce : revalidée côté serveur avant écriture.
export type RawLocatorEntry = { listingUrl: string; raw: unknown };
