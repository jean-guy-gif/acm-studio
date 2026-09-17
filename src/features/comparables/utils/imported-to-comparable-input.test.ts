import { describe, expect, it } from 'vitest';

import { importedToComparableInput } from '@/features/comparables/utils/imported-to-comparable-input';
import type { ImportedComparableData } from '@/features/comparable-import/types';

function imported(over: Partial<ImportedComparableData> = {}): ImportedComparableData {
  return {
    title: 'Appartement à Nice',
    listingUrl: 'https://www.bienici.com/annonce/vente/nice/appartement/3pieces/iad-1',
    source: 'bienici',
    address: null,
    postalCode: '06000',
    city: 'Nice',
    district: null,
    surfaceArea: 66,
    landArea: null,
    roomsCount: 3,
    bedroomsCount: 2,
    bathroomsCount: null,
    energyRating: 'C',
    gesRating: null,
    constructionYear: null,
    heatingType: null,
    energySource: null,
    price: 464000,
    portalPricePerSquareMeter: 7030,
    floor: null,
    floorsCount: null,
    listingDescription: 'Bel appartement',
    listingFeatures: ['balcon'],
    outdoorSuggestions: [],
    photoUrls: ['https://file.bienici.com/photo/iad-1_1.jpg'],
    generalCondition: null,
    exposure: null,
    outdoorSpaces: ['balcony'],
    parkingTypes: [],
    listingPublishedAt: '2026-08-01',
    daysOnMarket: 30,
    publicationLowerBoundLabel: null,
    modifiedAt: null,
    viewCount: null,
    viewCountSince: null,
    ...over,
  };
}

describe('importedToComparableInput', () => {
  it('mappe les champs de l’annonce vers l’insert du concurrent (1:1 camel→snake)', () => {
    const input = importedToComparableInput(imported());
    expect(input).not.toBeNull();
    expect(input).toMatchObject({
      title: 'Appartement à Nice',
      postal_code: '06000',
      city: 'Nice',
      surface_area: 66,
      rooms_count: 3,
      bedrooms_count: 2,
      price: 464000,
      portal_price_per_square_meter: 7030,
      source: 'bienici',
      photo_urls: ['https://file.bienici.com/photo/iad-1_1.jpg'],
      outdoor_spaces: ['balcony'],
      listing_published_at: '2026-08-01',
      days_on_market: 30,
    });
  });

  it('refuse une annonce sans prix (le prix est requis, on n’invente pas un zéro)', () => {
    expect(importedToComparableInput(imported({ price: null }))).toBeNull();
    expect(importedToComparableInput(imported({ price: 0 }))).toBeNull();
  });
});
