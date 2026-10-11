import { describe, expect, it } from 'vitest';

import {
  demoComparables,
  demoProject,
  demoProperty,
  demoSavedPositioning,
  DEMO_AT,
} from '@/app/design-preview/demo-data';
import { sellerFacingCompetitorPrice } from '@/features/live-seller/services/competitor-price';
import { buildSellerPresentation } from '@/features/seller-presentation/services/build-seller-presentation';

describe('sellerFacingCompetitorPrice — un seul « Prix des concurrents » devant le vendeur', () => {
  it('le prix validé par le conseiller, sinon le calcul courant', () => {
    expect(sellerFacingCompetitorPrice(310000, 303355)).toBe(310000);
    expect(sellerFacingCompetitorPrice(null, 303355)).toBe(303355);
    expect(sellerFacingCompetitorPrice(undefined, null)).toBeNull();
  });
});

describe('les écarts montrés au vendeur se mesurent au prix des concurrents', () => {
  const build = (advisorPrice: number | null) =>
    buildSellerPresentation({
      project: demoProject,
      property: demoProperty,
      diagnostics: null,
      condominium: null,
      comparables: demoComparables,
      savedPositioning: advisorPrice == null ? null : { ...demoSavedPositioning, advisorPrice },
      sellerResponses: [],
      sellerSummary: null,
      generatedAt: DEMO_AT,
      propertyPhotoUrls: [],
    }).live;

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
