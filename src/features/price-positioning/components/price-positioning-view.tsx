'use client';

import { useMemo, useState } from 'react';

import { AdvisorPrice } from '@/features/price-positioning/components/advisor-price';
import { ConfidenceCard } from '@/features/price-positioning/components/confidence-card';
import {
  InfluentialComparablesView,
  type InfluentialComparableDisplay,
} from '@/features/price-positioning/components/influential-comparables';
import { PositioningReasons } from '@/features/price-positioning/components/positioning-reasons';
import { RecommendedRangeView } from '@/features/price-positioning/components/recommended-range';
import { SellerPrice } from '@/features/price-positioning/components/seller-price';
import {
  calculatePriceDeviation,
  resolveMarketPosition,
} from '@/features/price-positioning/services/calculate-price-deviation';
import type {
  PricePositioning,
  RecommendedRange,
} from '@/features/price-positioning/types/price-positioning';

// Interactive layer. The structural analysis (range, confidence, influential,
// reasons) is computed server-side and passed in. This component only owns the
// editable advisor/seller prices and recomputes the light deviations locally —
// it never rebuilds the market analysis, and persists nothing.
export function PricePositioningView({
  positioning,
  range,
  influential,
}: {
  positioning: PricePositioning;
  range: RecommendedRange;
  influential: InfluentialComparableDisplay[];
}) {
  const [advisorPrice, setAdvisorPrice] = useState<number | null>(positioning.defaultAdvisorPrice);
  const [sellerPrice, setSellerPrice] = useState<number | null>(null);

  const derived = useMemo(() => {
    return {
      advisorDeviation: calculatePriceDeviation(advisorPrice, range.central),
      advisorPosition: resolveMarketPosition(advisorPrice, range.low, range.high),
      sellerDeviationFromCentral: calculatePriceDeviation(sellerPrice, range.central),
      sellerDeviationFromAdvisor: calculatePriceDeviation(sellerPrice, advisorPrice),
      sellerPosition: resolveMarketPosition(sellerPrice, range.low, range.high),
    };
  }, [advisorPrice, sellerPrice, range.central, range.low, range.high]);

  return (
    <div className="flex flex-col gap-6">
      <RecommendedRangeView range={range} usedCount={positioning.dataset.usedCount} />
      <ConfidenceCard confidence={positioning.confidence} />
      <AdvisorPrice
        price={advisorPrice}
        onChange={setAdvisorPrice}
        deviationFromCentral={derived.advisorDeviation}
        position={derived.advisorPosition}
      />
      <SellerPrice
        price={sellerPrice}
        onChange={setSellerPrice}
        deviationFromCentral={derived.sellerDeviationFromCentral}
        deviationFromAdvisor={derived.sellerDeviationFromAdvisor}
        position={derived.sellerPosition}
      />
      <InfluentialComparablesView comparables={influential} />
      <PositioningReasons reasons={positioning.reasons} />
    </div>
  );
}
