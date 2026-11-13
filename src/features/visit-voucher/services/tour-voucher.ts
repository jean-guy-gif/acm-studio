// Mission 154 (point 3) — le bon de la tournée, essayé sur l'essai (déploiement de
// prévisualisation Vercel), en local et dans les tests avant d'être ouvert aux agences (une liste
// d'autorisation : un environnement qui ne se dit pas, ou qui se dit autrement, restait éteint).
// Allumé en production sur l'ordre de Jean-Guy (12/11), puis éteint de nouveau sur son ordre le
// même jour : `BON_TOURNEE_OUVERT`. Éteint, il ne s'ouvre que sur l'essai, en local et dans les
// tests ; en production, les règles de la M153 tiennent. Lu au serveur seulement.

export const BON_TOURNEE_OUVERT = false;

export function tourVoucherOpen(
  env: { VERCEL_ENV?: string; NODE_ENV?: string } = process.env,
  lit: boolean = BON_TOURNEE_OUVERT,
): boolean {
  return (
    lit || env.VERCEL_ENV === 'preview' || env.NODE_ENV === 'development' || env.NODE_ENV === 'test'
  );
}
