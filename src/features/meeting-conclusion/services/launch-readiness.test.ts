import { describe, expect, it } from 'vitest';

import {
  launchReadinessLabel,
  launchReadinessShort,
} from '@/features/meeting-conclusion/services/launch-readiness';

describe('launchReadinessLabel', () => {
  it('shows the first and the last score when the seller moved', () => {
    expect(launchReadinessLabel(7, 10)).toBe('7/10 → 10/10');
  });

  it('shows a single score when it never changed', () => {
    expect(launchReadinessLabel(10, 10)).toBe('10/10');
  });

  it('shows a score that went down as it happened', () => {
    expect(launchReadinessLabel(8, 6)).toBe('8/10 → 6/10');
  });

  it('falls back on the only score known', () => {
    expect(launchReadinessLabel(null, 9)).toBe('9/10');
    expect(launchReadinessLabel(4, null)).toBe('4/10');
  });

  it('says nothing when no score was given', () => {
    expect(launchReadinessLabel(null, null)).toBeNull();
  });
});

describe('launchReadinessShort', () => {
  it('writes the short form of the Suivi row', () => {
    expect(launchReadinessShort(7, 10)).toBe('7 → 10/10');
    expect(launchReadinessShort(10, 10)).toBe('10/10');
    expect(launchReadinessShort(null, 6)).toBe('6/10');
    expect(launchReadinessShort(null, null)).toBeNull();
  });
});
