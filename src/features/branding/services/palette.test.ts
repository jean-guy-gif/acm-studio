import { describe, expect, it } from 'vitest';

import { contrastRatio, derivePalette, isValidHex } from '@/features/branding/services/palette';

describe('isValidHex (§3 — une couleur est une donnée, validée avant le CSS)', () => {
  it('accepte #RRGGBB, rejette tout le reste', () => {
    expect(isValidHex('#3EA9FF')).toBe(true);
    expect(isValidHex('#00527a')).toBe(true);
    expect(isValidHex('#fff')).toBe(false); // pas 6 chiffres
    expect(isValidHex('red')).toBe(false);
    expect(isValidHex('#3EA9FF; color: red')).toBe(false); // injection
    expect(isValidHex('var(--x)')).toBe(false);
    expect(isValidHex(null)).toBe(false);
    expect(isValidHex(undefined)).toBe(false);
  });
});

describe('derivePalette (§5 — lisible, sans jamais casser en silence)', () => {
  it('produit une palette entièrement en #RRGGBB valides', () => {
    const p = derivePalette('#3ea9ff');
    for (const value of [
      p.brand,
      p.brandDeep,
      p.brandSoft,
      p.brandDarker,
      p.brandDarkest,
      p.onBrandText,
    ]) {
      expect(isValidHex(value)).toBe(true);
    }
  });

  it('garde la couleur EXACTE pour les aplats (brand)', () => {
    expect(derivePalette('#ffe066').brand).toBe('#ffe066');
  });

  it('une couleur claire au contraste insuffisant est ajustée POUR LE TEXTE, et signalée', () => {
    // Jaune pâle : illisible en texte sur blanc.
    const pale = derivePalette('#ffe066');
    expect(pale.textContrastAdjusted).toBe(true);
    // brandDeep (le texte) passe le contraste AA sur blanc…
    expect(contrastRatio(pale.brandDeep, '#ffffff')).toBeGreaterThanOrEqual(4.5);
    // …tandis que l'aplat garde la couleur exacte.
    expect(pale.brand).toBe('#ffe066');
    // Sur un aplat pâle, le texte posé dessus est sombre.
    expect(pale.onBrandText).toBe('#0b1220');
  });

  it('une couleur déjà foncée n’est pas signalée comme ajustée', () => {
    const deep = derivePalette('#00527a'); // bleu profond, lisible en texte
    expect(deep.textContrastAdjusted).toBe(false);
    expect(contrastRatio(deep.brandDeep, '#ffffff')).toBeGreaterThanOrEqual(4.5);
    // Texte blanc sur un aplat foncé.
    expect(deep.onBrandText).toBe('#ffffff');
  });
});
