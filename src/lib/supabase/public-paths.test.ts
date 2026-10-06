import { describe, expect, it } from 'vitest';

import { isPublicPath } from './public-paths';

describe('isPublicPath', () => {
  it('ouvre la page de confidentialité sans connexion (mission 73)', () => {
    expect(isPublicPath('/confidentialite')).toBe(true);
  });

  it('garde les chemins publics existants', () => {
    expect(isPublicPath('/login')).toBe(true);
    expect(isPublicPath('/auth/confirm')).toBe(true);
    expect(isPublicPath('/design-preview')).toBe(true);
    expect(isPublicPath('/design-preview/app')).toBe(true);
  });

  it('n’ouvre rien d’autre : chemins exacts, jamais un préfixe', () => {
    expect(isPublicPath('/')).toBe(false);
    expect(isPublicPath('/builder')).toBe(false);
    expect(isPublicPath('/live')).toBe(false);
    expect(isPublicPath('/suivi')).toBe(false);
    expect(isPublicPath('/admin')).toBe(false);
    expect(isPublicPath('/confidentialite/autre')).toBe(false);
    expect(isPublicPath('/confidentialite-interne')).toBe(false);
  });
});
