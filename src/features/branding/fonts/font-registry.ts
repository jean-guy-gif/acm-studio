// Mission 57 jalon 2 — la liste COURTE des polices embarquées, source unique de vérité.
//
// « Chercher la qualité, pas la couverture » : six caractères sobres et professionnels
// valent mieux que vingt moyens (une liste courte se parcourt d'un œil). Deux agences sur
// quatre ont une police propriétaire qu'aucune liste ne retrouverait ; le rôle de cette
// liste n'est donc pas de retrouver la police du site, mais d'offrir un caractère qui ne
// jure pas avec la charte.
//
// La clé est un SLUG. Elle ne devient JAMAIS une valeur libre dans une feuille de style :
// elle mappe vers `cssVar`, une variable CSS définie par next/font (voir embedded-fonts.ts),
// codée en dur ici. Une clé inconnue ne mappe vers rien → l'outil garde sa typo produit.
// Aucune n'est chargée depuis l'extérieur pendant le Live (§5) : next/font les auto-héberge
// à la compilation.
export const EMBEDDED_FONTS = [
  { key: 'montserrat', label: 'Montserrat', cssVar: '--font-montserrat' },
  { key: 'inter', label: 'Inter', cssVar: '--font-inter' },
  { key: 'poppins', label: 'Poppins', cssVar: '--font-poppins' },
  { key: 'source-sans', label: 'Source Sans 3', cssVar: '--font-source-sans' },
  { key: 'work-sans', label: 'Work Sans', cssVar: '--font-work-sans' },
  { key: 'nunito-sans', label: 'Nunito Sans', cssVar: '--font-nunito-sans' },
] as const;

export type EmbeddedFontKey = (typeof EMBEDDED_FONTS)[number]['key'];

// Vrai seulement pour une clé embarquée connue — le seul filtre qui autorise une police à
// entrer dans la charte. Tout le reste (null, valeur libre, tentative d'injection) est faux.
export function isEmbeddedFontKey(value: unknown): value is EmbeddedFontKey {
  return typeof value === 'string' && EMBEDDED_FONTS.some((font) => font.key === value);
}

// Le nom de variable CSS EN DUR d'une police embarquée, ou null si la clé est inconnue.
// Ce qui sort d'ici ne peut être qu'un `--font-*` de la liste — jamais une valeur du client.
export function embeddedFontCssVar(key: string | null): string | null {
  const font = EMBEDDED_FONTS.find((entry) => entry.key === key);
  return font ? font.cssVar : null;
}
