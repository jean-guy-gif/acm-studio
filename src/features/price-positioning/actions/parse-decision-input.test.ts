import { describe, expect, it } from 'vitest';

import { parseDecisionInput } from '@/features/price-positioning/actions/parse-decision-input';

function form(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    fd.set(key, value);
  }
  return fd;
}

describe('parseDecisionInput', () => {
  it('accepts advisorPrice, advisor analysis and justification', () => {
    const result = parseDecisionInput(
      form({
        advisorPrice: '300000',
        advisorComparativeMarketPrice: '310000',
        justification: 'Marché tendu',
      }),
    );
    expect(result).toEqual({
      ok: true,
      input: {
        advisorPrice: 300000,
        advisorComparativeMarketPrice: 310000,
        justification: 'Marché tendu',
      },
    });
  });

  it('treats an empty advisor analysis and justification as null', () => {
    const result = parseDecisionInput(form({ advisorPrice: '300000' }));
    expect(result).toEqual({
      ok: true,
      input: {
        advisorPrice: 300000,
        advisorComparativeMarketPrice: null,
        justification: null,
      },
    });
  });

  // Mission 58 — l'avis de valeur se prépare ICI ; facultatif, mais s'il est fourni il doit
  // être un montant positif (aucune valeur inventée, aucun ancrage négatif).
  it('rejects a non-positive advisor analysis', () => {
    expect(
      parseDecisionInput(form({ advisorPrice: '300000', advisorComparativeMarketPrice: '0' })).ok,
    ).toBe(false);
    expect(
      parseDecisionInput(form({ advisorPrice: '300000', advisorComparativeMarketPrice: '-5' })).ok,
    ).toBe(false);
  });

  it('rejects a missing or non-positive advisor price', () => {
    expect(parseDecisionInput(form({ advisorPrice: '' })).ok).toBe(false);
    expect(parseDecisionInput(form({ advisorPrice: '0' })).ok).toBe(false);
    expect(parseDecisionInput(form({ advisorPrice: '-5' })).ok).toBe(false);
    expect(parseDecisionInput(form({ advisorPrice: 'abc' })).ok).toBe(false);
  });

  // Mission 91 — le prix souhaité vendeur n'est plus saisi en préparation : envoyé quand même,
  // il n'est ni lu ni validé.
  it('never reads a seller price', () => {
    const result = parseDecisionInput(form({ advisorPrice: '300000', sellerPrice: '320000' }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.input).not.toHaveProperty('sellerPrice');
    }
  });

  it('rejects a justification longer than 1000 characters', () => {
    const result = parseDecisionInput(
      form({ advisorPrice: '300000', justification: 'x'.repeat(1001) }),
    );
    expect(result.ok).toBe(false);
  });

  it('NEVER reads forged business fields from the client', () => {
    const result = parseDecisionInput(
      form({
        advisorPrice: '300000',
        // Forged values a malicious client might try to inject:
        range_low: '1',
        range_central: '1',
        range_high: '1',
        confidence_score: '100',
        confidence_level: 'very_high',
        agency_id: 'other-agency',
        validated_by: 'someone-else',
        calculation_snapshot: '{"engineVersion":999}',
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      // Only the permitted decision fields are ever present.
      expect(Object.keys(result.input).sort()).toEqual(
        ['advisorComparativeMarketPrice', 'advisorPrice', 'justification'].sort(),
      );
    }
  });
});
