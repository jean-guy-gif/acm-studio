import { embeddedFontCssVar, isEmbeddedFontKey } from '@/features/branding/fonts/font-registry';

// Mission 57 jalon 2 — la police retenue devient la typo de TOUT l'outil (parité avec la
// couleur du jalon 1). On surcharge les deux jetons de police à :root ; comme le corps et
// les titres les référencent (`var(--font-sans)` / `var(--font-title)`), l'agence remplace
// la typo produit partout — jusqu'au Live que voit le vendeur.
//
// Sécurité (même esprit que branding-css) : on ne laisse passer qu'une CLÉ connue, mappée
// vers un nom de variable EN DUR. Une clé nulle, inconnue ou hostile → chaîne vide → l'outil
// garde sa typo produit. Aucune valeur libre venue du client n'atteint la feuille de style.
export function brandingFontDeclarations(fontFamily: string | null): string {
  if (!isEmbeddedFontKey(fontFamily)) {
    return '';
  }
  const cssVar = embeddedFontCssVar(fontFamily);
  if (!cssVar) {
    return '';
  }
  return `--font-sans: var(${cssVar}); --font-title: var(${cssVar});`;
}
