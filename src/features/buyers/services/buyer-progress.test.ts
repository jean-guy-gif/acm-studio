import { describe, expect, it } from 'vitest';

import { NO_PROGRESS, buyerNextStep, buyerSteps } from '@/features/buyers/services/buyer-progress';

// Essai de Jean-Guy (26/10) : les trois étapes d'une fiche, et l'étape suivante sur la liste.
describe('les étapes d’un acquéreur', () => {
  it('sans sélection : tout reste à faire, « Trouver les biens idéaux »', () => {
    const steps = buyerSteps(NO_PROGRESS);
    expect(steps.map((step) => `${step.number} · ${step.title}`)).toEqual([
      '1 · Biens idéaux',
      '2 · Présenter la sélection',
      '3 · Dossier acquéreur',
    ]);
    expect(steps.map((step) => step.available)).toEqual([true, false, false]);
    expect(buyerNextStep('b', NO_PROGRESS)).toEqual({
      label: 'Trouver les biens idéaux',
      href: '/acquereurs/b/biens-ideaux',
      step: 'ideal',
    });
  });

  it('une sélection de trois biens : « Sélection : 3 biens ✓ », puis « Présenter »', () => {
    const facts = { ...NO_PROGRESS, selectionCount: 3 };
    expect(buyerSteps(facts)[0]!.states).toEqual(['Sélection : 3 biens ✓']);
    expect(buyerNextStep('b', facts).label).toBe('Présenter');
  });

  it('présentée : « Créer le lien » ; le lien créé et sa réponse : « Voir sa réponse »', () => {
    const presented = { ...NO_PROGRESS, selectionCount: 3, presentedAt: '2026-10-25T10:00:00Z' };
    expect(buyerSteps(presented)[1]!.states).toEqual(['Présentée le 25/10/2026 ✓']);
    expect(buyerNextStep('b', presented).label).toBe('Créer le lien');
    const answered = { ...presented, linkCreated: true, answeredOnLink: true };
    expect(buyerSteps(answered)[2]!.states).toEqual(['Lien créé ✓', 'Réponse reçue ✓']);
    // Sa réponse reçue, sans visite demandée : « Voir sa réponse ».
    expect(buyerNextStep('b', answered)).toEqual({
      label: 'Voir sa réponse',
      href: '/acquereurs/b#reponses',
      step: 'visits',
    });
  });

  // Essai de Jean-Guy (26/10) : sa réponse reçue, l'étape mise en avant devient « 4 · Visites ».
  it('sa réponse reçue : « 4 · Visites : N visites à organiser », vers Visites', () => {
    const answered = {
      ...NO_PROGRESS,
      selectionCount: 3,
      linkCreated: true,
      answeredOnLink: true,
      visitsToOrganize: 2,
    };
    const steps = buyerSteps(answered);
    expect(steps).toHaveLength(4);
    expect(`${steps[3]!.number} · ${steps[3]!.title}`).toBe('4 · Visites : 2 visites à organiser');
    // Même sans présentation : c'est la visite qui est à faire, plus « Présenter ».
    expect(buyerNextStep('b', answered)).toEqual({
      label: 'Organiser les visites',
      href: '/visites',
      step: 'visits',
    });
    expect(buyerSteps({ ...answered, visitsToOrganize: 1 })[3]!.title).toBe(
      'Visites : 1 visite à organiser',
    );
    // Sans réponse ni visite : trois étapes.
    expect(buyerSteps({ ...NO_PROGRESS, selectionCount: 3 })).toHaveLength(3);
  });
});
