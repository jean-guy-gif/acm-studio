import { describe, expect, it } from 'vitest';

import { initiallyChecked } from '@/features/visit-voucher/services/voucher-defaults';

// Mission 154 — les biens de la tournée cochés d'office.
const visit = (
  visitId: string,
  over: Partial<Parameters<typeof initiallyChecked>[0][number]> = {},
) => ({
  visitId,
  eligible: true,
  outside: false,
  visited: false,
  ...over,
});

describe('initiallyChecked', () => {
  it('toutes les visites à venir sous mandat, jamais une visite hors mandat avec elles', () => {
    const checked = initiallyChecked(
      [visit('a'), visit('b'), visit('c', { outside: true }), visit('d', { visited: true })],
      null,
    );
    expect([...checked].sort()).toEqual(['a', 'b']);
  });

  it('sans visite à venir sous mandat : toutes celles hors mandat', () => {
    const checked = initiallyChecked(
      [
        visit('a', { outside: true }),
        visit('b', { outside: true }),
        visit('c', { eligible: false }),
      ],
      null,
    );
    expect([...checked].sort()).toEqual(['a', 'b']);
  });

  it('la visite d’où l’on vient décide du régime, et reste cochée même faite', () => {
    const checked = initiallyChecked(
      [visit('a'), visit('b', { outside: true }), visit('c', { outside: true, visited: true })],
      'c',
    );
    expect([...checked].sort()).toEqual(['b', 'c']);
  });

  it('toutes faites : la seule qui a droit au bon, sinon rien', () => {
    expect([...initiallyChecked([visit('a', { visited: true })], null)]).toEqual(['a']);
    expect(
      initiallyChecked([visit('a', { visited: true }), visit('b', { visited: true })], null).size,
    ).toBe(0);
  });
});
