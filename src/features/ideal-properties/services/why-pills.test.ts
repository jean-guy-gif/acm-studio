import { describe, expect, it } from 'vitest';

import type { WhyPill } from '@/features/ideal-properties/services/categorize-ideal';
import {
  budgetPill,
  criteriaCount,
  softWhyPills,
  whyPills,
} from '@/features/ideal-properties/services/why-pills';
import type { SoftJudgment } from '@/features/soft-ranking/types';

const judgment = (over: Partial<SoftJudgment>): SoftJudgment => ({
  key: 'calme',
  verdict: 'clearly',
  quote: 'au calme absolu',
  counterQuote: null,
  toVerify: false,
  ...over,
});
// Les montants s'écrivent avec des espaces insécables (M74).
const plain = (text: string | undefined) => text?.replace(/[\u00a0\u202f]/g, ' ');

// La refonte, lot C — « Pourquoi celui-ci pour eux », dans ses mots.
describe('ce que l’annonce dit de ce qui compte pour eux', () => {
  it('dit clairement : « au calme » dans l’annonce — le critère, jamais la citation', () => {
    const pills = softWhyPills({
      judgments: [judgment({ quote: '12 rue des Lilas, au calme absolu' })],
    });
    expect(pills).toEqual([{ tone: 'said', label: '« au calme » dans l’annonce' }]);
    expect(JSON.stringify(pills)).not.toContain('Lilas');
  });

  it('avec réserve, par la seule étiquette du portail, ou vu sur les seules photos : à vérifier', () => {
    expect(
      softWhyPills({
        judgments: [
          judgment({ verdict: 'reserve', counterQuote: 'proche de la gare' }),
          judgment({ key: 'vue', toVerify: true }),
          judgment({
            key: 'lumineux',
            verdict: 'nothing',
            quote: null,
            photos: { verdict: 'shown', numbers: [2] },
          }),
        ],
      }).map((pill) => pill.label),
    ).toEqual([
      '« au calme » : à vérifier',
      '« une vue » : à vérifier',
      '« lumineux » : à vérifier',
    ]);
  });

  it('rien, non lu, ou le contraire : pas une raison', () => {
    expect(
      softWhyPills({
        judgments: [
          judgment({ verdict: 'nothing', quote: null }),
          judgment({ key: 'vue', verdict: 'unread', quote: null }),
          judgment({ key: 'cachet', verdict: 'contrary', quote: 'travaux à prévoir' }),
          judgment({
            key: 'lumineux',
            verdict: 'contrary',
            photos: { verdict: 'shown', numbers: [1] },
          }),
        ],
      }),
    ).toEqual([]);
    expect(softWhyPills({ noText: true })).toEqual([]);
    expect(softWhyPills(undefined)).toEqual([]);
  });

  it('en classement simplifié : les mots trouvés dans l’annonce', () => {
    expect(softWhyPills({ mentions: ['calme', 'vue'] }).map((pill) => pill.label)).toEqual([
      '« calme » dans l’annonce',
      '« vue » dans l’annonce',
    ]);
    expect(softWhyPills({ mentions: [] })).toEqual([]);
  });
});

describe('les raisons d’un bien, dans l’ordre', () => {
  it('ses indispensables, ce que l’annonce dit, puis ses autres souhaits', () => {
    const met: WhyPill[] = [
      { tone: 'must', label: 'Piscine' },
      { tone: 'plain', label: 'Mougins' },
      { tone: 'plain', label: '2 pièces de plus' },
    ];
    expect(whyPills(met, { judgments: [judgment({})] }).map((pill) => pill.label)).toEqual([
      'Piscine',
      '« au calme » dans l’annonce',
      'Mougins',
      '2 pièces de plus',
    ]);
    expect(whyPills(met, undefined)).toEqual(met);
  });
});

describe('la pastille du prix', () => {
  it('verte sous le budget, orange au-dessus, jamais rouge', () => {
    const under = budgetPill(1_590_000, 1_700_000);
    expect([under?.tone, plain(under?.label)]).toEqual(['good', '110 000 € sous le budget']);
    expect(budgetPill(400_000, 400_000)).toEqual({ tone: 'good', label: 'Au budget' });
    const near = budgetPill(410_000, 400_000);
    expect([near?.tone, plain(near?.label)]).toEqual([
      'watch',
      '10 000 € au-dessus du budget, à négocier',
    ]);
    const far = budgetPill(450_000, 400_000);
    expect([far?.tone, plain(far?.label)]).toEqual(['watch', 'Budget dépassé de 50 000 €']);
  });

  it('sans prix ou sans budget : aucune pastille', () => {
    expect(budgetPill(null, 400_000)).toBeNull();
    expect(budgetPill(400_000, null)).toBeNull();
  });
});

describe('« 8 critères sur 8 »', () => {
  it('jamais un pourcentage ; rien sans critère renseigné', () => {
    expect(criteriaCount(8, 8)).toBe('8 critères sur 8');
    expect(criteriaCount(1, 7)).toBe('1 critère sur 7');
    expect(criteriaCount(0, 0)).toBeNull();
    expect(criteriaCount(8, 8)).not.toContain('%');
  });
});
