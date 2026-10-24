import { describe, expect, it } from 'vitest';

import { parseBuyerInput } from '@/features/buyers/schemas/buyer-input';
import { buyerToCriteria } from '@/features/buyers/services/buyer-criteria';
import { DEMO_BUYERS } from '@/features/demo/services/demo-buyers';
import {
  reconcileBuyer,
  type BuyerCandidate,
} from '@/features/meeting-conclusion/services/buyer-reconciliation';

// Mission 117 — les deux acquéreurs de la démo : valides selon les règles de la fiche, cohérents
// avec les scénarios (l'appartement d'Antibes, la villa de Mougins), sans coordonnées, et rien ne
// dit « démo » dans leur fiche.
const dossier = (
  price: number,
  city: string,
  type: string,
  rooms: number,
  surface: number,
): BuyerCandidate => ({
  key: `dossier:${city}`,
  group: 'mandate',
  title: 'Dossier',
  propertyType: type,
  roomsCount: rooms,
  surfaceArea: surface,
  city,
  price,
  projectId: 'p',
  sellerName: 'Vendeur',
  sellerPhone: null,
  step: null,
  listingUrl: null,
});

describe('les acquéreurs de la démo', () => {
  it('sont deux, valides, sans téléphone ni e-mail, et ne disent pas « démo »', () => {
    expect(DEMO_BUYERS).toHaveLength(2);
    for (const buyer of DEMO_BUYERS) {
      const parsed = parseBuyerInput({
        name: buyer.name,
        cities: buyer.cities.join(', '),
        property_types: buyer.propertyTypes,
        budget_ideal: buyer.budgetIdeal,
        budget_max: buyer.budgetMax,
        rooms_min: buyer.roomsMin,
        bedrooms_min: buyer.bedroomsMin,
        must_have: buyer.mustHave,
      });
      expect(parsed.ok).toBe(true);
      expect(buyer.phone).toBeNull();
      expect(buyer.email).toBeNull();
      expect(JSON.stringify(buyer)).not.toMatch(/d[ée]mo|fictif|test/i);
    }
  });

  it('l’un correspond à l’appartement d’Antibes, l’autre à la villa de Mougins', () => {
    const antibes = dossier(393_000, 'Antibes', 'apartment', 3, 68);
    const mougins = dossier(1_639_500, 'Mougins', 'house', 7, 210);
    const [rossi, keller] = DEMO_BUYERS;
    const first = reconcileBuyer(buyerToCriteria(rossi!), [antibes, mougins]);
    expect(first.matches.mandate.map((hit) => hit.candidate.city)).toEqual(['Antibes']);
    const second = reconcileBuyer(buyerToCriteria(keller!), [antibes, mougins]);
    expect(second.matches.mandate.map((hit) => hit.candidate.city)).toEqual(['Mougins']);
  });
});
