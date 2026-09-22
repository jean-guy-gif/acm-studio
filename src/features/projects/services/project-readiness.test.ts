import { describe, expect, it } from 'vitest';

import {
  isProjectReady,
  MIN_READY_COMPARABLES,
} from '@/features/projects/services/project-readiness';

// MISSION 52 §7 — la readiness est le SEUL déclencheur de la bascule automatique. Ces
// tests fixent le critère (les tests de flux — Live = prêts seulement, filtre « Prêts »,
// rester modifiable — passent par l'essai à l'écran d'une traite).
describe('isProjectReady — le critère de bascule (§7.1 / §7.2)', () => {
  it('un dossier complet est prêt : il basculera dans le Live', () => {
    expect(
      isProjectReady({
        hasProperty: true,
        exploitableCount: MIN_READY_COMPARABLES,
        hasPositioning: true,
      }),
    ).toBe(true);
  });

  it('un dossier incomplet n’est PAS prêt tout seul — chaque critère manquant suffit à bloquer', () => {
    // Bien vendeur manquant.
    expect(isProjectReady({ hasProperty: false, exploitableCount: 5, hasPositioning: true })).toBe(
      false,
    );
    // Trop peu de concurrents exploitables (2 < 3).
    expect(isProjectReady({ hasProperty: true, exploitableCount: 2, hasPositioning: true })).toBe(
      false,
    );
    // Fourchette non validée.
    expect(
      isProjectReady({
        hasProperty: true,
        exploitableCount: MIN_READY_COMPARABLES,
        hasPositioning: false,
      }),
    ).toBe(false);
  });

  it('le seuil est exactement 3 concurrents exploitables', () => {
    const base = { hasProperty: true, hasPositioning: true };
    expect(isProjectReady({ ...base, exploitableCount: 2 })).toBe(false);
    expect(isProjectReady({ ...base, exploitableCount: 3 })).toBe(true);
  });
});
