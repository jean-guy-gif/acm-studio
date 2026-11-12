// Mission 154 (point 3) — le bon de la tournée est ÉTEINT en production jusqu'à ce que Jean-Guy
// l'allume (`BON_TOURNEE_OUVERT`) ; il s'ouvre sur l'essai (déploiement de prévisualisation Vercel),
// en local et dans les tests, pour l'essayer sans l'ouvrir aux agences. Une liste d'autorisation
// (relecteur) : un environnement qui ne se dit pas, ou qui se dit autrement, reste éteint. Lu au
// serveur seulement.

export const BON_TOURNEE_OUVERT = false;

export function tourVoucherOpen(
  env: { VERCEL_ENV?: string; NODE_ENV?: string } = process.env,
): boolean {
  return (
    BON_TOURNEE_OUVERT ||
    env.VERCEL_ENV === 'preview' ||
    env.NODE_ENV === 'development' ||
    env.NODE_ENV === 'test'
  );
}
