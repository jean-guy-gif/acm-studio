// Mission 87 — la photo du bien concurrent sur le dossier : un CHOIX du conseiller (remplace
// M84, « jamais les photos du concurrent »). Pur. Trois possibilités :
//   • une photo de son annonce ;
//   • « Ma photo » : une photo importée par le conseiller (la façade prise sur place) ;
//   • « Sans photo » : le cadre gris.
// Tant que le conseiller n'a rien choisi, c'est « Sans photo » (mission 90, question de droits) :
// les photos de l'annonce et « Ma photo » restent à son choix. Rien d'autre ne peut afficher une
// photo du concurrent.

export const THEIR_PHOTO_MODES = ['listing', 'upload', 'none'] as const;
export type TheirPhotoMode = (typeof THEIR_PHOTO_MODES)[number];

// Ce qui est enregistré avec le dossier (null = pas encore choisi).
export type SavedTheirPhoto = {
  mode: TheirPhotoMode | null;
  sourceUrl: string | null;
  path: string | null;
};

export const NO_SAVED_THEIR_PHOTO: SavedTheirPhoto = { mode: null, sourceUrl: null, path: null };

// Le choix tel que l'écran le tient et l'envoie.
export type TheirPhotoChoice =
  { mode: 'listing'; url: string } | { mode: 'upload'; path: string } | { mode: 'none' };

export const THEIR_PHOTO_URL_MAX_LENGTH = 2000;

// Les photos d'une annonce viennent d'un portail : on ne garde que de vraies adresses web, sans
// doublon, dans l'ordre de l'annonce.
export function listingPhotoUrls(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const urls = raw.filter(
    (value): value is string =>
      typeof value === 'string' &&
      /^https?:\/\//i.test(value) &&
      value.length <= THEIR_PHOTO_URL_MAX_LENGTH,
  );
  return [...new Set(urls)];
}

// Où vivent les photos du concurrent dans le stockage de l'agence, pour CE concurrent. Tout
// chemin venu du navigateur doit commencer par là.
export function theirPhotoPrefix(
  agencyId: string,
  projectId: string,
  competitorId: string,
): string {
  return `${agencyId}/${projectId}/prospecting/${competitorId}/`;
}

// Le choix à l'ouverture : celui qui est enregistré s'il tient encore, sinon « Sans photo ». Une photo d'annonce retirée de l'annonce depuis, ou un
// fichier hors du dossier de ce concurrent, ne se choisit plus.
export function initialTheirPhotoChoice(
  saved: SavedTheirPhoto,
  listing: string[],
  prefix: string,
): TheirPhotoChoice {
  if (saved.mode === 'none') {
    return { mode: 'none' };
  }
  if (saved.mode === 'upload' && saved.path?.startsWith(prefix)) {
    return { mode: 'upload', path: saved.path };
  }
  if (saved.mode === 'listing' && saved.sourceUrl && listing.includes(saved.sourceUrl)) {
    return { mode: 'listing', url: saved.sourceUrl };
  }
  // Mission 90 — rien de choisi : « Sans photo ». Une photo d'annonce appartient à son auteur ;
  // la montrer est une décision du conseiller, jamais un défaut.
  return { mode: 'none' };
}

// Ce que le serveur accepte d'enregistrer : une photo d'annonce doit être l'une de CELLES de
// cette annonce, un fichier doit être dans le dossier de ce concurrent. Sinon, refus.
export function validTheirPhotoChoice(
  choice: TheirPhotoChoice,
  listing: string[],
  prefix: string,
): boolean {
  if (choice.mode === 'listing') {
    return listing.includes(choice.url);
  }
  if (choice.mode === 'upload') {
    return choice.path.startsWith(prefix) && !choice.path.includes('..');
  }
  return true;
}

// L'adresse à afficher pour un choix : la copie gardée dans le stockage de l'agence quand elle
// existe (un lien de portail expire avec l'annonce), sinon l'adresse de l'annonce ; « Sans
// photo » n'affiche rien.
export function theirPhotoDisplayUrl(
  choice: TheirPhotoChoice,
  saved: SavedTheirPhoto,
  signed: Record<string, string | null>,
): string | null {
  if (choice.mode === 'none') {
    return null;
  }
  if (choice.mode === 'upload') {
    return signed[choice.path] ?? null;
  }
  const copied =
    saved.mode === 'listing' && saved.sourceUrl === choice.url && saved.path
      ? (signed[saved.path] ?? null)
      : null;
  return copied ?? choice.url;
}

// Mission 105 — la photo d'une annonce appartient à son auteur : pendant la bêta, l'option est
// retirée de l'éditeur, et une photo d'annonce déjà choisie ne s'imprime plus (rien n'est effacé
// en base). La photo prise par le conseiller lui-même (« Ma photo ») n'est pas concernée.
export const LISTING_PHOTOS_OFFERED = false;

export function withoutListingPhoto(saved: SavedTheirPhoto): SavedTheirPhoto {
  return saved.mode === 'listing' ? { mode: 'none', sourceUrl: null, path: null } : saved;
}

// Mission 108 — après un enregistrement, le fichier gardé que le courrier ne montre plus : il est
// retiré du stockage. `storedPath` est le fichier RÉELLEMENT gardé, photo d'annonce comprise
// (masquée à l'écran depuis M105) — sinon elle restait dans le stockage pour toujours.
export function staleTheirPhotoPath(storedPath: string | null, kept: string | null): string | null {
  return storedPath && storedPath !== kept ? storedPath : null;
}
