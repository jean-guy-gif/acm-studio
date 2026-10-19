import { describe, expect, it } from 'vitest';

import {
  demoComparables,
  demoProject,
  demoProperty,
  demoSavedPositioning,
  DEMO_AT,
} from '@/test-fixtures/demo-data';
import { sellerFacingCompetitorPrice } from '@/features/live-seller/services/competitor-price';
import type { SavedPricePositioning } from '@/features/price-positioning/types/saved-price-positioning';
import { buildSellerPresentation } from '@/features/seller-presentation/services/build-seller-presentation';

describe('sellerFacingCompetitorPrice — un seul « Prix des concurrents » devant le vendeur', () => {
  it('le prix validé par le conseiller, sinon le calcul courant', () => {
    expect(sellerFacingCompetitorPrice(310000, 303355)).toBe(310000);
    expect(sellerFacingCompetitorPrice(null, 303355)).toBe(303355);
    expect(sellerFacingCompetitorPrice(undefined, null)).toBeNull();
  });
});

describe('les écarts montrés au vendeur se mesurent au prix des concurrents', () => {
  const present = (savedPositioning: SavedPricePositioning | null) =>
    buildSellerPresentation({
      project: demoProject,
      property: demoProperty,
      diagnostics: null,
      condominium: null,
      comparables: demoComparables,
      savedPositioning,
      sellerResponses: [],
      sellerSummary: null,
      generatedAt: DEMO_AT,
      propertyPhotoUrls: [],
    });
  // Une décision À JOUR : enregistrée sur le calcul courant (Mission 108 — une décision périmée
  // ne se montre plus au vendeur).
  const computed = present(null).currentPositioning;
  if (!computed) throw new Error('fixture sans positionnement');
  const current = computed;
  const upToDate: SavedPricePositioning = {
    ...demoSavedPositioning,
    rangeLow: current.recommendedRange?.low ?? 0,
    rangeCentral: current.recommendedRange?.central ?? 0,
    rangeHigh: current.recommendedRange?.high ?? 0,
    confidenceScore: current.confidence.score,
    confidenceLevel: current.confidence.level,
    snapshot: {
      ...demoSavedPositioning.snapshot,
      usedCount: current.dataset.usedCount,
      influentialComparableIds: current.influentialComparables.map((c) => c.comparableId),
    },
  };
  const build = (advisorPrice: number | null) =>
    present(advisorPrice == null ? null : { ...upToDate, advisorPrice }).live;

  it('Mission 108 — une décision périmée : le vendeur voit le calcul du jour', () => {
    const outdated = present({ ...upToDate, advisorPrice: 111111, rangeCentral: 1 });
    expect(outdated.positioningStatus).toBe('outdated');
    expect(outdated.live?.positioningOutdated).toBe(true);
    expect(outdated.live?.priceGaps.competitiveMarketCentral).toBe(
      outdated.live?.competitiveMarketCentral,
    );
  });

  it('prix ajusté par le conseiller : c’est lui que voit le vendeur, le calcul brut reste à part', () => {
    const live = build(111111);
    expect(live?.priceGaps.competitiveMarketCentral).toBe(111111);
    // Le calcul brut — figé comme « Marché calculé » à la conclusion — ne bouge pas.
    expect(live?.competitiveMarketCentral).not.toBe(111111);
    expect(live?.competitiveMarketCentral).toBe(build(null)?.competitiveMarketCentral);
  });

  it('sans décision enregistrée : le calcul courant', () => {
    const live = build(null);
    expect(live?.priceGaps.competitiveMarketCentral).toBe(live?.competitiveMarketCentral);
  });
});
