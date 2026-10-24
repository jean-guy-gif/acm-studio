import { describe, expect, it } from 'vitest';

import { agencyPriceForBuyer } from '@/features/buyer-presentation/services/agency-price';

// Mission 119 — décision de Jean-Guy, 24/10 : mandat signé → le prix de commercialisation se montre ;
// vendeur à relancer, ou issue inconnue → aucun prix (l'analyse du conseiller ne sort jamais).
describe('le prix d’un bien de l’agence devant l’acquéreur', () => {
  it('un mandat signé montre son prix de commercialisation', () => {
    expect(agencyPriceForBuyer('signed', 315_000)).toBe(315_000);
  });

  it('un vendeur à relancer, vendu ailleurs, retiré ou sans issue connue ne montre aucun prix', () => {
    for (const outcome of ['follow_up', 'sold_elsewhere', 'withdrawn', null, undefined]) {
      expect(agencyPriceForBuyer(outcome, 315_000)).toBeNull();
    }
  });
});
