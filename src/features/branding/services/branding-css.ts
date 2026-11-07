import { ensureTextContrast, isValidHex } from '@/features/branding/services/palette';
import type { AgencyBranding } from '@/features/branding/types';

// Mission 55 §3 — une couleur venue de la base est une DONNÉE, jamais une instruction.
// On produit les surcharges de variables CSS de marque en faisant passer CHAQUE valeur par
// isValidHex : une valeur non conforme est simplement IGNORÉE (jamais interpolée dans le
// CSS). On ne touche QUE les jetons `brand*` / `on-brand` — jamais une couleur sémantique
// (emerald/amber/zinc/red vivent hors des jetons, donc hors d'atteinte par construction).
// Uniquement les clés COULEUR (jamais textContrastAdjusted / logos / validatedAt).
type ColorKey =
  'brand' | 'brandDeep' | 'brandSoft' | 'brandDarker' | 'brandDarkest' | 'onBrandText';

const TOKEN_MAP: [ColorKey, string][] = [
  ['brand', '--color-brand'],
  ['brandDeep', '--color-brand-deep'],
  ['brandSoft', '--color-brand-soft'],
  ['brandDarker', '--color-brand-darker'],
  ['brandDarkest', '--color-brand-darkest'],
  ['onBrandText', '--color-on-brand'],
];

// Les déclarations CSS (sans le sélecteur), ex. « --color-brand: #abcdef; --color-brand-deep: … ».
// Vide si aucune couleur valide → aucune surcharge, l'outil garde ses défauts.
export function brandingCssVariables(branding: Pick<AgencyBranding, ColorKey>): string {
  const declarations: string[] = [];
  for (const [key, cssVar] of TOKEN_MAP) {
    const value = branding[key];
    if (isValidHex(value)) {
      // Mission 143 — la couleur des boutons pleins, sous un texte blanc : relue à 4,5 : 1 au moins,
      // même si la valeur gardée en base ne l'était pas (une charte d'avant, une saisie directe).
      const safe = key === 'brandDeep' ? ensureTextContrast(value) : value;
      declarations.push(`${cssVar}: ${safe};`);
    }
  }
  return declarations.join(' ');
}
