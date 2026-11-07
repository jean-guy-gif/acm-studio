import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/buyers/actions/proposals', () => ({
  prepareProposalLink: vi.fn(),
  recordProposal: vi.fn(),
}));

const { ProposeSeries } = await import('@/features/buyers/components/propose-series');

// Mission 145 (partie B) — « Proposer ce bien » compte comme la tâche : les prêts à visiter cochés,
// ceux qui correspondent sans être prêts à part, décochés (remplace M134, « tous cochés »).
const candidate = (id: string, ready: boolean) => ({
  id,
  name: `Famille ${id}`,
  phone: null,
  email: null,
  ready,
  missing: ready ? null : 'Financement en cours',
  stars: [],
  budgetGap: null,
  wants: {
    name: `Famille ${id}`,
    pool: null,
    outdoor: null,
    parking: null,
    elevator: null,
    budgetMax: null,
  },
  language: 'fr' as const,
});

describe('« Proposer ce bien »', () => {
  it('les prêts cochés en tête ; « Correspond aussi, pas encore prêt », décochés', () => {
    const html = renderToStaticMarkup(
      createElement(ProposeSeries, {
        propertyKey: 'project:p1',
        item: {
          property: {
            propertyType: 'house',
            roomsCount: 5,
            surfaceArea: 135,
            city: 'Vence',
            bedroomsCount: 4,
            floor: null,
            hasElevator: null,
            hasPool: false,
            outdoorSpaces: [],
            parkingTypes: [],
            energyRating: null,
            generalCondition: null,
          },
          price: 713_000,
          origin: 'mandate',
        },
        candidates: [
          candidate('Moreau', true),
          candidate('Fontaine', false),
          candidate('Roux', true),
        ],
        proposed: [],
        advisorFirstName: 'Natacha',
      }),
    );
    expect(html).toMatch(/data-testid="propose-ready-title"[^>]*>2 acquéreurs prêts à visiter</);
    expect(html).toMatch(
      /data-testid="propose-others-title"[^>]*>Correspond aussi, pas encore prêt · 1</,
    );
    const others = html.slice(html.indexOf('propose-others-title'));
    expect(others).toContain('Famille Fontaine');
    expect(others).not.toContain('Famille Moreau');
    // Deux cases cochées : les prêts.
    expect(html.match(/checked=""/g)).toHaveLength(2);
  });
});
