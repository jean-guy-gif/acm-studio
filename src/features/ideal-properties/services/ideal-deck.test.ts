import { describe, expect, it } from 'vitest';

import { deckPosition } from '@/features/ideal-properties/services/ideal-deck';

// La refonte, lot C — « un bien à la fois » : le bien qu'on regarde.
describe('le rang du bien qu’on regarde', () => {
  const order = ['a', 'b', 'c', 'd'];

  it('le premier bien encore ouvert, à partir du rang courant', () => {
    expect(deckPosition(order, 0, new Set(order))).toBe(0);
    expect(deckPosition(order, 1, new Set(order))).toBe(1);
  });

  it('un bien retenu ou écarté entre-temps est passé', () => {
    // « a » vient d'être proposé : il n'est plus ouvert, le rang avance à « b ».
    expect(deckPosition(order, 1, new Set(['b', 'c', 'd']))).toBe(1);
    // « b » a été retenu depuis sa fiche avant qu'on y arrive : on passe à « c ».
    expect(deckPosition(order, 1, new Set(['c', 'd']))).toBe(2);
  });

  it('un bien rouvert derrière soi ne fait pas revenir en arrière', () => {
    expect(deckPosition(order, 2, new Set(['a', 'c', 'd']))).toBe(2);
  });

  it('tout est vu : la fin du parcours', () => {
    expect(deckPosition(order, 4, new Set(order))).toBe(4);
    expect(deckPosition(order, 2, new Set(['a', 'b']))).toBe(4);
    expect(deckPosition([], 0, new Set())).toBe(0);
    expect(deckPosition(order, -3, new Set(order))).toBe(0);
  });
});
