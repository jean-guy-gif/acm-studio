import { describe, expect, it } from 'vitest';

import { makeComparable } from '@/features/comparable-analysis/services/test-helpers';
import { buildLivePages } from '@/features/live-seller/services/build-live-pages';
import {
  LIVE_SHORTLIST_SIZE,
  needsLiveShortlist,
  proposeLiveShortlist,
} from '@/features/live-seller/services/live-shortlist';
import { projectLiveForSeller } from '@/features/live-seller/services/project-live-for-seller';
import { buildSellerPresentation } from '@/features/seller-presentation/services/build-seller-presentation';
import type { CompetitorSearchCriteria } from '@/features/competitor-search/types';
import {
  DEMO_AT,
  demoProject,
  demoProperty,
  demoSavedPositioning,
} from '@/test-fixtures/demo-data';

// Mission 110 — un Live plus court : au-delà de 6 retenus, les 6 plus pertinents sont proposés.
const criteria: CompetitorSearchCriteria = {
  city: 'Nice',
  postalCode: '06000',
  propertyType: 'apartment',
  district: null,
  surfaceArea: 70,
  roomsCount: 3,
  advisorPriceMin: 360_000,
  advisorPriceMax: 400_000,
};

// Huit concurrents : les six premiers proches du bien, les deux derniers loin (surface, pièces, prix).
const eight = [
  ...Array.from({ length: 6 }, (_, index) =>
    makeComparable({
      id: `proche-${index}`,
      display_order: index + 3,
      city: 'Nice',
      surface_area: 70,
      rooms_count: 3,
      price: 380_000,
      property_type: 'apartment',
      is_selected: true,
    }),
  ),
  makeComparable({
    id: 'loin-1',
    display_order: 1,
    city: 'Nice',
    surface_area: 140,
    rooms_count: 6,
    price: 900_000,
    property_type: 'apartment',
    is_selected: true,
  }),
  makeComparable({
    id: 'loin-2',
    display_order: 2,
    city: 'Nice',
    surface_area: 30,
    rooms_count: 1,
    price: 120_000,
    property_type: 'apartment',
    is_selected: true,
  }),
];

describe('les 6 plus pertinents, au-delà de 6', () => {
  it('propose les plus proches du bien, même s’ils viennent après dans le dossier', () => {
    const list = proposeLiveShortlist(criteria, eight);
    expect(LIVE_SHORTLIST_SIZE).toBe(6);
    expect(
      list
        .filter((entry) => entry.proposed)
        .map((entry) => entry.id)
        .sort(),
    ).toEqual(Array.from({ length: 6 }, (_, index) => `proche-${index}`).sort());
    expect(
      list
        .slice(-2)
        .map((entry) => entry.id)
        .sort(),
    ).toEqual(['loin-1', 'loin-2']);
    expect(list[0].percent).toBeGreaterThan(list[7].percent ?? 0);
  });

  it('ne se demande qu’au-delà de 6 retenus, et une seule fois', () => {
    expect(needsLiveShortlist(6, null)).toBe(false);
    expect(needsLiveShortlist(7, null)).toBe(true);
    expect(needsLiveShortlist(8, '2026-10-19T10:00:00.000Z')).toBe(false);
  });

  const live = (comparables: typeof eight) =>
    buildSellerPresentation({
      project: demoProject,
      property: demoProperty,
      diagnostics: null,
      condominium: null,
      comparables,
      savedPositioning: demoSavedPositioning,
      sellerResponses: [],
      sellerSummary: null,
      generatedAt: DEMO_AT,
      propertyPhotoUrls: [],
    });

  it('un concurrent « hors Live » reste retenu, mais ne passe pas devant le vendeur', () => {
    const shortened = eight.map((comparable) =>
      comparable.id.startsWith('loin') ? { ...comparable, excluded_from_live: true } : comparable,
    );
    const presentation = live(shortened);
    expect(presentation.comparables).toHaveLength(8);
    expect(presentation.live?.comparables.map((entry) => entry.id)).toHaveLength(6);
    expect(JSON.stringify(presentation.live?.comparables)).not.toContain('loin-');
  });

  it('nombre d’écrans du Live pour 8 concurrents, avant et après (rythme accéléré)', () => {
    const screens = (comparables: typeof eight) => {
      const presentation = live(comparables);
      return buildLivePages(projectLiveForSeller(presentation.live!), true, 'accelerated').length;
    };
    const before = screens(eight);
    const after = screens(
      eight.map((comparable) =>
        comparable.id.startsWith('loin') ? { ...comparable, excluded_from_live: true } : comparable,
      ),
    );
    // Au-delà du 3e concurrent, deux écrans par concurrent (M95) : deux de moins = quatre écrans.
    expect(before - after).toBe(4);
    expect({ before, after }).toMatchSnapshot();
  });
});
