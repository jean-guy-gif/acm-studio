import { describe, expect, it } from 'vitest';

import { brandingFontDeclarations } from '@/features/branding/services/branding-typography';

describe('brandingFontDeclarations (Mission 57)', () => {
  it('une police embarquée devient la typo du corps ET des titres', () => {
    expect(brandingFontDeclarations('inter')).toBe(
      '--font-sans: var(--font-inter); --font-title: var(--font-inter);',
    );
  });

  it('aucune police (null) → aucune surcharge : l’outil garde sa typo produit', () => {
    expect(brandingFontDeclarations(null)).toBe('');
  });

  it('une clé inconnue ou hostile ne produit RIEN (aucune valeur libre dans le CSS)', () => {
    expect(brandingFontDeclarations('')).toBe('');
    expect(brandingFontDeclarations('comic-sans')).toBe('');
    // Tentative d'injection : refusée en amont par isEmbeddedFontKey → chaîne vide.
    expect(brandingFontDeclarations('inter); } body { display: none; }')).toBe('');
  });
});
