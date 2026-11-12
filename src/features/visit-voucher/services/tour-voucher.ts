// Mission 154 (point 3) — le bon de la tournée, essayé sur l'essai (déploiement de
// prévisualisation Vercel), en local et dans les tests avant d'être ouvert aux agences (une liste
// d'autorisation : un environnement qui ne se dit pas, ou qui se dit autrement, restait éteint).
// Allumé en production sur l'ordre de Jean-Guy (12/11) : `BON_TOURNEE_OUVERT`, qui l'éteint de
// nouveau partout d'un seul geste. Lu au serveur seulement.

export const BON_TOURNEE_OUVERT = true;

export function tourVoucherOpen(
  env: { VERCEL_ENV?: string; NODE_ENV?: string } = process.env,
  lit: boolean = BON_TOURNEE_OUVERT,
): boolean {
  return (
    lit || env.VERCEL_ENV === 'preview' || env.NODE_ENV === 'development' || env.NODE_ENV === 'test'
  );
}
