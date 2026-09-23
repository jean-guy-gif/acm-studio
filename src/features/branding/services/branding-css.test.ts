import { describe, expect, it } from 'vitest';

import { brandingCssVariables } from '@/features/branding/services/branding-css';
import type { AgencyBranding } from '@/features/branding/types';

const EMPTY: AgencyBranding = {
  brand: null,
  brandDeep: null,
  brandSoft: null,
  brandDarker: null,
  brandDarkest: null,
  onBrandText: null,
  textContrastAdjusted: false,
  logoLightUrl: null,
  logoDarkUrl: null,
  validatedAt: null,
};

describe('brandingCssVariables', () => {
  it('n’écrit QUE les jetons de marque — jamais une couleur sémantique (§6/§10.3)', () => {
    const css = brandingCssVariables({
      ...EMPTY,
      brand: '#a1b2c3',
      brandDeep: '#102030',
      brandSoft: '#f0f4ff',
      brandDarker: '#0a1420',
      brandDarkest: '#050a10',
      onBrandText: '#ffffff',
    });
    // Les six jetons de marque, et RIEN d'autre.
    expect(css).toContain('--color-brand: #a1b2c3;');
    expect(css).toContain('--color-brand-deep: #102030;');
    expect(css).toContain('--color-on-brand: #ffffff;');
    // Aucune trace de couleur fonctionnelle : la charte ne peut pas les toucher.
    expect(css).not.toMatch(/emerald|amber|zinc|red|--color-(?!brand|on-brand)/);
  });

  it('ignore toute valeur non conforme (§3 — couleur = donnée, validée avant le CSS)', () => {
    const css = brandingCssVariables({
      ...EMPTY,
      brand: '#123456',
      // Tentatives d'injection / valeurs invalides : jamais interpolées.
      brandDeep: '#000; } body { display:none' as unknown as string,
      brandSoft: 'red' as unknown as string,
      onBrandText: 'var(--x)' as unknown as string,
    });
    expect(css).toBe('--color-brand: #123456;');
    expect(css).not.toContain('display');
    expect(css).not.toContain('red');
    expect(css).not.toContain('var(');
  });

  it('rien à écrire quand aucune couleur → chaîne vide (défauts produit)', () => {
    expect(brandingCssVariables(EMPTY)).toBe('');
  });
});
