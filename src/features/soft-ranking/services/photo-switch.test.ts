import { describe, expect, it } from 'vitest';

import {
  listingPhotosRead,
  PHOTOS_DES_ANNONCES_LUES,
} from '@/features/soft-ranking/services/photo-switch';

// Lancement, mission 9 — la lecture des photos des annonces part ÉTEINTE en production : la page
// de confidentialité validée ne parle que des descriptions des annonces. L'allumer est un geste de
// Jean-Guy.
describe('la lecture des photos des annonces', () => {
  it('est éteinte en production tant que Jean-Guy ne l’allume pas', () => {
    expect(PHOTOS_DES_ANNONCES_LUES).toBe(false);
    expect(listingPhotosRead({ VERCEL_ENV: 'production', NODE_ENV: 'production' })).toBe(false);
  });

  it('un environnement qui ne se dit pas reste éteint (liste d’autorisation)', () => {
    expect(listingPhotosRead({})).toBe(false);
    expect(listingPhotosRead({ VERCEL_ENV: 'autre' })).toBe(false);
  });

  it('ouverte sur l’essai, en local et dans les tests ; allumée, partout', () => {
    expect(listingPhotosRead({ VERCEL_ENV: 'preview', NODE_ENV: 'production' })).toBe(true);
    expect(listingPhotosRead({ NODE_ENV: 'development' })).toBe(true);
    expect(listingPhotosRead({ NODE_ENV: 'test' })).toBe(true);
    expect(listingPhotosRead({ VERCEL_ENV: 'production' }, true)).toBe(true);
  });
});
