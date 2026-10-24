import { describe, expect, it } from 'vitest';

import {
  buyerStatusActions,
  isBuyerStatusMove,
  nextBuyerStatus,
} from '@/features/buyers/services/buyer-status';

// Mission 117 — le statut avance un cran à la fois, revient d'un cran ; « abandonné » depuis la
// recherche ou la visite, et reprend la recherche.
describe('le statut d’un acquéreur, un cran à la fois', () => {
  it('en recherche → en visite → a acheté', () => {
    expect(nextBuyerStatus('searching', 'forward')).toBe('visiting');
    expect(nextBuyerStatus('visiting', 'forward')).toBe('bought');
    expect(nextBuyerStatus('bought', 'forward')).toBeNull();
  });

  it('jamais deux crans : de la recherche, pas d’achat direct', () => {
    expect(nextBuyerStatus('searching', 'forward')).not.toBe('bought');
    expect(buyerStatusActions('searching').map((action) => action.label)).toEqual([
      'En visite',
      'Abandonné',
    ]);
  });

  it('retour d’un cran', () => {
    expect(nextBuyerStatus('visiting', 'back')).toBe('searching');
    expect(nextBuyerStatus('bought', 'back')).toBe('visiting');
    expect(nextBuyerStatus('searching', 'back')).toBeNull();
  });

  it('abandonné depuis la recherche ou la visite, jamais après un achat ; il reprend la recherche', () => {
    expect(nextBuyerStatus('searching', 'abandon')).toBe('abandoned');
    expect(nextBuyerStatus('visiting', 'abandon')).toBe('abandoned');
    expect(nextBuyerStatus('bought', 'abandon')).toBeNull();
    expect(nextBuyerStatus('abandoned', 'abandon')).toBeNull();
    expect(nextBuyerStatus('abandoned', 'back')).toBe('searching');
    expect(buyerStatusActions('abandoned')).toEqual([
      { move: 'back', label: 'Reprendre la recherche', primary: false },
    ]);
  });

  it('un mouvement hors liste n’est pas un mouvement', () => {
    expect(isBuyerStatusMove('forward')).toBe(true);
    expect(isBuyerStatusMove('bought')).toBe(false);
    expect(isBuyerStatusMove(undefined)).toBe(false);
  });
});
