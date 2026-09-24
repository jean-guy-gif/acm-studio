import { describe, expect, it } from 'vitest';

import {
  EMBEDDED_FONTS,
  embeddedFontCssVar,
  isEmbeddedFontKey,
} from '@/features/branding/fonts/font-registry';

describe('font-registry (Mission 57)', () => {
  it('la liste embarquée est courte et sobre (5 à 6 polices)', () => {
    // « Chercher la qualité, pas la couverture » : une liste courte se parcourt d'un œil.
    expect(EMBEDDED_FONTS.length).toBeGreaterThanOrEqual(5);
    expect(EMBEDDED_FONTS.length).toBeLessThanOrEqual(6);
  });

  it('chaque police a une clé slug et une variable CSS --font-*', () => {
    for (const font of EMBEDDED_FONTS) {
      expect(font.key).toMatch(/^[a-z0-9-]+$/);
      expect(font.cssVar).toMatch(/^--font-[a-z0-9-]+$/);
    }
  });

  it('isEmbeddedFontKey n’accepte QUE les clés de la liste', () => {
    for (const font of EMBEDDED_FONTS) {
      expect(isEmbeddedFontKey(font.key)).toBe(true);
    }
    // Ni null, ni valeur libre, ni tentative d'injection.
    expect(isEmbeddedFontKey(null)).toBe(false);
    expect(isEmbeddedFontKey('')).toBe(false);
    expect(isEmbeddedFontKey('helvetica')).toBe(false);
    expect(isEmbeddedFontKey('inter; } body { display: none')).toBe(false);
    expect(isEmbeddedFontKey(42)).toBe(false);
  });

  it('embeddedFontCssVar mappe une clé connue vers sa variable, sinon null', () => {
    expect(embeddedFontCssVar('montserrat')).toBe('--font-montserrat');
    expect(embeddedFontCssVar('work-sans')).toBe('--font-work-sans');
    expect(embeddedFontCssVar('inconnue')).toBeNull();
    expect(embeddedFontCssVar(null)).toBeNull();
  });
});
