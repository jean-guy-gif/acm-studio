// Lancement, mission 11 (suite, demande de Jean-Guy du 25/11) — un site qui interdit à tout robot la
// lecture de ses pages d'annonce. Belles Demeures : son robots.txt écrit « Disallow: /*/detail.htm »
// pour tous les robots (relu le 25/11, comme le 19/08, M35), et l'extension ne lit pas ce site. ACM
// respecte ce que le site publie (M45) : c'est dit avant toute lecture, à l'écran comme au serveur,
// sans rien demander au site. Pur.
const FORBIDDEN_PORTALS: readonly { suffix: string; name: string }[] = [
  { suffix: 'bellesdemeures.com', name: 'Belles Demeures' },
];

// Leurs noms, tels que le guide de prise en main les dit (un test compare les deux).
export const FORBIDDEN_PORTAL_NAMES: readonly string[] = FORBIDDEN_PORTALS.map(({ name }) => name);

export function forbiddenPortalMessage(raw: string): string | null {
  let host: string;
  try {
    host = new URL(raw).hostname.toLowerCase();
  } catch {
    return null;
  }
  const portal = FORBIDDEN_PORTALS.find(
    ({ suffix }) => host === suffix || host.endsWith(`.${suffix}`),
  );
  return portal
    ? `${portal.name} interdit la lecture automatique de ses annonces\u00a0: ACM ne peut pas la reprendre. Saisissez le bien à la main ci-dessous.`
    : null;
}
