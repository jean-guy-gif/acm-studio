import { describe, expect, it } from 'vitest';

import {
  answerSuggestions,
  type AnswerForSuggestion,
} from '@/features/buyer-deck/services/answer-suggestions';
import type { BuyerInput } from '@/features/buyers/types';

const buyer: BuyerInput = {
  name: 'M. et Mme Rossi',
  phone: null,
  email: null,
  purpose: null,
  timeline: null,
  notes: null,
  propertyTypes: ['apartment'],
  cities: ['Antibes'],
  budgetIdeal: 410_000,
  budgetMax: 430_000,
  roomsMin: 3,
  bedroomsMin: null,
  surfaceMin: 60,
  outdoor: null,
  parking: true,
  pool: null,
  floorMin: null,
  elevator: null,
  energyRatingMax: null,
  worksAccepted: null,
  mustHave: ['cities'],
  dealBreakers: null,
};

const no = (
  bienKey: string,
  reasons: AnswerForSuggestion['reasons'],
  over: Partial<AnswerForSuggestion> = {},
): AnswerForSuggestion => ({
  bienKey,
  answer: 'no',
  reasons,
  answeredAt: '2026-10-25T10:00:00Z',
  surfaceArea: 62,
  price: 420_000,
  ...over,
});

const plain = (value: unknown): string => JSON.stringify(value).replace(/[  ]/g, ' ');

// Mission 122 — les réponses nourrissent la fiche sans la changer (décision de Jean-Guy, 25/10).
describe('les suggestions de la fiche', () => {
  it('une raison qui revient sur deux biens différents : la suggestion, chiffrée', () => {
    const [surface] = answerSuggestions(
      buyer,
      [],
      [
        no('listing:a', ['surface'], { surfaceArea: 65 }),
        no('listing:b', ['surface'], { surfaceArea: 68 }),
      ],
    );
    expect(surface?.kind).toBe('surface');
    expect(plain(surface?.text)).toBe(
      '"La surface a été refusée deux fois : passer la surface minimum à 70 m² ?"',
    );
    expect(surface?.patch).toEqual({ surfaceMin: 70 });
  });

  it('une seule fois, ou le même bien deux fois : rien', () => {
    expect(answerSuggestions(buyer, [], [no('listing:a', ['surface'])])).toEqual([]);
    expect(
      answerSuggestions(
        buyer,
        [],
        [
          no('listing:a', ['surface'], { answeredAt: '2026-10-24T10:00:00Z' }),
          no('listing:a', ['surface']),
        ],
      ),
    ).toEqual([]);
  });

  it('la dernière réponse d’un bien vaut : un « Pas pour moi » devenu « Peut-être » ne compte plus', () => {
    expect(
      answerSuggestions(
        buyer,
        [],
        [
          no('listing:a', ['surface'], { answeredAt: '2026-10-24T10:00:00Z' }),
          { ...no('listing:a', []), answer: 'maybe' },
          no('listing:b', ['surface']),
        ],
      ),
    ).toEqual([]);
  });

  it('ignorée, elle ne revient plus ; au niveau proposé, elle disparaît d’elle-même', () => {
    const answers = [no('listing:a', ['surface']), no('listing:b', ['surface'])];
    expect(answerSuggestions(buyer, ['surface'], answers)).toEqual([]);
    expect(answerSuggestions({ ...buyer, surfaceMin: 70 }, [], answers)).toEqual([]);
    expect(
      answerSuggestions(
        buyer,
        [],
        [no('listing:a', ['parking']), no('listing:b', ['parking'])],
      ).map((entry) => entry.patch),
    ).toEqual([{ parking: true, mustHave: ['cities', 'parking'] }]);
    expect(
      answerSuggestions(
        { ...buyer, mustHave: ['cities', 'parking'] },
        [],
        [no('listing:a', ['parking']), no('listing:b', ['parking'])],
      ),
    ).toEqual([]);
  });

  it('le prix : le plafond sous le plus bas prix refusé, au millier, le budget idéal suit', () => {
    const [price] = answerSuggestions(
      buyer,
      [],
      [
        no('listing:a', ['price'], { price: 425_500 }),
        no('listing:b', ['price'], { price: 429_000 }),
      ],
    );
    expect(price?.patch).toEqual({ budgetMax: 425_000 });
    const [lower] = answerSuggestions(
      buyer,
      [],
      [
        no('listing:a', ['price'], { price: 400_000 }),
        no('listing:b', ['price'], { price: 405_000 }),
      ],
    );
    expect(lower?.patch).toEqual({ budgetMax: 399_000, budgetIdeal: 399_000 });
    // Un prix jamais montré (vendeur à relancer, 24/10) ne chiffre rien : le constat reste.
    const [hidden] = answerSuggestions(
      buyer,
      [],
      [no('project:p', ['price'], { price: null }), no('project:q', ['price'], { price: null })],
    );
    expect(hidden?.patch).toBeNull();
  });

  it('le quartier, les photos, autre : un constat, sans changement proposé', () => {
    const [district] = answerSuggestions(
      buyer,
      [],
      [no('listing:a', ['district']), no('listing:b', ['district'])],
    );
    expect(district).toMatchObject({ kind: 'district', patch: null });
    expect(district?.text).toBe('Le quartier a été refusé deux fois.');
  });

  it('les travaux et l’extérieur', () => {
    const kinds = answerSuggestions(
      buyer,
      [],
      [no('listing:a', ['works', 'outdoor']), no('listing:b', ['works', 'outdoor'])],
    );
    expect(kinds.map((entry) => [entry.kind, entry.patch])).toEqual([
      ['outdoor', { outdoor: true, mustHave: ['cities', 'outdoor'] }],
      ['works', { worksAccepted: false }],
    ]);
  });
});
