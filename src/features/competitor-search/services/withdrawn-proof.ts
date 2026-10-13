// Mission 103 — « Annonce retirée » ne se dit que sur une PREUVE. Une page lue sans prix n'en est
// pas une : une page captcha, ou un gabarit de portail modifié, se présente exactement ainsi, et
// le concurrent retenu serait écarté à tort. La preuve, c'est ce que la page DIT :
//   • une page d'erreur 404 ou 410 — l'extension lit la page affichée, pas son statut HTTP : on
//     la reconnaît donc à ce qu'elle écrit (« Erreur 404 », « Page introuvable ») ;
//   • une mention explicite du portail (« Cette annonce n'est plus disponible »).
// La redirection hors de l'annonce est jugée ailleurs (`redirectedAwayFromListing`).
// Pur. N'est consulté que pour une page SANS prix ni donnée : une annonce lisible qui citerait
// l'une de ces phrases reste une annonce.

// Écrites comme `plainText` les rend : sans accent, en minuscules, l'apostrophe en espace.
const WITHDRAWN_MENTIONS = [
  'annonce n est plus disponible',
  'annonce n est plus en ligne',
  'annonce n est plus active',
  'annonce n existe plus',
  'annonce a ete retiree',
  'annonce a ete supprimee',
  'annonce a ete desactivee',
  'annonce est expiree',
  'annonce expiree',
  'annonce introuvable',
  'bien n est plus disponible',
  'bien n est plus en vente',
  'bien n est plus a la vente',
  'bien a ete vendu',
];

// Une liste par portail. Les cinq portails que l'extension relit partagent aujourd'hui les mêmes
// formules ; aucune page retirée n'a pu être capturée par portail (M47) : une formule propre à un
// portail s'ajoute ICI quand « page sans données » monte sur ce portail dans `/erreurs`.
const PORTAL_MENTIONS: Record<string, readonly string[]> = {
  'seloger.com': WITHDRAWN_MENTIONS,
  'bienici.com': WITHDRAWN_MENTIONS,
  'green-acres.fr': WITHDRAWN_MENTIONS,
  'lefigaro.fr': WITHDRAWN_MENTIONS,
  'maisonsetappartements.fr': WITHDRAWN_MENTIONS,
};

// Ce qu'écrit une page d'erreur 404 ou 410. Jamais « 404 » seul : c'est aussi un prix, une surface.
const NOT_FOUND =
  /\b(?:erreur|error) (?:404|410)\b|\b404 not found\b|\b410 gone\b|\bpage introuvable\b|\bpage non trouvee\b|\bpage not found\b|\bpage n existe (?:pas|plus)\b/;

function plainText(html: string): string {
  return html
    .replace(/<(script|style|noscript|template)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&(?:rsquo|apos|#39|#8217);/gi, ' ')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function mentionsFor(hostname: string): readonly string[] {
  const host = hostname.toLowerCase().replace(/^www\./, '');
  for (const [domain, mentions] of Object.entries(PORTAL_MENTIONS)) {
    if (host === domain || host.endsWith(`.${domain}`)) {
      return mentions;
    }
  }
  return WITHDRAWN_MENTIONS;
}

// La page prouve-t-elle que l'annonce n'est plus en ligne ?
export function provesWithdrawn(html: string, hostname: string): boolean {
  const text = plainText(html);
  return NOT_FOUND.test(text) || mentionsFor(hostname).some((mention) => text.includes(mention));
}

// Le code d'une page lue sans prix ni donnée : annonce retirée sur preuve, échec de lecture sinon.
export function emptyPageCode(
  html: string,
  hostname: string,
): 'listing_empty' | 'listing_withdrawn' {
  return provesWithdrawn(html, hostname) ? 'listing_withdrawn' : 'listing_empty';
}
