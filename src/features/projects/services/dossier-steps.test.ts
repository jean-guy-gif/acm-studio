import { describe, expect, it } from 'vitest';

import {
  activeDossierStep,
  dossierSteps,
  nextDossierStep,
  nextDossierStepHref,
} from '@/features/projects/services/dossier-steps';
import { nextDossierAction, showsNextAction } from '@/features/projects/services/dossier-steps';

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

// Mission 110 — « Étape suivante » : un seul bouton principal, qui dit quoi faire maintenant.
describe('l’étape suivante', () => {
  const state = {
    status: 'draft',
    hasProperty: true,
    exploitableCount: 5,
    hasDecision: true,
    liveStarted: false,
    liveEnded: false,
  };
  it('suit le parcours, dans l’ordre', () => {
    expect(nextDossierAction('p1', { ...state, hasProperty: false }).label).toBe(
      'Saisir le bien vendeur',
    );
    expect(nextDossierAction('p1', { ...state, exploitableCount: 2 }).label).toBe(
      'Chercher les concurrents',
    );
    expect(nextDossierAction('p1', { ...state, hasDecision: false }).label).toBe(
      'Décider votre prix',
    );
    expect(nextDossierAction('p1', state)).toEqual({
      key: 'launch',
      label: 'Lancer le Live',
      href: '/builder/p1/lancer-le-live',
    });
    expect(nextDossierAction('p1', { ...state, liveStarted: true }).label).toBe(
      'Reprendre le Live',
    );
    expect(nextDossierAction('p1', { ...state, liveStarted: true, liveEnded: true }).label).toBe(
      'Conclure le rendez-vous',
    );
    expect(nextDossierAction('p1', { ...state, status: 'meeting_completed' }).label).toBe(
      'Voir le Suivi',
    );
  });
  it('ne se répète pas sur l’écran de l’étape, ni sur la fiche du bien', () => {
    const decide = nextDossierAction('p1', { ...state, hasDecision: false });
    expect(showsNextAction('/builder/p1/avant-rendez-vous', 'p1', decide)).toBe(false);
    // Mission 143 (B4) — la Vue d'ensemble porte son propre bloc « Prochaine étape ».
    expect(showsNextAction('/builder/p1', 'p1', decide)).toBe(false);
    expect(showsNextAction('/builder/p1/property', 'p1', decide)).toBe(false);
    const find = nextDossierAction('p1', { ...state, exploitableCount: 0 });
    expect(showsNextAction('/builder/p1/comparables/find', 'p1', find)).toBe(false);
    expect(showsNextAction('/builder/p1/comparables', 'p1', find)).toBe(true);
  });
});
