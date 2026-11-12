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

  it('tournée éteinte, hors mandat : la seule visite à venir, jamais plusieurs d’office', () => {
    expect([
      ...initiallyChecked([visit('a', { outside: true }), visit('c', { eligible: false })], null),
    ]).toEqual(['a']);
    expect(
      initiallyChecked([visit('a', { outside: true }), visit('b', { outside: true })], null).size,
    ).toBe(0);
  });

  it('tournée éteinte : la visite d’où l’on vient, seule si elle est hors mandat', () => {
    const checked = initiallyChecked(
      [visit('a'), visit('b', { outside: true }), visit('c', { outside: true, visited: true })],
      'c',
    );
    expect([...checked]).toEqual(['c']);
  });

  it('toutes faites : la seule qui a droit au bon, sinon rien', () => {
    expect([...initiallyChecked([visit('a', { visited: true })], null)]).toEqual(['a']);
    expect(
      initiallyChecked([visit('a', { visited: true }), visit('b', { visited: true })], null).size,
    ).toBe(0);
  });

  it('le bon de la tournée ouvert : toutes les visites à venir, quel que soit leur titre', () => {
    const checked = initiallyChecked(
      [visit('a'), visit('b', { outside: true }), visit('c', { visited: true })],
      null,
      true,
    );
    expect([...checked].sort()).toEqual(['a', 'b']);
  });
});
