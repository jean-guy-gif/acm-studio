import { describe, expect, it } from 'vitest';

import {
  isOutcomeLockError,
  OUTCOME_LOCKED,
  outcomeChangeRefusal,
} from '@/features/mandate-life/services/outcome-lock';
import { NO_MANDATE_LIFE } from '@/features/mandate-life/types';

// Lot C (gardien-sql, 28/11) — sous compromis ou vendu, l'issue reste « mandat signé » : le
// serveur le dit avant d'écrire, et reconnaît le refus de la base s'il arrive quand même.
describe('l’issue d’un mandat sous compromis ou vendu', () => {
  const compromise = {
    ...NO_MANDATE_LIFE,
    compromiseSignedOn: '2026-11-25',
    deedPlannedOn: '2027-01-15',
    buyerOrigin: 'outside' as const,
  };

  it('refusée hors « signé », avec ce qu’il faut faire d’abord', () => {
    expect(outcomeChangeRefusal(compromise, 'sold_elsewhere')).toBe(OUTCOME_LOCKED.compromise);
    expect(outcomeChangeRefusal(compromise, 'follow_up')).toBe(OUTCOME_LOCKED.compromise);
    expect(
      outcomeChangeRefusal(
        { ...compromise, deedSignedOn: '2027-01-15', salePrice: 1_560_000 },
        'withdrawn',
      ),
    ).toBe(OUTCOME_LOCKED.sale);
    expect(OUTCOME_LOCKED.compromise).toMatch(/Le compromis est tombé/);
  });

  it('permise : « signé » de nouveau, ou sans compromis ni vente', () => {
    expect(outcomeChangeRefusal(compromise, 'signed')).toBeNull();
    expect(
      outcomeChangeRefusal({ ...NO_MANDATE_LIFE, endsOn: '2027-01-28' }, 'sold_elsewhere'),
    ).toBeNull();
    expect(outcomeChangeRefusal(undefined, 'follow_up')).toBeNull();
  });

  it('le refus de la base se reconnaît, une autre erreur non', () => {
    expect(
      isOutcomeLockError({
        code: '23514',
        message: "un compromis ou une vente est noté, l'issue reste « mandat signé »",
      }),
    ).toBe(true);
    expect(isOutcomeLockError({ code: '23514', message: 'autre contrainte' })).toBe(false);
    expect(isOutcomeLockError({ code: '42501', message: "l'issue reste" })).toBe(false);
    expect(isOutcomeLockError(null)).toBe(false);
  });
});
