import { describe, expect, it } from 'vitest';

import {
  amountRows,
  conclusionGaps,
  sellerJourneyGap,
  showsMarketComputed,
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
    expect(labels).toContain('Analyse du conseiller (avis de valeur)');
    expect(labels).toContain('Prix des concurrents (validé)');
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
    // Sans marché calculé, il n'a pas de ligne du tout.
    expect(byKey.vs_market_computed).toBeUndefined();
    // Le seul repère présent produit bien un écart.
    expect(byKey.vs_advisor_analysis.amount).toBe(108000);
  });

  it('un prix convenu absent ⇒ aucun écart (le vendeur n’a pas parlé)', () => {
    const gaps = conclusionGaps({ ...FULL, commercializationPrice: null });
    expect(gaps.every((g) => g.amount === null && g.percentage === null)).toBe(true);
  });

  // Mission 82 — du prix du vendeur en début de rendez-vous au prix de commercialisation.
  it('mesure le chemin parcouru : prix de commercialisation face au prix de départ du vendeur', () => {
    // 690 000 vs 750 000 → −60 000 (−8 %)
    expect(sellerJourneyGap(750000, 690000)).toMatchObject({ amount: -60000, percentage: -8 });
    expect(sellerJourneyGap(700000, 700000)).toMatchObject({ amount: 0, percentage: 0 });
  });

  it('ne calcule aucun écart sans les deux prix (une valeur absente reste absente)', () => {
    expect(sellerJourneyGap(null, 690000)).toMatchObject({ amount: null, percentage: null });
    expect(sellerJourneyGap(750000, null)).toMatchObject({ amount: null, percentage: null });
    expect(sellerJourneyGap(0, 690000)).toMatchObject({ amount: null, percentage: null });
  });

  // Mission 89 — « Marché calculé » et « Prix des concurrents » sont le même calcul tant que le
  // conseiller ne l'a pas modifié : le marché calculé ne se montre que lorsqu'il diffère.
  describe('le marché calculé ne s’affiche que s’il diffère du prix des concurrents', () => {
    const SAME: ConclusionAmounts = { ...FULL, marketComputed: 303355, advisorPrice: 303355 };

    it('identiques : une seule ligne, « Prix des concurrents », et un seul écart', () => {
      expect(showsMarketComputed(SAME)).toBe(false);
      expect(amountRows(SAME).map((row) => row.key)).toEqual([
        'advisorPrice',
        'advisorAnalysis',
        'commercializationPrice',
      ]);
      expect(conclusionGaps(SAME).map((gap) => gap.key)).toEqual([
        'vs_advisor_price',
        'vs_advisor_analysis',
      ]);
    });

    it('différents (prix ajusté par le conseiller) : les deux lignes, prix des concurrents d’abord', () => {
      expect(showsMarketComputed(FULL)).toBe(true);
      expect(amountRows(FULL).map((row) => row.key)).toEqual([
        'advisorPrice',
        'marketComputed',
        'advisorAnalysis',
        'commercializationPrice',
      ]);
      expect(conclusionGaps(FULL).map((gap) => gap.key)).toEqual([
        'vs_advisor_price',
        'vs_market_computed',
        'vs_advisor_analysis',
      ]);
    });

    it('aucune décision enregistrée : le marché calculé est le seul des deux, il s’affiche', () => {
      expect(showsMarketComputed({ ...FULL, advisorPrice: null })).toBe(true);
      expect(showsMarketComputed({ ...FULL, marketComputed: null })).toBe(false);
    });
  });
});
