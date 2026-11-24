import { describe, expect, it } from 'vitest';

import type {
  CategorizedCandidate,
  IdealCategorization,
} from '@/features/ideal-properties/services/categorize-ideal';
import {
  rankCategorized,
  topPhotoPicks,
} from '@/features/ideal-properties/services/rank-categorized';
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

// Lancement, mission 9 — les biens dont les photos sont lues : les mieux classés seulement.
describe('topPhotoPicks', () => {
  const withPhotos = (url: string, category: CategorizedCandidate['category'], photos: number) =>
    ({
      candidate: {
        url,
        photoUrls: Array.from(
          { length: photos },
          (_, index) => `https://p/${url}-${index + 1}.jpg`,
        ),
      },
      category,
    }) as unknown as CategorizedCandidate;

  it('les catégories dans leur ordre, le score du texte à l’intérieur, sans les biens sans photo', () => {
    const categorized: IdealCategorization = {
      byCategory: {
        strong: [
          withPhotos('s1', 'strong', 9),
          withPhotos('s2', 'strong', 2),
          withPhotos('s3', 'strong', 0),
        ],
        compromise: [withPhotos('c1', 'compromise', 1)],
        explore: [withPhotos('e1', 'explore', 4)],
      },
      excluded: { count: 0, reasons: [] },
    };
    const picks = topPhotoPicks(categorized, { s2: calm('clearly'), e1: calm('clearly') }, 3, 6);
    expect(picks.map((pick) => pick.key)).toEqual(['s2', 's1', 'c1']);
    // Les premières photos de la recherche, six au plus, dans leur ordre.
    expect(picks[1]!.urls).toHaveLength(6);
    expect(picks[1]!.urls[0]).toBe('https://p/s1-1.jpg');
    // Rien n'est rangé ni retiré dans la répartition.
    expect(categorized.byCategory.strong.map((item) => item.candidate.url)).toEqual([
      's1',
      's2',
      's3',
    ]);
  });
});
