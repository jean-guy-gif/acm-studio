// Mission 150 (mesures du 10/11) — un site dont ACM ne sait plus lire la page est refusé dès
// l'adresse collée, à l'écran comme au serveur, et le conseiller saisit le bien à la main.
// Lancement, mission 4 (24/11) : Figaro Immobilier, refusé depuis la M150, se lit de nouveau (son
// prix et sa surface se lisent dans le bloc de l'annonce) ; la liste est vide. Un site s'y ajoute
// le jour où sa page ne se lit plus, le temps de réparer son lecteur.
export const UNREAD_PORTAL_SUFFIXES: readonly string[] = [];

export const UNREAD_PORTAL_MESSAGE =
  'Ce site ne se lit plus\u00a0: sa page ne donne plus ni le prix ni la surface. Saisissez le bien à la main ci-dessous.';

export function isUnreadPortalHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^www\./, '');
  return UNREAD_PORTAL_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
}

export function isUnreadPortalUrl(raw: string): boolean {
  try {
    return isUnreadPortalHost(new URL(raw).hostname);
  } catch {
    return false;
  }
}
