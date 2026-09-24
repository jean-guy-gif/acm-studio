import { describe, expect, it } from 'vitest';

import type { LiveComparativeData } from '@/features/seller-presentation/types/seller-presentation';
import {
  liveCapturedFacts,
  liveDerivedAmounts,
} from '@/features/meeting-conclusion/services/resolve-conclusion-amounts';

// Fabrique une donnée Live minimale pour le calcul des faits (seuls comparables /
// sellerSummary / advisorDecision comptent ici).
function live(overrides: {
  sellerPrice?: number | null;
  perceived?: number | null;
  analysis?: number | null;
  comparables?: { price: number; surfaceArea: number | null }[];
}): LiveComparativeData {
  return {
    comparables: (overrides.comparables ?? []) as LiveComparativeData['comparables'],
    sellerSummary:
      overrides.perceived === undefined
        ? null
        : ({
            seller_perceived_property_price: overrides.perceived,
          } as LiveComparativeData['sellerSummary']),
    competitiveMarketCentral: null,
    advisorDecision:
      overrides.sellerPrice === undefined
        ? null
        : {
            advisorPrice: 1,
            sellerPrice: overrides.sellerPrice,
            advisorComparativeMarketPrice: overrides.analysis ?? null,
            justification: null,
          },
    priceGaps: {} as LiveComparativeData['priceGaps'],
  };
}

// Mission 58 — le gel à la conclusion (M56) capte l'analyse du conseiller depuis sa NOUVELLE
// source : le positionnement (advisorDecision.advisorComparativeMarketPrice), plus le résumé
// Live. La valeur préparée est donc bien celle qui sera figée.
describe('liveDerivedAmounts — analyse du conseiller depuis le positionnement (Mission 58)', () => {
  it('advisorAnalysis vient de advisorDecision.advisorComparativeMarketPrice', () => {
    expect(
      liveDerivedAmounts(live({ sellerPrice: 320000, analysis: 415000 })).advisorAnalysis,
    ).toBe(415000);
  });

  it('absente au positionnement → null (aucune valeur inventée)', () => {
    expect(liveDerivedAmounts(live({ sellerPrice: 320000 })).advisorAnalysis).toBeNull();
    expect(liveDerivedAmounts(null).advisorAnalysis).toBeNull();
  });
});

describe('liveCapturedFacts (Mission 56)', () => {
  it('null quand il n’y a pas de Live', () => {
    expect(liveCapturedFacts(null)).toEqual({
      sellerWanted: null,
      sellerPerceived: null,
      retained: null,
      exploitable: null,
    });
  });

  it('retenus = concurrents is_selected ; exploitables = ceux avec prix ET surface', () => {
    const facts = liveCapturedFacts(
      live({
        sellerPrice: 555000,
        perceived: 400000,
        comparables: [
          { price: 300000, surfaceArea: 60 },
          { price: 310000, surfaceArea: 62 },
          { price: 320000, surfaceArea: null }, // retenu, non exploitable (pas de surface)
          { price: 0, surfaceArea: 70 }, // retenu, non exploitable (prix 0)
        ],
      }),
    );
    expect(facts.sellerWanted).toBe(555000);
    expect(facts.sellerPerceived).toBe(400000);
    expect(facts.retained).toBe(4);
    expect(facts.exploitable).toBe(2);
  });

  it('une valeur absente reste absente (rien d’inventé)', () => {
    const facts = liveCapturedFacts(live({ sellerPrice: null, perceived: null, comparables: [] }));
    expect(facts.sellerWanted).toBeNull();
    expect(facts.sellerPerceived).toBeNull();
    expect(facts.retained).toBe(0);
    expect(facts.exploitable).toBe(0);
  });
});
