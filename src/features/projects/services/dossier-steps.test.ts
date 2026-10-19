import { describe, expect, it } from 'vitest';

import {
  activeDossierStep,
  dossierSteps,
  nextDossierStep,
  nextDossierStepHref,
} from '@/features/projects/services/dossier-steps';

const ID = '11111111-1111-1111-1111-111111111111';

describe('la barre des étapes d’un dossier (mission 97)', () => {
  it('commence par « Vue d’ensemble », puis les étapes dans l’ordre', () => {
    expect(dossierSteps(ID).map((step) => step.label)).toEqual([
      'Vue d’ensemble',
      'Bien vendeur',
      'Concurrents',
      'Avant le rendez-vous',
      'Live',
    ]);
    expect(dossierSteps(ID)[0].href).toBe(`/builder/${ID}`);
    // Mission 107 — par l'étape de lancement, jamais droit au Live.
    expect(dossierSteps(ID).at(-1)?.href).toBe(`/builder/${ID}/lancer-le-live`);
  });

  it('désigne l’onglet de l’écran affiché, sous-écrans compris', () => {
    const at = (path: string) => activeDossierStep(`/builder/${ID}${path}`, ID);
    expect(at('')).toBe('overview');
    expect(at('/property')).toBe('property');
    expect(at('/comparables')).toBe('competitors');
    expect(at('/comparables/find')).toBe('competitors');
    expect(at('/comparables/abc/edit')).toBe('competitors');
    expect(at('/avant-rendez-vous')).toBe('before');
    expect(at('/conclusion')).toBeNull();
  });
});

describe('un clic dans la liste mène à l’étape à faire', () => {
  const step = (status: string, hasProperty: boolean, exploitableCount: number) =>
    nextDossierStep({ status, hasProperty, exploitableCount });

  it('sans bien vendeur : le bien vendeur', () => {
    expect(step('draft', false, 0)).toBe('property');
    expect(step('draft', false, 5)).toBe('property');
  });

  it('avec le bien, moins de 3 concurrents exploitables : les concurrents', () => {
    expect(step('draft', true, 0)).toBe('competitors');
    expect(step('draft', true, 2)).toBe('competitors');
  });

  it('bien et concurrents réunis : « Avant le rendez-vous »', () => {
    expect(step('draft', true, 3)).toBe('before');
    expect(step('ready_for_meeting', true, 6)).toBe('before');
  });

  it('un dossier déclaré prêt malgré un manque ouvre quand même ce qui manque', () => {
    expect(step('ready_for_meeting', true, 1)).toBe('competitors');
  });

  it('un dossier conclu ouvre sa vue d’ensemble', () => {
    expect(step('meeting_completed', true, 6)).toBe('overview');
  });

  it('donne l’adresse de cette étape', () => {
    const href = (hasProperty: boolean, exploitableCount: number) =>
      nextDossierStepHref(ID, { status: 'draft', hasProperty, exploitableCount });
    expect(href(false, 0)).toBe(`/builder/${ID}/property`);
    expect(href(true, 1)).toBe(`/builder/${ID}/comparables`);
    expect(href(true, 3)).toBe(`/builder/${ID}/avant-rendez-vous`);
  });
});
