import { describe, expect, it } from 'vitest';

import {
  listingPhotosRead,
  PHOTOS_DES_ANNONCES_LUES,
  photosForSearch,
} from '@/features/soft-ranking/services/photo-switch';

// Lancement, mission 9 — la lecture des photos des annonces part ÉTEINTE : la page de
// confidentialité validée ne parle que des descriptions des annonces. L'allumer est un geste de
// Jean-Guy. Éteinte, aucune photo d'une vraie annonce n'est chargée ni envoyée, nulle part.
const PRODUCTION = { VERCEL_ENV: 'production', NODE_ENV: 'production' };
const ESSAI = { VERCEL_ENV: 'preview', NODE_ENV: 'production' };

describe('la lecture des photos des annonces', () => {
  it('est éteinte en production, démo comprise, tant que Jean-Guy ne l’allume pas', () => {
    expect(PHOTOS_DES_ANNONCES_LUES).toBe(false);
    expect(listingPhotosRead(false, PRODUCTION)).toBe(false);
    expect(listingPhotosRead(true, PRODUCTION)).toBe(false);
  });

  it('éteinte, une vraie agence ne l’a nulle part : ni sur l’essai, ni en local', () => {
    expect(listingPhotosRead(false, ESSAI)).toBe(false);
    expect(listingPhotosRead(false, { NODE_ENV: 'development' })).toBe(false);
    expect(listingPhotosRead(false, { NODE_ENV: 'test' })).toBe(false);
  });

  it('éteinte, la démo la voit, simulée, sur l’essai, en local et dans les tests seulement', () => {
    expect(listingPhotosRead(true, ESSAI)).toBe(true);
    expect(listingPhotosRead(true, { NODE_ENV: 'development' })).toBe(true);
    expect(listingPhotosRead(true, { NODE_ENV: 'test' })).toBe(true);
    // Un environnement qui ne se dit pas reste éteint (liste d'autorisation).
    expect(listingPhotosRead(true, {})).toBe(false);
    expect(listingPhotosRead(true, { VERCEL_ENV: 'autre' })).toBe(false);
  });

  it('à la première recherche seulement : « Chercher encore » ne relit aucune photo', () => {
    expect(photosForSearch({ demo: true, resumed: false }, ESSAI)).toBe(true);
    expect(photosForSearch({ demo: true, resumed: true }, ESSAI)).toBe(false);
    expect(photosForSearch({ demo: false, resumed: false }, PRODUCTION, true)).toBe(true);
    expect(photosForSearch({ demo: false, resumed: true }, PRODUCTION, true)).toBe(false);
    expect(photosForSearch({ demo: false, resumed: false }, PRODUCTION)).toBe(false);
  });

  it('allumée, partout', () => {
    expect(listingPhotosRead(false, PRODUCTION, true)).toBe(true);
    expect(listingPhotosRead(true, PRODUCTION, true)).toBe(true);
  });
});
