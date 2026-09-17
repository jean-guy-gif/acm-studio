// Ne garder que les photos DE L'ANNONCE.
//
// Recette du 19/08 (Green Acres) : sur 20 photos importées, 12 étaient les
// bonnes, 1 était un doublon en miniature, 5 appartenaient à une AUTRE annonce
// affichée en bas de page (« biens similaires ») et 2 étaient les badges
// App Store et Google Play du site.
//
// La page mélange donc trois choses : l'annonce, son voisinage, et l'habillage
// du site. Le filtre par hébergeur ne suffit pas — tout sort du même serveur.
//
// Deux règles, dans cet ordre.

// 1. L'habillage du site. Ces chemins ne portent jamais la photo d'un bien.
const SITE_CHROME =
  /(^|[/_-])(badge|badges|logo|logos|sprite|sprites|icon|icons|placeholder|avatar|banner|pictos?|app[_-]?store|google[_-]?play|apple|browser[_-]?upgrade)([/_.-]|$)/i;

// 2. L'identifiant de l'annonce. Green Acres, SeLoger et consorts le placent
// dans le chemin de leurs images ; il est aussi dans l'adresse de l'annonce.
// Un jeton assez long pour ne pas être un mot commun.
const ID_TOKEN = /[A-Za-z0-9]{8,}/g;

// Les adresses peuvent être relatives : on les résout d'abord sur celle de
// l'annonce, sinon on écarterait à tort toutes les photos d'un site qui les
// écrit en relatif.
function tokensOf(url: string, base: string): string[] {
  try {
    const { pathname } = new URL(url, base);
    return (pathname.match(ID_TOKEN) ?? []).map((token) => token.toLowerCase());
  } catch {
    return [];
  }
}

// Retourne les photos réellement rattachées à l'annonce.
//
// Mission 49 — le CADRAGE (les photos arrivent déjà de la seule tranche de
// l'annonce, voir extract-listing-data + normalize) est le moyen principal.
// L'identifiant n'est plus qu'une CONFIRMATION SECONDAIRE : s'il apparaît dans
// certaines photos (Green Acres met son advert-id dans l'URL), il départage un
// éventuel intrus resté dans la tranche ; s'il n'apparaît nulle part (SeLoger =
// UUID opaques), le cadrage amont fait foi et on garde la tranche. On n'ÉLARGIT
// jamais au-delà de l'entrée cadrée — c'est l'appelant qui garantit le fail-closed
// (entrée cadrée vide → aucune photo, journalisée).
export function keepListingPhotos(photoUrls: string[], listingUrl: string): string[] {
  const withoutChrome = photoUrls.filter((url) => {
    try {
      return !SITE_CHROME.test(new URL(url, listingUrl).pathname);
    } catch {
      // Adresse illisible même relativement à l'annonce : la déduplication qui
      // suit l'écartera de toute façon.
      return false;
    }
  });

  const listingTokens = new Set(tokensOf(listingUrl, listingUrl));
  if (listingTokens.size === 0) {
    return withoutChrome;
  }

  const matching = withoutChrome.filter((url) =>
    tokensOf(url, listingUrl).some((token) => listingTokens.has(token)),
  );
  // L'identifiant confirme quand il apparaît quelque part ; sinon, la tranche
  // cadrée reste la vérité (jamais un élargissement hors d'elle).
  return matching.length > 0 ? matching : withoutChrome;
}
