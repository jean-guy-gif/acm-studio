// Lancement, mission 9 — la lecture des photos des annonces par l'IA est ÉTEINTE : la page de
// confidentialité validée ne parle que des « descriptions publiques des annonces », et elle dit ce
// que le code fait (M73). Tant qu'elle est éteinte, AUCUNE photo d'une vraie annonce n'est chargée
// ni envoyée, nulle part. L'allumer est un geste à part, sur l'ordre de Jean-Guy, avec la phrase de
// la page (`missions/L9-mesure.md`). Éteinte, seule l'agence de démonstration la voit, simulée (rien
// n'est chargé ni envoyé, M114), et seulement sur l'essai, en local et dans les tests, par une
// liste d'autorisation — comme le bon de la tournée (M154) : un environnement qui ne se dit pas
// reste éteint. Lu au serveur seulement.

export const PHOTOS_DES_ANNONCES_LUES = false;

// Les photos ne sont lues qu'à la PREMIÈRE recherche d'une fiche : « Chercher encore » ne
// connaît que ses nouveaux biens — ses cinq meilleurs ne seraient pas les mieux classés de la
// recherche — et repaierait la lecture.
export function photosForSearch(
  search: { demo: boolean; resumed: boolean },
  env: { VERCEL_ENV?: string; NODE_ENV?: string } = process.env,
  lit: boolean = PHOTOS_DES_ANNONCES_LUES,
): boolean {
  return !search.resumed && listingPhotosRead(search.demo, env, lit);
}

export function listingPhotosRead(
  demo: boolean,
  env: { VERCEL_ENV?: string; NODE_ENV?: string } = process.env,
  lit: boolean = PHOTOS_DES_ANNONCES_LUES,
): boolean {
  if (lit) return true;
  return (
    demo &&
    (env.VERCEL_ENV === 'preview' || env.NODE_ENV === 'development' || env.NODE_ENV === 'test')
  );
}
