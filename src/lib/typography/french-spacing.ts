// Lot A (Jean-Guy, 27/11) — une seule règle pour tous les textes visibles et tous les documents
// imprimés : aucune ligne ne se coupe avant « : ; ? ! », ni à l'intérieur de « ». Une espace
// insécable (U+00A0) avant « : » et « », et après « ; une espace fine insécable (U+202F) avant
// « ; ? ! ». Dans le code, elles s'écrivent ` ` et ` ` dans une chaîne, `&nbsp;` et
// `&#x202f;` dans le JSX. Les textes figés de l'offre d'achat et du bon de visite n'y passent pas :
// ils sont signés tels qu'ils ont été validés. Pur.

export const NBSP = String.fromCharCode(0x00a0);
export const NARROW_NBSP = String.fromCharCode(0x202f);

// Les espaces où une ligne peut se couper : toutes, sauf les insécables (U+00A0, U+202F, U+2007).
const BREAKABLE = new Set([
  0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x20, 0x1680, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005,
  0x2006, 0x2008, 0x2009, 0x200a, 0x205f, 0x3000,
]);
const isSpace = (char: string): boolean =>
  char === NBSP || char === NARROW_NBSP || BREAKABLE.has(char.charCodeAt(0));

// L'espace qu'attend chaque marque devant elle.
const BEFORE_MARK: Readonly<Record<string, string>> = {
  ':': NBSP,
  '»': NBSP,
  ';': NARROW_NBSP,
  '?': NARROW_NBSP,
  '!': NARROW_NBSP,
};

export type SpacingFault = {
  // Les espaces fautives, de `start` (inclus) à `end` (exclu).
  start: number;
  end: number;
  mark: string;
  expected: string;
};

// Les espaces où une ligne pourrait se couper devant une marque (ou après « ), ou qui ne sont pas
// celle qu'attend la marque : plusieurs espaces de suite sont une faute, une ligne pouvant se
// couper entre elles.
export function frenchSpacingFaults(text: string): SpacingFault[] {
  const faults: SpacingFault[] = [];
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]!;
    const expected = BEFORE_MARK[char];
    if (expected !== undefined) {
      let start = index;
      while (start > 0 && isSpace(text[start - 1]!)) start -= 1;
      // Après le séparateur « · », la marque est un symbole, pas une ponctuation : « ✗ non · ? à
      // vérifier », la légende de la grille. Une marque sans espace devant ne coupe rien.
      const symbol = start > 0 && text[start - 1] === '·';
      if (!symbol && start < index && (index - start > 1 || text[start] !== expected)) {
        faults.push({ start, end: index, mark: char, expected });
      }
    }
    if (char === '«') {
      let end = index + 1;
      while (end < text.length && isSpace(text[end]!)) end += 1;
      if (end > index + 1 && (end - index > 2 || text[index + 1] !== NBSP)) {
        faults.push({ start: index + 1, end, mark: '«', expected: NBSP });
      }
    }
  }
  return faults;
}

// Lot A, suite (Jean-Guy, 28/11) — la même règle, à l'affichage seulement, pour ce que tape le
// conseiller et que lisent le vendeur, l'acquéreur ou le destinataire d'un courrier (la
// justification de sa décision de prix, les points forts du bien, ses mots pour l'acquéreur, les
// textes d'un courrier) : chaque suite d'espaces fautive devient l'espace qu'attend sa marque. Le
// texte enregistré ne change pas ; aucune espace n'est ajoutée là où il n'y en a pas.
export function withFrenchSpacing(text: string): string {
  let fixed = '';
  let from = 0;
  for (const fault of frenchSpacingFaults(text)) {
    // Deux marques autour des mêmes espaces (« « : ») : la première décide.
    if (fault.start < from) continue;
    fixed += text.slice(from, fault.start) + fault.expected;
    from = fault.end;
  }
  return fixed + text.slice(from);
}
