import type { LiveComparativeData } from '@/features/seller-presentation/types/seller-presentation';

// The ordered page model that drives the Live comparative UI. Pure/deterministic:
// intro → [Votre bien] → [competition, price, price reveal, duration] per
// comparable → dangerous competitor → seller perceived price → price analysis →
// conclusion. Mission 41 aligns the per-comparable loop on the Storyboard's four
// screens (A/B/C/D): the guess and the reveal are two distinct screens so the
// seller's reaction to the revealed price has room to happen.
export type LivePageType =
  | 'intro'
  | 'subject_property'
  | 'comparable_competition'
  | 'comparable_price'
  | 'comparable_price_reveal'
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
  step: 1 | 2 | 3 | 4 | null; // step within the 4-step loop
};

const COMPARABLE_STEPS: { type: LivePageType; step: 1 | 2 | 3 | 4; title: string }[] = [
  { type: 'comparable_competition', step: 1, title: 'Un sérieux concurrent ?' },
  { type: 'comparable_price', step: 2, title: 'À quel prix ?' },
  { type: 'comparable_price_reveal', step: 3, title: 'Ce prix vous paraît-il cohérent ?' },
  { type: 'comparable_duration', step: 4, title: 'Pourquoi toujours en vente ?' },
];

// `hasSubjectProperty` decides whether the "Votre bien" recognition slide (Act 1)
// is inserted — absent when the dossier has no subject property, same logic as the
// dangerous-competitor page when there is no competitor.
export function buildLivePages(
  live: LiveComparativeData | null,
  hasSubjectProperty: boolean,
): LivePage[] {
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

  if (hasSubjectProperty) {
    pages.push({
      key: 'subject_property',
      type: 'subject_property',
      title: 'Votre bien',
      comparableId: null,
      comparableIndex: null,
      step: null,
    });
  }

  const comparables = live?.comparables ?? [];
  comparables.forEach((comparable, index) => {
    const steps =
      comparable.response?.seller_serious_competitor === 'no'
        ? COMPARABLE_STEPS.filter((step) => step.step === 1)
        : COMPARABLE_STEPS;
    for (const stepDef of steps) {
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
