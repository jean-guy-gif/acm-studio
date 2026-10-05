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

// Essai Stream Estate — une SOURCE de candidats qui n'est pas un portail lu par l'extension :
// ses biens passent par le même classement (rankCandidates) que ceux des quatre portails.
export const STREAM_ESTATE_SOURCE = 'stream_estate';
export const STREAM_ESTATE_LABEL = 'Stream Estate (essai)';
export type CandidateSource = SearchPortal | typeof STREAM_ESTATE_SOURCE;

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
  // Mission 70 — terrain du bien vendeur : critère secondaire d'ORDRE, jamais un filtre.
  landArea?: number | null;
  // Étape 2 Stream Estate — ce que la fiche du bien vendeur dit, pour l'ORDRE (jamais un filtre).
  subject?: SubjectProximityFacts;
};

// Les champs STRUCTURÉS de la fiche du bien vendeur qui ordonnent les candidats. null = non
// renseigné : le critère est alors neutre pour tous les candidats.
export type SubjectProximityFacts = {
  parkingTypes: string[]; // vocabulaire subject_properties (garage, closed_box…, none)
  outdoorSpaces: string[]; // balcony, terrace, garden… none
  generalCondition: string | null;
  floor: number | null;
  hasElevator: boolean | null;
  hasPool: boolean | null;
  exposure: string | null;
  constructionYear: number | null;
};

export type GeoPoint = { lat: number; lon: number };

// Ce que la carte (ou l'API) dit EN CHAMPS STRUCTURÉS, au-delà du prix et de la surface. Tout
// champ absent reste null : inconnu, donc neutre. Rien n'est tiré d'une description.
export type CandidateFeatures = {
  // Position du bien (Stream Estate). null si absente OU écartée comme remplissage.
  location: GeoPoint | null;
  // La position existait mais a été écartée (valeur de remplissage, répétée ou trop grossière).
  locationDiscarded: boolean;
  // Quartier écrit sur la carte (SeLoger « Le Port, Nice », Bien'ici « Nice (Lanterne) »).
  district: string | null;
  floor: number | null; // 0 = rez-de-chaussée
  hasElevator: boolean | null;
  hasPool: boolean | null;
  // Familles de stationnement nommées : 'garage' | 'box' | 'place'. null = rien d'écrit.
  parking: string[] | null;
  // Extérieurs nommés (balcony, terrace, garden, loggia, veranda) et ceux dits absents
  // (« Pas de balcon »). null = rien d'écrit.
  outdoor: { present: string[]; absent: string[] } | null;
  condition: string | null; // vocabulaire general_condition
  exposure: string | null; // vocabulaire exposure
  constructionYear: number | null;
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
  // Type du bien (vocabulaire subject_properties : apartment/house/land/…), lu sur la
  // carte. Le type n'est JAMAIS relâché (§5 point 8) : un type différent du bien
  // vendeur n'entre pas dans la liste. null quand la carte ne le dit pas.
  propertyType: string | null;
  // Prix au m² tel que le portail l'affiche, jamais recalculé par nous.
  pricePerSqm: number | null;
  // Mission 70 — surface du terrain écrite sur la carte (SeLoger, Green Acres). Sert seulement à
  // ORDONNER (critère secondaire), jamais à filtrer. null quand la carte ne l'écrit pas.
  landArea: number | null;
  // Commune lue sur la carte : sert à repérer une commune voisine (la carte le DIT,
  // on ne masque pas — §6) et à dédupliquer (prix+surface+pièces+commune).
  city: string | null;
  // TOUTES les photos portées par la carte (filtrées : hors logos, habillage, ≤160 px),
  // dans l'ordre — pour défiler sur place. Vide si la carte n'en porte aucune.
  photoUrls: string[];
  // Programme neuf reconnu à la STRUCTURE (titre « neuf », segment /programme/,
  // fourchette de prix, domaine selogerneuf.com). Écarté du classement, journalisé.
  isNewBuild: boolean;
  // Essai Stream Estate — présent seulement pour un bien venu de l'API.
  streamEstate?: StreamEstateFacts;
  // Étape 2 — champs structurés qui ORDONNENT (secteur, étage, équipements). Absent = tout inconnu.
  features?: CandidateFeatures;
};

// Ce que l'API Stream Estate dit d'un bien, en plus de la carte : d'où vient l'annonce
// retenue comme ORIGINE (celle que l'import relira), depuis quand le bien est en ligne,
// et ses baisses de prix. Rien n'est recalculé : ce sont les valeurs de l'API.
export type StreamEstateFacts = {
  propertyId: string; // identifiant du bien chez Stream Estate (base de déduplication)
  originSite: string; // site de l'annonce d'origine (« SeLoger », « leboncoin.fr »…)
  onlineSince: string | null; // createdAt du bien (ISO)
  lastSeenAt: string | null; // dernier passage du robot Stream Estate (ISO)
  priceDrops: number[]; // percentVariation des baisses de prix, dans l'ordre (ex. -4.5)
  // L'annonce d'origine est sur un site que l'extension sait relire (import possible).
  importable: boolean;
};

