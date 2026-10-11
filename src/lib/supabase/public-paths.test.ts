import { describe, expect, it } from 'vitest';

import { isPublicPath } from './public-paths';

describe('isPublicPath', () => {
  it('ouvre la page de confidentialité sans connexion (mission 73)', () => {
    expect(isPublicPath('/confidentialite')).toBe(true);
  });

  it('garde les chemins publics existants', () => {
    expect(isPublicPath('/login')).toBe(true);
    expect(isPublicPath('/auth/confirm')).toBe(true);
  });

  it('n’ouvre rien d’autre : chemins exacts, jamais un préfixe', () => {
    expect(isPublicPath('/')).toBe(false);
    expect(isPublicPath('/builder')).toBe(false);
    expect(isPublicPath('/live')).toBe(false);
    expect(isPublicPath('/suivi')).toBe(false);
    expect(isPublicPath('/admin')).toBe(false);
    expect(isPublicPath('/confidentialite/autre')).toBe(false);
    expect(isPublicPath('/confidentialite-interne')).toBe(false);
    // Mission 91 — le harnais de revue design n'existe plus : plus aucun préfixe public.
    expect(isPublicPath('/design-preview')).toBe(false);
    expect(isPublicPath('/design-preview/app')).toBe(false);
  });

  // Mission 88 — « Mot de passe oublié » se demande sans être connecté ; choisir le nouveau mot
  // de passe, accepter une invitation ou créer une agence exigent une session.
  it('ouvre la demande de réinitialisation, et elle seule', () => {
    expect(isPublicPath('/mot-de-passe-oublie')).toBe(true);
    expect(isPublicPath('/nouveau-mot-de-passe')).toBe(false);
    expect(isPublicPath('/accept-invitation')).toBe(false);
    expect(isPublicPath('/onboarding')).toBe(false);
  });
});
