import { describe, expect, it } from 'vitest';

import { detectSource } from '@/features/comparable-import/utils/detect-source';

describe('detectSource', () => {
  it('maps known portals', () => {
    expect(detectSource('www.seloger.com')).toBe('SeLoger');
    expect(detectSource('bienici.com')).toBe("Bien'ici");
    expect(detectSource('proprietes.lefigaro.fr')).toBe('Propriétés Le Figaro');
  });

  it('falls back to the normalised domain for unknown portals', () => {
    expect(detectSource('www.example-immo.fr')).toBe('example-immo.fr');
    expect(detectSource('agence.local.test')).toBe('agence.local.test');
  });
});
