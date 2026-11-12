import { describe, expect, it } from 'vitest';

import {
  BON_TOURNEE_OUVERT,
  tourVoucherOpen,
} from '@/features/visit-voucher/services/tour-voucher';

// Mission 154 (point 3) — éteint en production sur l'ordre de Jean-Guy (12/11) ; il ne s'ouvre que
// sur l'essai, en local et dans les tests.
describe('tourVoucherOpen', () => {
  it('éteint : fermé en production par défaut', () => {
    expect(BON_TOURNEE_OUVERT).toBe(false);
    expect(tourVoucherOpen({ VERCEL_ENV: 'production', NODE_ENV: 'production' })).toBe(false);
  });

  it('allumé : ouvert en production', () => {
    expect(tourVoucherOpen({ VERCEL_ENV: 'production', NODE_ENV: 'production' }, true)).toBe(true);
  });

  it('éteint : fermé en production, et quand une production ne dit pas son environnement', () => {
    const off = (env: { VERCEL_ENV?: string; NODE_ENV?: string }) => tourVoucherOpen(env, false);
    expect(off({ VERCEL_ENV: 'production', NODE_ENV: 'production' })).toBe(false);
    expect(off({ NODE_ENV: 'production' })).toBe(false);
    expect(off({})).toBe(false);
    expect(off({ NODE_ENV: 'staging' })).toBe(false);
    expect(off({ VERCEL_ENV: 'preview', NODE_ENV: 'production' })).toBe(true);
    expect(off({ NODE_ENV: 'development' })).toBe(true);
    expect(off({ NODE_ENV: 'test' })).toBe(true);
  });
});
