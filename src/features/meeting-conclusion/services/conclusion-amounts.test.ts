import { describe, expect, it } from 'vitest';

import {
  amountRows,
  conclusionGaps,
} from '@/features/meeting-conclusion/services/conclusion-amounts';
import type { ConclusionAmounts } from '@/features/meeting-conclusion/types';

const FULL: ConclusionAmounts = {
  marketComputed: 500400,
  advisorAnalysis: 372000,
  advisorPrice: 498765,
  commercializationPrice: 480000,
};

describe('conclusion-amounts — on stocke les faits, on calcule les écarts à l’affichage', () => {
  it('nomme les quatre repères de façon distincte (conseiller ≠ conseillé)', () => {
    const labels = amountRows(FULL).map((r) => r.label);
    // Les quatre libellés sont deux à deux différents.
    expect(new Set(labels).size).toBe(4);
    // « analyse » et « prix conseillé » ne se confondent pas.
    expect(labels).toContain('Analyse du conseiller (saisie manuelle)');
    expect(labels).toContain('Prix conseillé (validé)');
    expect(labels).toContain('Marché calculé (d’après les concurrents)');
    expect(labels).toContain('Prix de commercialisation (convenu)');
  });

  it('calcule l’écart du prix convenu face aux trois repères', () => {
    const gaps = conclusionGaps(FULL);
    const byKey = Object.fromEntries(gaps.map((g) => [g.key, g]));
    // 480000 vs 498765 → −18 765 (−4 %)
    expect(byKey.vs_advisor_price.amount).toBe(-18765);
    expect(byKey.vs_advisor_price.percentage).toBe(-4);
    // 480000 vs 500400 → −20 400 (−4 %)
    expect(byKey.vs_market_computed.amount).toBe(-20400);
    expect(byKey.vs_market_computed.percentage).toBe(-4);
    // 480000 vs 372000 → +108 000 (+29 %)
    expect(byKey.vs_advisor_analysis.amount).toBe(108000);
    expect(byKey.vs_advisor_analysis.percentage).toBe(29);
  });

  it('n’invente aucun écart : un montant manquant donne null, jamais 0', () => {
    const gaps = conclusionGaps({
      marketComputed: null,
      advisorAnalysis: 372000,
      advisorPrice: null,
      commercializationPrice: 480000,
    });
    const byKey = Object.fromEntries(gaps.map((g) => [g.key, g]));
    expect(byKey.vs_advisor_price.amount).toBeNull();
    expect(byKey.vs_advisor_price.percentage).toBeNull();
    expect(byKey.vs_market_computed.amount).toBeNull();
    // Le seul repère présent produit bien un écart.
    expect(byKey.vs_advisor_analysis.amount).toBe(108000);
  });

  it('un prix convenu absent ⇒ aucun écart (le vendeur n’a pas parlé)', () => {
    const gaps = conclusionGaps({ ...FULL, commercializationPrice: null });
    expect(gaps.every((g) => g.amount === null && g.percentage === null)).toBe(true);
  });
});
