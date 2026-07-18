import { describe, expect, it } from 'vitest';

import {
  calculateConfidence,
  type ConfidenceInput,
} from '@/features/price-positioning/services/calculate-confidence';

// A "perfect" input scoring 100 / very_high; each test overrides one weakness.
function baseInput(overrides: Partial<ConfidenceInput> = {}): ConfidenceInput {
  return {
    usedCount: 8,
    dispersion: 'low',
    excludedOutlierCount: 0,
    outliersReintroduced: false,
    surfaceProximityRatio: 1,
    geographicMajorityRatio: 1,
    ...overrides,
  };
}

describe('calculateConfidence — number of comparables', () => {
  it('no penalty for 8+', () => {
    expect(calculateConfidence(baseInput({ usedCount: 8 })).score).toBe(100);
  });
  it('-10 for 5 to 7', () => {
    expect(calculateConfidence(baseInput({ usedCount: 6 })).score).toBe(90);
  });
  it('-25 for 3 to 4', () => {
    expect(calculateConfidence(baseInput({ usedCount: 4 })).score).toBe(75);
  });
  it('-45 for 1 to 2', () => {
    expect(calculateConfidence(baseInput({ usedCount: 2 })).score).toBe(55);
  });
});

describe('calculateConfidence — dispersion', () => {
  it('no penalty for low', () => {
    expect(calculateConfidence(baseInput({ dispersion: 'low' })).score).toBe(100);
  });
  it('-15 for medium', () => {
    expect(calculateConfidence(baseInput({ dispersion: 'medium' })).score).toBe(85);
  });
  it('-30 for high', () => {
    expect(calculateConfidence(baseInput({ dispersion: 'high' })).score).toBe(70);
  });
});

describe('calculateConfidence — atypical comparables', () => {
  it('no penalty when there is no outlier', () => {
    expect(calculateConfidence(baseInput({ excludedOutlierCount: 0 })).score).toBe(100);
  });
  it('-5 for one excluded', () => {
    expect(calculateConfidence(baseInput({ excludedOutlierCount: 1 })).score).toBe(95);
  });
  it('-10 for several excluded', () => {
    expect(calculateConfidence(baseInput({ excludedOutlierCount: 3 })).score).toBe(90);
  });
  it('-30 for reintroduction, replacing the exclusion penalty', () => {
    const result = calculateConfidence(
      baseInput({ outliersReintroduced: true, excludedOutlierCount: 0 }),
    );
    expect(result.score).toBe(70);
  });
});

describe('calculateConfidence — surface proximity', () => {
  it('no penalty at 60%+', () => {
    expect(calculateConfidence(baseInput({ surfaceProximityRatio: 0.6 })).score).toBe(100);
  });
  it('-10 between 30% and 59%', () => {
    expect(calculateConfidence(baseInput({ surfaceProximityRatio: 0.4 })).score).toBe(90);
  });
  it('-20 below 30%', () => {
    expect(calculateConfidence(baseInput({ surfaceProximityRatio: 0.1 })).score).toBe(80);
  });
});

describe('calculateConfidence — geographic homogeneity', () => {
  it('no penalty at 75%+', () => {
    expect(calculateConfidence(baseInput({ geographicMajorityRatio: 0.75 })).score).toBe(100);
  });
  it('-10 between 50% and 74%', () => {
    expect(calculateConfidence(baseInput({ geographicMajorityRatio: 0.5 })).score).toBe(90);
  });
  it('-20 below 50%', () => {
    expect(calculateConfidence(baseInput({ geographicMajorityRatio: 0.3 })).score).toBe(80);
  });
  it('-15 when no location is exploitable', () => {
    expect(calculateConfidence(baseInput({ geographicMajorityRatio: null })).score).toBe(85);
  });
});

describe('calculateConfidence — score conversion and clamping', () => {
  it('maps score ranges to the right level', () => {
    expect(calculateConfidence(baseInput()).level).toBe('very_high'); // 100
    expect(calculateConfidence(baseInput({ dispersion: 'high' })).level).toBe('high'); // 70
    expect(
      calculateConfidence(
        baseInput({ usedCount: 4, dispersion: 'medium', surfaceProximityRatio: 0.4 }),
      ).level,
    ).toBe('medium'); // 100 - 25 - 15 - 10 = 50
  });

  it('never goes below 0 or above 100', () => {
    const worst = calculateConfidence({
      usedCount: 1,
      dispersion: 'high',
      excludedOutlierCount: 0,
      outliersReintroduced: true,
      surfaceProximityRatio: 0,
      geographicMajorityRatio: 0.1,
    });
    expect(worst.score).toBeGreaterThanOrEqual(0);
    expect(worst.score).toBeLessThanOrEqual(100);
    expect(worst.level).toBe('low');
  });

  it('exposes positive and warning factors', () => {
    const result = calculateConfidence(baseInput({ dispersion: 'high' }));
    expect(result.positiveFactors.length).toBeGreaterThan(0);
    expect(result.warningFactors).toContain('Forte dispersion des prix au m².');
  });
});
