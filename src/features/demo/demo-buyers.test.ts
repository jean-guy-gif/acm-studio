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
  it('sont neuf (les Wilson, anglophones, depuis la M139), valides, joignables en 06 39 98 et example.com (fiction), et ne disent pas « démo »', () => {
    // Mission 132 — Rossi, Keller, et six acquéreurs autour de Vence.
    expect(DEMO_BUYERS).toHaveLength(9);
    expect(new Set(DEMO_BUYERS.map((buyer) => buyer.phone)).size).toBe(9);
    expect(DEMO_BUYERS.find((buyer) => buyer.name === 'Mr and Mrs Wilson')?.language).toBe('en');
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
      // Mission 130 B — la plage que l'ARCEP réserve à la fiction, un domaine réservé (RFC 2606).
      expect(buyer.phone).toMatch(/^06 39 98 \d{2} \d{2}$/);
      expect(buyer.email).toMatch(/@example\.com$/);
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

// Mission 132 — cinq acquéreurs prêts à visiter autour de Vence, et un sixième sans financement
// validé, qui ne compte pas (décision de Jean-Guy, 05/11).
describe('les acquéreurs prêts à visiter de la démo', () => {
  it('cinq prêts, maison de 4 ou 5 pièces, Vence et alentours, 700 000 à 800 000 €', async () => {
    const { buyerReadiness } = await import('@/features/buyers/services/buyer-readiness');
    const now = new Date('2026-11-05T10:00:00Z');
    const vence = DEMO_BUYERS.filter((buyer) =>
      buyer.cities.some((city) => /vence|colle/i.test(city)),
    );
    expect(vence).toHaveLength(6);
    const ready = vence.filter(
      (buyer) =>
        buyerReadiness(
          {
            status: 'searching',
            financing: buyer.financing ?? 'unknown',
            budgetMax: buyer.budgetMax,
            createdAt: '2026-10-01T10:00:00Z',
            statusChangedAt: '2026-10-01T10:00:00Z',
            contactedAt:
              buyer.contactedDaysAgo != null
                ? new Date(now.getTime() - buyer.contactedDaysAgo * 86_400_000).toISOString()
                : null,
          },
          {
            selectionCount: 0,
            presentedAt: null,
            linkCreated: false,
            answeredOnLink: false,
            visitsToOrganize: 0,
          },
          now,
        ).state === 'ready',
    );
    expect(ready).toHaveLength(5);
    for (const buyer of vence) {
      expect(buyer.propertyTypes).toEqual(['house']);
      expect(buyer.roomsMin).toBeGreaterThanOrEqual(4);
      expect(buyer.roomsMin).toBeLessThanOrEqual(5);
      expect(buyer.budgetMax).toBeGreaterThanOrEqual(700_000);
      expect(buyer.budgetMax).toBeLessThanOrEqual(800_000);
    }
    expect(vence.find((buyer) => buyer.financing !== 'validated')?.name).toBe('M. Fontaine');
  });
});
