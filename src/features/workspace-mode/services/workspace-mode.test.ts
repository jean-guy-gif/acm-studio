import { describe, expect, it } from 'vitest';

import {
  SHARED_NAV,
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

  it('Acquéreur : Acquéreurs, Biens idéaux, Prospection ; Visites n’existe pas encore', () => {
    expect(navForMode('buyer').map((item) => item.label)).toEqual([
      'Acquéreurs',
      'Biens idéaux',
      'Prospection',
    ]);
    expect(navForMode('buyer').map((item) => item.href)).toEqual([
      '/acquereurs',
      '/biens-ideaux',
      '/prospection',
    ]);
  });

  it('communs aux deux modes : Administration et Aide', () => {
    expect(SHARED_NAV.map((item) => item.href)).toEqual(['/admin', '/bienvenue']);
  });

  it('une page d’un mode désigne son mode ; une page commune ne désigne rien', () => {
    expect(modeForPath('/acquereurs')).toBe('buyer');
    expect(modeForPath('/acquereurs/abc/')).toBe('buyer');
    expect(modeForPath('/biens-ideaux')).toBe('buyer');
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
