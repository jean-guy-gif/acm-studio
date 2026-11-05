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

  it('ouvre le dossier acquéreur par son jeton de 43 caractères, et rien d’autre sous /dossier (mission 119)', () => {
    expect(isPublicPath(`/dossier/${'A'.repeat(43)}`)).toBe(true);
    expect(isPublicPath(`/dossier/${'A'.repeat(42)}`)).toBe(false);
    expect(isPublicPath('/dossier')).toBe(false);
    expect(isPublicPath('/dossier/')).toBe(false);
    expect(isPublicPath(`/dossier/${'A'.repeat(43)}/autre`)).toBe(false);
  });

  it('ouvre l’Étude de marché par son jeton de 43 caractères, et rien d’autre (mission 131)', () => {
    expect(isPublicPath(`/etude-de-marche/${'A'.repeat(43)}`)).toBe(true);
    expect(isPublicPath(`/etude-de-marche/${'A'.repeat(44)}`)).toBe(false);
    expect(isPublicPath('/etude-de-marche')).toBe(false);
    expect(isPublicPath('/builder/x/etude-de-marche')).toBe(false);
  });

  it('ouvre /api/version, et rien d’autre sous /api (mission 100)', () => {
    expect(isPublicPath('/api/version')).toBe(true);
    expect(isPublicPath('/api')).toBe(false);
    expect(isPublicPath('/api/version/autre')).toBe(false);
    expect(isPublicPath('/erreurs')).toBe(false);
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
