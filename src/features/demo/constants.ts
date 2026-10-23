// Mission 114 — la démonstration des closers : une agence marquée `is_demo` (par un opérateur,
// M100), où tout ce qui vient de l'extérieur est simulé et tout le reste est le vrai outil.
// Rien ne dit « démonstration » à l'écran ni à l'impression (décision de Jean-Guy, 23/10) : le
// repère ne se voit qu'en bas de `/erreurs`, côté opérateur.

// Chaque réponse simulée arrive après un court délai fixe, pour que l'écran montre ses états
// réels (« Import en cours… 2 sur 5 »). Rien ne dépend du réseau, rien ne peut échouer.
export const DEMO_DELAY_MS = 1500;

// Les annonces de démonstration vivent sur un hôte RÉSERVÉ (RFC 2606, `.invalid`) : il ne se
// résout jamais, aucun portail réel n'est désigné, et un lien ouvert ne mène nulle part.
export const DEMO_LISTING_HOST = 'annonces.demonstration.invalid';
export const DEMO_PORTAL = 'demonstration';
// Le nom sous lequel l'annonce s'affiche (« Annonce d'origine : … ») : aucun portail réel, et rien
// qui dise « démonstration ».
export const DEMO_SOURCE_LABEL = 'Petites annonces';

// Les photos libres de droits de la démonstration, rangées dans l'application (`public/demo/photos`,
// sources et licences dans `docs/DEMO.md`).
export const DEMO_PHOTOS_PATH = '/demo/photos';

// Messages des actions de démonstration (hors des fichiers « use server », qui n'exportent que
// des fonctions asynchrones).
export const DEMO_SUBJECT_UNKNOWN = 'Adresse d’annonce inconnue : utilisez l’adresse proposée.';
export const DEMO_LISTING_UNKNOWN = 'Annonce inconnue.';
