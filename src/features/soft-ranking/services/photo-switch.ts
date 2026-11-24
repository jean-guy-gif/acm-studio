// Lancement, mission 9 — la lecture des photos des annonces par l'IA est ÉTEINTE en production :
// la page de confidentialité validée ne parle que des « descriptions publiques des annonces », et
// elle dit ce que le code fait (M73). L'allumer est un geste à part, sur l'ordre de Jean-Guy, avec
// la phrase de la page (`missions/L9-mesure.md`). Éteinte, elle ne s'ouvre que sur l'essai, en
// local et dans les tests, par une liste d'autorisation — comme le bon de la tournée (M154) : un
// environnement qui ne se dit pas reste éteint. Lu au serveur seulement.

export const PHOTOS_DES_ANNONCES_LUES = false;

export function listingPhotosRead(
  env: { VERCEL_ENV?: string; NODE_ENV?: string } = process.env,
  lit: boolean = PHOTOS_DES_ANNONCES_LUES,
): boolean {
  return (
    lit || env.VERCEL_ENV === 'preview' || env.NODE_ENV === 'development' || env.NODE_ENV === 'test'
  );
}
