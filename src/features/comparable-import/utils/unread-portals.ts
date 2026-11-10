// Mission 150 (mesures du 10/11) — un site qu'ACM ne lit plus correctement n'est plus proposé :
// Figaro Immobilier donne sa page, mais plus ni le prix ni la surface (format de page changé
// depuis la M76). Une adresse collée de ce site est refusée, à l'écran comme au serveur, et le
// conseiller saisit le bien à la main. L'extension garde son accès au site (elle ne change pas).
export const UNREAD_PORTAL_SUFFIXES = ['immobilier.lefigaro.fr'] as const;

export const UNREAD_PORTAL_MESSAGE =
  'Figaro Immobilier ne se lit plus : sa page ne donne plus ni le prix ni la surface. Saisissez le bien à la main ci-dessous.';

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
