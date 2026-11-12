import { describe, expect, it } from 'vitest';

import type {
  CategorizedCandidate,
  IdealCategorization,
} from '@/features/ideal-properties/services/categorize-ideal';
import { rankCategorized } from '@/features/ideal-properties/services/rank-categorized';
import type { SoftJudgment } from '@/features/soft-ranking/types';

// Mission 151 (partie B) — ce qui compte pour eux ne range qu'à l'intérieur d'une catégorie.

const entry = (url: string, category: CategorizedCandidate['category']) =>
  ({ candidate: { url }, category }) as unknown as CategorizedCandidate;
const calm = (verdict: SoftJudgment['verdict']): SoftJudgment[] => [
  { key: 'calme', verdict, quote: null, counterQuote: null, toVerify: false },
];

describe('rankCategorized', () => {
  it('jamais un bien ne change de catégorie, ni n’en sort ; un « À explorer » calme reste après', () => {
    const categorized: IdealCategorization = {
      byCategory: {
        strong: [entry('s1', 'strong'), entry('s2', 'strong')],
        compromise: [entry('c1', 'compromise')],
        explore: [entry('e1', 'explore')],
      },
      excluded: { count: 1, reasons: [{ label: 'budget dépassé', count: 1 }] },
    };
    rankCategorized(categorized, {
      s1: calm('contrary'),
      s2: calm('clearly'),
      e1: calm('clearly'),
    });
    expect(categorized.byCategory.strong.map((item) => item.candidate.url)).toEqual(['s2', 's1']);
    expect(categorized.byCategory.compromise.map((item) => item.candidate.url)).toEqual(['c1']);
    expect(categorized.byCategory.explore.map((item) => item.candidate.url)).toEqual(['e1']);
    expect(categorized.excluded.count).toBe(1);
  });
});
