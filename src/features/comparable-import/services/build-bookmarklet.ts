// Construit le raccourci « Envoyer vers ACM Studio » à glisser dans la barre de
// favoris du conseiller.
//
// Ce que le raccourci fait, exécuté dans l'onglet du portail :
//   1. ouvre (ou réutilise) la fenêtre ACM Studio « /import-assistant » ;
//   2. attend son signal « acm-ready » ;
//   3. lui envoie l'adresse et le code de la page TELLE QUE LE CONSEILLER LA VOIT.
//
// Ce qu'il ne fait pas : aucune requête vers le portail, aucun contournement de
// protection, aucune donnée envoyée ailleurs qu'à l'adresse ACM Studio passée
// ici (l'envoi est ciblé sur cette origine exacte, jamais sur « * »).

export const ASSISTANT_PATH = '/import-assistant';
export const READY_SIGNAL = 'acm-ready';
export const LISTING_MESSAGE_TYPE = 'acm-listing';

// Le code est volontairement compact et sans dépendance : un favori doit tenir
// sur une ligne et fonctionner sur tous les navigateurs des conseillers.
export function buildBookmarkletSource(origin: string): string {
  return [
    '(function(){',
    `var o=${JSON.stringify(origin)};`,
    `var w=window.open(o+${JSON.stringify(ASSISTANT_PATH)},'acmstudio');`,
    "if(!w){alert('Autorisez les fenetres pour ACM Studio, puis reessayez.');return;}",
    `var p={type:${JSON.stringify(LISTING_MESSAGE_TYPE)},url:location.href,html:document.documentElement.outerHTML};`,
    `function s(e){if(e.source===w&&e.data===${JSON.stringify(READY_SIGNAL)}){w.postMessage(p,o);}}`,
    "window.addEventListener('message',s);",
    "setTimeout(function(){window.removeEventListener('message',s);},60000);",
    '})()',
  ].join('');
}

// Un favori doit être une URL « javascript: ». On encode pour que les espaces,
// guillemets et accents survivent au glisser-déposer dans tous les navigateurs.
export function buildBookmarkletHref(origin: string): string {
  return `javascript:${encodeURIComponent(buildBookmarkletSource(origin))}`;
}
