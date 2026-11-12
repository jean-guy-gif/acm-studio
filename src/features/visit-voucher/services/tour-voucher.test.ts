import { describe, expect, it } from 'vitest';

import { tourVoucherOpen } from '@/features/visit-voucher/services/tour-voucher';

// Mission 154 (point 3) — éteint en production, ouvert sur l'essai, en local et dans les tests.
describe('tourVoucherOpen', () => {
  it('fermé en production, et quand une production ne dit pas son environnement', () => {
    expect(tourVoucherOpen({ VERCEL_ENV: 'production', NODE_ENV: 'production' })).toBe(false);
    expect(tourVoucherOpen({ NODE_ENV: 'production' })).toBe(false);
  });

  it('ouvert sur l’essai (prévisualisation), en local et dans les tests', () => {
    expect(tourVoucherOpen({ VERCEL_ENV: 'preview', NODE_ENV: 'production' })).toBe(true);
    expect(tourVoucherOpen({ NODE_ENV: 'development' })).toBe(true);
    expect(tourVoucherOpen({ NODE_ENV: 'test' })).toBe(true);
  });
});
