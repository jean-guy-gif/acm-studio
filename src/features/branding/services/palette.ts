// Mission 55 jalon 1 — la charte, en couleurs. PUR et testable.
//
// Règle du dépôt appliquée à un endroit neuf : une couleur est une DONNÉE, jamais une
// instruction. `isValidHex` est la garde ; toute valeur qui entre dans une feuille de style
// passe par elle d'abord. On ne sert JAMAIS que du #RRGGBB.

export const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function isValidHex(value: string | null | undefined): value is string {
  return typeof value === 'string' && HEX_RE.test(value);
}

type Rgb = { r: number; g: number; b: number };

function toRgb(hex: string): Rgb {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

function toHex({ r, g, b }: Rgb): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  const h = (n: number) => clamp(n).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

// Assombrit vers le noir (amount 0..1). Éclaircir = mélanger vers le blanc.
function darken(hex: string, amount: number): string {
  const { r, g, b } = toRgb(hex);
  return toHex({ r: r * (1 - amount), g: g * (1 - amount), b: b * (1 - amount) });
}
function mixWithWhite(hex: string, amount: number): string {
  const { r, g, b } = toRgb(hex);
  return toHex({ r: r + (255 - r) * amount, g: g + (255 - g) * amount, b: b + (255 - b) * amount });
}

// Luminance relative et contraste WCAG.
function channelLuminance(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}
export function relativeLuminance(hex: string): number {
  const { r, g, b } = toRgb(hex);
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
}
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

const WHITE = '#ffffff';
const NEAR_BLACK = '#0b1220';
const TEXT_AA = 4.5; // contraste minimal pour un texte normal (WCAG AA)

// Assombrit une couleur jusqu'à ce qu'elle soit lisible EN TEXTE sur blanc (§5).
function ensureTextContrast(hex: string): string {
  let current = hex;
  for (let i = 0; i < 20 && contrastRatio(current, WHITE) < TEXT_AA; i += 1) {
    current = darken(current, 0.1);
  }
  return current;
}

export type BrandPalette = {
  brand: string; // l'accent EXACT de l'agence — aplats, boutons, accents
  brandDeep: string; // la couleur profonde, garantie lisible en texte sur blanc
  brandSoft: string; // teinte très claire — fonds doux
  brandDarker: string; // stop du dégradé du Live
  brandDarkest: string; // stop du dégradé du Live
  onBrandText: string; // texte posé SUR un aplat de marque (blanc ou sombre selon luminance)
  textContrastAdjusted: boolean; // la couleur brute ne passait pas en texte → assombrie
};

// Dérive une charte cohérente et LISIBLE à partir d'UNE couleur de marque. La couleur exacte
// reste pour les aplats (`brand`) ; le texte utilise `brandDeep`, assombrie si besoin, et on
// SIGNALE l'ajustement (§5). On ne produit jamais un écran illisible en silence.
export function derivePalette(primary: string): BrandPalette {
  const brand = primary;
  const brandDeep = ensureTextContrast(darken(primary, 0.4));
  return {
    brand,
    brandDeep,
    brandSoft: mixWithWhite(primary, 0.88),
    brandDarker: darken(brandDeep, 0.15),
    brandDarkest: darken(brandDeep, 0.3),
    onBrandText:
      contrastRatio(brand, WHITE) >= contrastRatio(brand, NEAR_BLACK) ? WHITE : NEAR_BLACK,
    // La couleur brute serait-elle illisible en texte sur blanc ?
    textContrastAdjusted: contrastRatio(primary, WHITE) < TEXT_AA,
  };
}
