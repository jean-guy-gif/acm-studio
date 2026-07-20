import { describe, expect, it } from 'vitest';

import {
  getFirstNavigableKey,
  getLastNavigableKey,
  getLiveSections,
  getNavigablePosition,
  getSequentialSectionKey,
} from '@/features/live-presentation/services/get-live-sections';
import type {
  SellerPresentationSection,
  SellerPresentationSectionKey,
} from '@/features/seller-presentation/types/seller-presentation';

const KEYS: SellerPresentationSectionKey[] = [
  'property',
  'comparables',
  'market_analysis',
  'price_positioning',
  'advisor_decision',
  'seller_price',
  'warnings',
];

// Builds the 7 sections; `unavailable` lists the keys marked unavailable.
function sections(unavailable: SellerPresentationSectionKey[] = []): SellerPresentationSection[] {
  return KEYS.map((key, index) => ({
    key,
    order: index + 1,
    title: key,
    status: unavailable.includes(key) ? 'unavailable' : 'available',
    reasonUnavailable: unavailable.includes(key) ? 'raison' : null,
  }));
}

describe('getLiveSections', () => {
  it('keeps the full list in order (unavailable included) for the summary', () => {
    const { all } = getLiveSections(sections(['market_analysis']));
    expect(all.map((s) => s.key)).toEqual(KEYS);
  });

  it('exposes only available sections as navigable', () => {
    const { navigable } = getLiveSections(sections(['comparables', 'seller_price']));
    expect(navigable.map((s) => s.key)).toEqual([
      'property',
      'market_analysis',
      'price_positioning',
      'advisor_decision',
      'warnings',
    ]);
  });

  it('returns an empty navigable list when nothing is available', () => {
    expect(getLiveSections(sections(KEYS)).navigable).toEqual([]);
  });
});

describe('getFirstNavigableKey / getLastNavigableKey', () => {
  it('returns the first and last available sections', () => {
    const s = sections(['property', 'warnings']); // first and last unavailable
    expect(getFirstNavigableKey(s)).toBe('comparables');
    expect(getLastNavigableKey(s)).toBe('seller_price');
  });

  it('returns null when no section is available', () => {
    expect(getFirstNavigableKey(sections(KEYS))).toBeNull();
    expect(getLastNavigableKey(sections(KEYS))).toBeNull();
  });
});

describe('getSequentialSectionKey', () => {
  it('moves to the next / previous available section', () => {
    const s = sections();
    expect(getSequentialSectionKey(s, 'property', 'next')).toBe('comparables');
    expect(getSequentialSectionKey(s, 'comparables', 'prev')).toBe('property');
  });

  it('skips unavailable sections in sequential navigation', () => {
    const s = sections(['comparables', 'market_analysis']);
    expect(getSequentialSectionKey(s, 'property', 'next')).toBe('price_positioning');
    expect(getSequentialSectionKey(s, 'price_positioning', 'prev')).toBe('property');
  });

  it('computes neighbours correctly when the current section is unavailable', () => {
    const s = sections(['market_analysis']);
    // Opened market_analysis (unavailable) from the summary; next/prev skip it.
    expect(getSequentialSectionKey(s, 'market_analysis', 'next')).toBe('price_positioning');
    expect(getSequentialSectionKey(s, 'market_analysis', 'prev')).toBe('comparables');
  });

  it('returns null at the first and last bounds', () => {
    const s = sections();
    expect(getSequentialSectionKey(s, 'property', 'prev')).toBeNull();
    expect(getSequentialSectionKey(s, 'warnings', 'next')).toBeNull();
  });

  it('returns null when no section is navigable', () => {
    expect(getSequentialSectionKey(sections(KEYS), 'property', 'next')).toBeNull();
  });
});

describe('getNavigablePosition', () => {
  it('returns the 1-based position among navigable sections', () => {
    const s = sections(['comparables']);
    expect(getNavigablePosition(s, 'property')).toBe(1);
    expect(getNavigablePosition(s, 'market_analysis')).toBe(2);
  });

  it('returns null for an unavailable section', () => {
    expect(getNavigablePosition(sections(['comparables']), 'comparables')).toBeNull();
  });
});
