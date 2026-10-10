// Mission 84 — `*mot*` met un passage en valeur (couleur d'accent dans un titre, gras
// ailleurs). Le texte du conseiller reste un texte : il est découpé, jamais interprété en HTML.

export type EmphasisPart = { text: string; strong: boolean };

export function parseEmphasis(text: string): EmphasisPart[] {
  const parts: EmphasisPart[] = [];
  const pattern = /\*([^*\n]+)\*/g;
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (start > cursor) {
      parts.push({ text: text.slice(cursor, start), strong: false });
    }
    parts.push({ text: match[1], strong: true });
    cursor = start + match[0].length;
  }
  if (cursor < text.length) {
    parts.push({ text: text.slice(cursor), strong: false });
  }
  return parts;
}

// Le texte tel qu'il se lit, sans les astérisques.
export const plainText = (text: string): string =>
  parseEmphasis(text)
    .map((part) => part.text)
    .join('');

// Lignes d'un titre, paragraphes d'une lettre.
export const lines = (text: string): string[] =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '');

export const paragraphs = (text: string): string[] =>
  text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph !== '');
