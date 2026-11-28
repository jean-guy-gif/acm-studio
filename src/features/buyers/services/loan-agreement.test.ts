import { describe, expect, it } from 'vitest';

import { suggestsValidated } from '@/features/buyers/services/loan-agreement';

// Jean-Guy (28/11) — « Accord de principe obtenu : passer le financement en « Validé » ? » : une
// proposition, jamais un changement de lui-même, et rien dans l'autre sens.
describe('« Passer en Validé »', () => {
  it('avec un prêt, l’accord de principe noté, un financement pas encore validé : proposé', () => {
    for (const financing of ['in_progress', 'unknown'] as const) {
      expect(suggestsValidated({ mode: 'loan', agreement: true, financing })).toBe(true);
    }
  });

  it('déjà validé, sans accord, l’accord pas encore dit, ou sans prêt : rien', () => {
    expect(suggestsValidated({ mode: 'loan', agreement: true, financing: 'validated' })).toBe(
      false,
    );
    expect(suggestsValidated({ mode: 'loan', agreement: false, financing: 'in_progress' })).toBe(
      false,
    );
    expect(suggestsValidated({ mode: 'loan', agreement: null, financing: 'unknown' })).toBe(false);
    for (const mode of ['cash', 'not_said'] as const) {
      expect(suggestsValidated({ mode, agreement: true, financing: 'in_progress' })).toBe(false);
    }
  });
});
