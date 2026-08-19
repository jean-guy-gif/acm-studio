// Construit le raccourci « Envoyer vers ACM Studio » à glisser dans la barre de
// favoris du conseiller.
//
// Ce que le raccourci fait, exécuté dans l'onglet du portail :
//   1. ouvre (ou réutilise) la fenêtre ACM Studio « /import-assistant » ;
//   2. lui envoie l'adresse et le code de la page TELLE QUE LE CONSEILLER LA VOIT,
//      en plusieurs tentatives espacées — la fenêtre met un instant à être prête,
//      et les envois surnuméraires sont ignorés par l'assistant.
//
// RÈGLE ABSOLUE : ne JAMAIS rien envoyer à la page du portail, et ne JAMAIS y
// installer d'écouteur. Terrain (19/08) : une première version faisait dire
// « je suis prêt » à l'assistant vers l'onglet du portail, en boucle. Bien'ici a
// affiché sa page d'erreur — un de leurs écouteurs `message` ne supporte pas un
// format inattendu. On ne touche donc plus du tout à leur page : on lit son
// contenu, un point c'est tout. Les envois sont dirigés vers l'origine ACM
// Studio exacte (jamais « * »).

export const ASSISTANT_PATH = '/import-assistant';
export const LISTING_MESSAGE_TYPE = 'acm-listing';

// Tentatives d'envoi, en millisecondes après le clic. Couvre une fenêtre lente
// à s'ouvrir sans harceler quoi que ce soit : tout est dirigé vers notre propre
// fenêtre, et l'assistant ne retient que le premier message reçu.
export const SEND_ATTEMPTS_MS = [0, 600, 1400, 2600, 4200, 6500, 9500, 13000];

// Le code est volontairement compact et sans dépendance : un favori doit tenir
// sur une ligne et fonctionner sur tous les navigateurs des conseillers.
export function buildBookmarkletSource(origin: string): string {
  return [
    '(function(){',
    `var o=${JSON.stringify(origin)};`,
    `var w=window.open(o+${JSON.stringify(ASSISTANT_PATH)},'acmstudio');`,
    "if(!w){alert('Autorisez les fenetres pour ACM Studio, puis reessayez.');return;}",
    `var p={type:${JSON.stringify(LISTING_MESSAGE_TYPE)},url:location.href,html:document.documentElement.outerHTML};`,
    `${JSON.stringify(SEND_ATTEMPTS_MS)}.forEach(function(ms){setTimeout(function(){try{w.postMessage(p,o);}catch(e){}},ms);});`,
    '})()',
  ].join('');
}

// Un favori doit être une URL « javascript: ». On encode pour que les espaces,
// guillemets et accents survivent au glisser-déposer dans tous les navigateurs.
export function buildBookmarkletHref(origin: string): string {
  return `javascript:${encodeURIComponent(buildBookmarkletSource(origin))}`;
}
