import { describe, expect, it } from 'vitest';

import {
  VIVRE_ICI_TOUT_BIEN_OUVERT,
  livingHereEverywhereOpen,
} from '@/features/academia/services/living-here-switch';

// Mission 156 — éteint en production tant que le texte A3 de `/confidentialite` n'est pas en ligne
// (décision de Jean-Guy, 16/11) ; ouvert sur l'essai, en local et dans les tests.
describe('livingHereEverywhereOpen', () => {
  it('éteint : fermé en production par défaut', () => {
    expect(VIVRE_ICI_TOUT_BIEN_OUVERT).toBe(false);
    expect(livingHereEverywhereOpen({ VERCEL_ENV: 'production', NODE_ENV: 'production' })).toBe(
      false,
    );
  });

  it('allumé : ouvert en production', () => {
    expect(
      livingHereEverywhereOpen({ VERCEL_ENV: 'production', NODE_ENV: 'production' }, true),
    ).toBe(true);
  });

  it('éteint : seuls l’essai, le local et les tests l’ouvrent ; un environnement muet reste fermé', () => {
    const off = (env: { VERCEL_ENV?: string; NODE_ENV?: string }) =>
      livingHereEverywhereOpen(env, false);
    expect(off({ VERCEL_ENV: 'production', NODE_ENV: 'production' })).toBe(false);
    expect(off({ NODE_ENV: 'production' })).toBe(false);
    expect(off({})).toBe(false);
    expect(off({ NODE_ENV: 'staging' })).toBe(false);
    expect(off({ VERCEL_ENV: 'preview', NODE_ENV: 'production' })).toBe(true);
    expect(off({ NODE_ENV: 'development' })).toBe(true);
    expect(off({ NODE_ENV: 'test' })).toBe(true);
  });
});