// Résultat de la lecture d'une page de résultats : les cartes retenues, plus le
// compte de ce qui a été écarté, pour le dire au conseiller sans rien cacher.
export type SearchExtraction = {
  candidates: CompetitorCandidate[];
  excludedNewBuild: number;
  excludedDuplicates: number;
};

// MISSION 50 §10 — trois issues d'échec distinctes, parce que l'écran n'en fait pas
// la même chose : `refused` (robots.txt interdit ce chemin — permanent, coller,
// jamais « réessayer »), `unreachable` (pas de réponse / délai / réseau — passager,
// on peut relancer), `empty` (page reçue mais coquille ou zéro carte).
export type PortalSearchStatus = 'ok' | 'refused' | 'unreachable' | 'empty';

// Générique sur la source : les lecteurs de portails produisent un `PortalSearchResult<SearchPortal>`,
// le classement accepte aussi la source Stream Estate (par défaut, toutes les sources).
export type PortalSearchResult<Source extends CandidateSource = CandidateSource> = {
  portal: Source;
  label: string;
  searchUrl: string;
  status: PortalSearchStatus;
  // Message utilisateur contrôlé (jamais de détail technique interne).
  message: string | null;
  candidates: CompetitorCandidate[];
};

// Une annonce candidate ADMISE, classée par ressemblance avec le bien du vendeur.
// Mission 61 : commune, prix, pièces et surface FILTRENT — une annonce hors d'un seul de ces
// critères n'entre pas dans la liste (elle ne « descend » plus). Le score n'ordonne que
// l'admissible ; les écartées faute de donnée sont comptées (ExcludedForMissing).
export type RankedCandidate = {
  candidate: CompetitorCandidate;
  portal: CandidateSource;
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
  // Mission 61 — ce candidat n'est admissible que grâce à un cran de desserrage : sa carte le
  // DIT (desserrage visible, correction de la M50 §3). false si admissible aux bornes serrées.
  loosenedSurface: boolean;
  loosenedRooms: boolean;
  // Étape 2 — l'ordre « les plus proches » et sa justification, critère par critère.
  proximity: ProximityAssessment;
};

// Un critère d'ordre, tel qu'il s'affiche sur la carte : « à 350 m », « terrasse ≠ balcon »,
// « état non indiqué ». `points` > 0 rapproche, < 0 éloigne, 0 = neutre (dont l'inconnu).
export type ProximityReason = {
  criterion: string;
  level: 1 | 2;
  label: string;
  points: number;
  known: boolean;
};

export type ProximityAssessment = {
  level1: number;
  level2: number;
  reasons: ProximityReason[];
};

// Le secteur (distance) n'est utilisé que si l'adresse du bien vendeur est géocodée précisément.
// Sinon il est neutre pour tous, et l'écran dit pourquoi.
export type SectorStatus =
  | { status: 'located'; label: string }
  | {
      status: 'neutral';
      reason: 'no_address' | 'imprecise' | 'low_score' | 'other_city' | 'unavailable';
    };

// Mission 61 §2 — l'état du desserrage appliqué, pour que l'écran dise ce qu'il a élargi et
// pourquoi. Le prix et la commune ne bougent JAMAIS ; seules surface puis pièces se desserrent.
export type Loosening = {
  surfaceTolerancePct: number; // 5 | 7.5 | 10
  roomsTolerance: number; // 0 (exact) | 1
  surfaceLoosened: boolean; // au-delà de ±5 %
  // Mission 68 — non-null quand le plancher (±3 m²) l'emporte sur le pourcentage au cran retenu :
  // c'est alors LUI la tolérance réellement appliquée, et l'écran dit « ±3 m² », pas un
  // pourcentage. null dès que le pourcentage vaut au moins le plancher (80 m² : toujours null).
  surfaceFloorSqm: number | null;
  roomsLoosened: boolean; // ±1 pièce
};

// Mission 61 §3 — fail-closed, mais DIT : les candidats écartés faute d'une donnée qui EST le
// critère, comptés par donnée manquante (« 4 annonces écartées faute de surface indiquée »). La
// commune n'y figure PAS : une carte sans ville est dans le périmètre (l'URL interrogée porte la
// commune, pas la vignette) — une donnée absente mais portée par la provenance n'écarte pas.
export type ExcludedForMissing = {
  surface: number;
  rooms: number;
  price: number;
};

// Le résultat du classement : les admissibles classés, l'état du desserrage, les écartés pour
// donnée absente, et si on reste sous le minimum même après le dernier cran.
export type RankedSearch = {
  ranked: RankedCandidate[];
  loosening: Loosening;
  excludedForMissing: ExcludedForMissing;
  belowMinimum: boolean; // < MINIMUM admissibles même après le dernier cran
  target: number; // cible de candidats (6)
  minimum: number; // plancher en dessous duquel l'écran le dit (3)
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
