import { describe, expect, it } from 'vitest';

import {
  accountMenuFor,
  effectiveMode,
  homeForMode,
  modeForPath,
  navForMode,
} from '@/features/workspace-mode/services/workspace-mode';
import { parseWorkspaceMode, WORKSPACE_MODE_LABELS } from '@/features/workspace-mode/types';

// Mission 118 (partie A) — l'interrupteur ne change que le menu : le mode Vendeur est le menu
// d'aujourd'hui, le mode Acquéreur a ses entrées, et une page d'un mode impose son mode.
describe('le mode du menu, Vendeur ou Acquéreur', () => {
  it('Vendeur : le menu d’aujourd’hui, à l’identique', () => {
    expect(navForMode('seller').map((item) => item.label)).toEqual([
      'Préparation',
      'Live',
      'Suivi',
      'Prospection',
    ]);
  });

  // Mission 130 B — « Biens idéaux » quitte le menu (la même liste que « Acquéreurs »).
  it('Acquéreur : Acquéreurs, Visites (M119), Prospection', () => {
    expect(navForMode('buyer').map((item) => item.label)).toEqual([
      'Acquéreurs',
      'Visites',
      'Prospection',
    ]);
    expect(navForMode('buyer').map((item) => item.href)).toEqual([
      '/acquereurs',
      '/visites',
      '/prospection',
    ]);
  });

  // Mission 125 — le menu de la carte du conseiller : tout ce qui n'est pas le travail.
  it('la carte : Mon profil, Administration, Aide ; Ma démo à la démo ; Erreurs à un opérateur', () => {
    const labels = (demo: boolean, operator: boolean) =>
      accountMenuFor({ demo, operator }).map((link) => link.label);
    expect(labels(false, false)).toEqual(['Mon profil', 'Administration', 'Aide']);
    expect(labels(true, false)).toEqual(['Mon profil', 'Administration', 'Aide', 'Ma démo']);
    expect(labels(false, true)).toEqual(['Mon profil', 'Administration', 'Aide', 'Erreurs']);
    expect(accountMenuFor({ demo: true, operator: true }).map((link) => link.href)).toEqual([
      '/profil',
      '/admin',
      '/bienvenue',
      '/ma-demo',
      '/erreurs',
    ]);
  });

  it('aucune entrée de la carte n’est un des quatre espaces, dans aucun mode', () => {
    const spaces = [...navForMode('seller'), ...navForMode('buyer')].map((item) => item.href);
    for (const link of accountMenuFor({ demo: true, operator: true })) {
      expect(spaces).not.toContain(link.href);
    }
  });

  it('une page d’un mode désigne son mode ; une page commune ne désigne rien', () => {
    expect(modeForPath('/acquereurs')).toBe('buyer');
    expect(modeForPath('/acquereurs/abc/')).toBe('buyer');
    expect(modeForPath('/acquereurs/abc/biens-ideaux')).toBe('buyer');
    expect(modeForPath('/visites')).toBe('buyer');
    expect(modeForPath('/builder/123/avant-rendez-vous')).toBe('seller');
    expect(modeForPath('/live')).toBe('seller');
    expect(modeForPath('/suivi')).toBe('seller');
    for (const shared of [
      '/prospection',
      '/prospection/tournee',
      '/admin',
      '/bienvenue',
      '/profil',
      '/ma-demo',
      '/erreurs',
    ]) {
      expect(modeForPath(shared)).toBeNull();
    }
  });

  it('le mode affiché : celui de la page, sinon le mode mémorisé', () => {
    expect(effectiveMode('seller', '/acquereurs')).toBe('buyer');
    expect(effectiveMode('buyer', '/builder')).toBe('seller');
    expect(effectiveMode('buyer', '/prospection')).toBe('buyer');
    expect(effectiveMode('seller', '/admin')).toBe('seller');
  });

  it('l’interrupteur ouvre la première page du mode', () => {
    expect(homeForMode('seller')).toBe('/builder');
    expect(homeForMode('buyer')).toBe('/acquereurs');
  });

  it('une valeur inconnue vaut Vendeur ; les deux mots', () => {
    expect(parseWorkspaceMode('buyer')).toBe('buyer');
    expect(parseWorkspaceMode(undefined)).toBe('seller');
    expect(parseWorkspaceMode('landlord')).toBe('seller');
    expect(WORKSPACE_MODE_LABELS).toEqual({ seller: 'Vendeur', buyer: 'Acquéreur' });
  });
});
