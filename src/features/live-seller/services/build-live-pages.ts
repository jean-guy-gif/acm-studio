import type { LiveComparativeData } from '@/features/seller-presentation/types/seller-presentation';

// The ordered page model that drives the Live comparative UI. Pure/deterministic:
// intro → [competition, price, duration] per comparable → dangerous competitor →
// seller perceived price → price analysis → conclusion.
export type LivePageType =
  | 'intro'
  | 'comparable_competition'
  | 'comparable_price'
  | 'comparable_duration'
  | 'dangerous_competitor'
  | 'seller_perceived_price'
  | 'price_analysis'
  | 'conclusion';

export type LivePage = {
  key: string;
  type: LivePageType;
  title: string;
  // Per-comparable pages only:
  comparableId: string | null;
  comparableIndex: number | null; // 1-based position among retained
  step: 1 | 2 | 3 | null; // step within the 3-step loop
};

const COMPARABLE_STEPS: { type: LivePageType; step: 1 | 2 | 3; title: string }[] = [
  { type: 'comparable_competition', step: 1, title: 'Un sérieux concurrent ?' },
  { type: 'comparable_price', step: 2, title: 'À quel prix ?' },
  { type: 'comparable_duration', step: 3, title: 'Pourquoi toujours en vente ?' },
];

export function buildLivePages(live: LiveComparativeData | null): LivePage[] {
  const pages: LivePage[] = [
    {
      key: 'intro',
      type: 'intro',
      title: 'Introduction',
      comparableId: null,
      comparableIndex: null,
      step: null,
    },
  ];

  const comparables = live?.comparables ?? [];
  comparables.forEach((comparable, index) => {
    for (const stepDef of COMPARABLE_STEPS) {
      pages.push({
        key: `${stepDef.type}:${comparable.id}`,
        type: stepDef.type,
        title: stepDef.title,
        comparableId: comparable.id,
        comparableIndex: index + 1,
        step: stepDef.step,
      });
    }
  });

  if (comparables.length > 0) {
    pages.push({
      key: 'dangerous_competitor',
      type: 'dangerous_competitor',
      title: 'Le concurrent le plus dangereux',
      comparableId: null,
      comparableIndex: null,
      step: null,
    });
  }

  pages.push(
    {
      key: 'seller_perceived_price',
      type: 'seller_perceived_price',
      title: 'Votre valeur perçue',
      comparableId: null,
      comparableIndex: null,
      step: null,
    },
    {
      key: 'price_analysis',
      type: 'price_analysis',
      title: 'Analyse des prix',
      comparableId: null,
      comparableIndex: null,
      step: null,
    },
    {
      key: 'conclusion',
      type: 'conclusion',
      title: 'Conclusion',
      comparableId: null,
      comparableIndex: null,
      step: null,
    },
  );

  return pages;
}
