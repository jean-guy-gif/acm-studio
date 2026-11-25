// La refonte, lot A — l'aperçu du socle (`/socle`) ne s'ouvre que sur l'essai (déploiement de
// prévisualisation Vercel) et en local : une liste d'autorisation, comme le bon de la tournée
// (M154). Un environnement qui ne se dit pas, ou qui se dit autrement, reste fermé : la page est
// introuvable en production. Lu au serveur seulement ; la page est retirée au lot F.
export function soclePreviewOpen(
  env: { VERCEL_ENV?: string; NODE_ENV?: string } = process.env,
): boolean {
  return env.VERCEL_ENV === 'preview' || env.NODE_ENV === 'development';
}
