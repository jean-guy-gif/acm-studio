// Transforme un fragment de page en texte lisible.
//
// Terrain (19/08, Green Acres) : la description de l'annonce était bien dans la
// page, mais encodée — « exposition sud-ouest » s'y écrit
// « exposition sud-ouest » avec des `&#xE9;`, et les retours à la ligne sont des
// `&#xD;&#xA;`. Notre lecteur ne voyait donc que la balise `meta`, longue de 38
// caractères, d'où les cases « extérieurs » et « stationnement » jamais cochées.
//
// Aucune exécution : on remplace des motifs dans une chaîne.

// Entités nommées rencontrées sur les portails français. Les entités numériques
// (`&#233;`, `&#xE9;`) sont traitées à part et couvrent tout le reste.
const NAMED: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  eacute: 'é',
  egrave: 'è',
  ecirc: 'ê',
  euml: 'ë',
  agrave: 'à',
  acirc: 'â',
  aelig: 'æ',
  ccedil: 'ç',
  iacute: 'í',
  icirc: 'î',
  iuml: 'ï',
  ocirc: 'ô',
  oelig: 'œ',
  ouml: 'ö',
  ugrave: 'ù',
  ucirc: 'û',
  uuml: 'ü',
  ntilde: 'ñ',
  deg: '°',
  sup2: '²',
  sup3: '³',
  euro: '€',
  laquo: '«',
  raquo: '»',
  rsquo: '’',
  lsquo: '‘',
  ldquo: '“',
  rdquo: '”',
  hellip: '…',
  ndash: '–',
  mdash: '—',
  middot: '·',
  times: '×',
  frac12: '½',
};

export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
      String.fromCodePoint(Number.parseInt(String(hex), 16)),
    )
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number.parseInt(String(dec), 10)))
    .replace(/&([a-zA-Z][a-zA-Z0-9]{1,10});/g, (whole, name) => NAMED[String(name)] ?? whole);
}

// Balises dont la fermeture sépare deux idées : sans ce traitement,
// « Terrasse</li><li>Garage » deviendrait « TerrasseGarage » et aucun des deux
// ne serait reconnu.
const BLOCK_END = /<\/(p|div|li|ul|ol|tr|td|th|h[1-6]|section|article|span)\s*>/gi;
const LINE_BREAK = /<br\s*\/?>/gi;
// Le contenu des scripts et des styles n'est pas du texte d'annonce.
const NON_TEXT = /<(script|style|noscript|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;

// Texte visible d'un fragment de page : balises retirées, entités décodées,
// espaces normalisés. Les retours à la ligne sont conservés (une description
// d'annonce est souvent une énumération ligne à ligne).
export function htmlFragmentToText(fragment: string): string {
  return decodeHtmlEntities(
    fragment
      .replace(NON_TEXT, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(LINE_BREAK, '\n')
      .replace(BLOCK_END, '\n')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\r/g, '\n')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ *\n *(?:\n *)+/g, '\n')
    .replace(/ *\n */g, '\n')
    .trim();
}
