// Mission 87 — le nom de l'agence tel qu'il s'imprime sur le dossier, quel que soit sa longueur.
// Pur. L'en-tête le pose sur deux lignes au plus, en réduisant le texte sans jamais passer sous
// la taille du texte courant ; le pied de page et la carte de contact le tiennent sur UNE ligne,
// jamais coupé au milieu d'un mot.

// « Nom sur les documents » (Administration → Identité) s'il est rempli, sinon le nom de l'agence.
export function documentAgencyName(
  documentName: string | null | undefined,
  agencyName: string | null | undefined,
): string {
  const clean = (value: string | null | undefined): string =>
    (value ?? '').replace(/\s+/g, ' ').trim();
  return clean(documentName) || clean(agencyName);
}

// Tailles de la feuille, en points (document-styles.ts).
export const BODY_FONT_PT = 10.5;
export const HEADER_NAME_FONT_PT = 12;
// Ce que deux lignes d'en-tête portent à la taille du texte courant, à côté du destinataire.
export const HEADER_NAME_MAX_CHARS = 72;
const HEADER_NAME_COMFORT_CHARS = 30;
// Deux lignes portent un peu moins de deux fois une ligne : la coupe se fait entre deux mots.
const HEADER_TWO_LINES_FACTOR = 1.8;

// La taille du nom en tête : pleine tant qu'il est court, puis réduite à mesure qu'il
// s'allonge, avec pour plancher la taille du texte courant.
export function headerNameFontPt(name: string): number {
  const length = name.trim().length;
  if (length <= HEADER_NAME_COMFORT_CHARS) {
    return HEADER_NAME_FONT_PT;
  }
  const shrunk =
    (HEADER_NAME_FONT_PT * HEADER_NAME_COMFORT_CHARS * HEADER_TWO_LINES_FACTOR) / length;
  return Math.max(BODY_FONT_PT, Math.min(HEADER_NAME_FONT_PT, Math.round(shrunk * 10) / 10));
}

// Un nom ramené à `maxChars` au plus, coupé entre deux mots et suivi de « … ». Un nom qui tient
// est rendu tel quel ; un premier mot plus long que la place est le seul cas où l'on coupe
// dedans, faute de mot entier à garder.
export function fitWholeWords(name: string, maxChars: number): string {
  const text = name.replace(/\s+/g, ' ').trim();
  if (text.length <= maxChars) {
    return text;
  }
  const room = Math.max(1, maxChars - 1);
  const head = text.slice(0, room + 1);
  const cut = head.lastIndexOf(' ');
  const kept = (cut > 0 ? head.slice(0, cut) : text.slice(0, room)).replace(/[\s—–\-·,;:]+$/, '');
  return `${kept}…`;
}

// Ce qu'une ligne porte : le pied de page (7 pt, la moitié de la largeur utile) et la carte de
// contact (« Conseiller · … », entre la photo et le QR code).
export const FOOTER_NAME_MAX_CHARS = 64;
export const CONTACT_LINE_MAX_CHARS = 78;
export const CONTACT_FONT_PT = 9.5;
const CONTACT_COMFORT_CHARS = 58;
const CONTACT_MIN_FONT_PT = 7.5;

export function footerAgencyName(name: string): string {
  return fitWholeWords(name, FOOTER_NAME_MAX_CHARS);
}

// « Conseiller · [agence] » sur une seule ligne : le texte se réduit d'abord, puis le nom se
// raccourcit au mot entier s'il ne tient toujours pas.
export function contactAgencyLine(name: string): { text: string; fontPt: number } {
  const prefix = 'Conseiller · ';
  const text = `${prefix}${fitWholeWords(name, CONTACT_LINE_MAX_CHARS - prefix.length)}`;
  if (text.length <= CONTACT_COMFORT_CHARS) {
    return { text, fontPt: CONTACT_FONT_PT };
  }
  const shrunk = (CONTACT_FONT_PT * CONTACT_COMFORT_CHARS) / text.length;
  return { text, fontPt: Math.max(CONTACT_MIN_FONT_PT, Math.round(shrunk * 10) / 10) };
}
