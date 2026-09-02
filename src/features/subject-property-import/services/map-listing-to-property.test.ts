import { describe, expect, it } from 'vitest';

import type { ImportedComparableData } from '@/features/comparable-import/types';
import { mapListingToProperty } from '@/features/subject-property-import/services/map-listing-to-property';

function listing(over: Partial<ImportedComparableData> = {}): ImportedComparableData {
  return {
    title: 'Appartement T3 lumineux',
    listingUrl: 'https://portal.example/annonce/1',
    source: 'SeLoger',
    address: '5 rue des Oliviers',
    postalCode: '06600',
    city: 'Antibes',
    district: 'Centre',
    surfaceArea: 72,
    landArea: null,
    roomsCount: 3,
    bedroomsCount: 2,
    bathroomsCount: 1,
    energyRating: 'C',
    gesRating: 'D',
    constructionYear: 2001,
    heatingType: 'individual_gas',
    energySource: null,
    price: 430000,
    portalPricePerSquareMeter: 5972,
    listingDescription: 'Bel appartement traversant.',
    listingFeatures: ['balcon'],
    photoUrls: ['https://cdn.example/1.jpg', 'https://cdn.example/2.jpg'],
    generalCondition: 'good',
    exposure: 'south',
    outdoorSpaces: ['balcony'],
    parkingTypes: ['garage'],
    listingPublishedAt: null,
    daysOnMarket: null,
    ...over,
  };
}

describe('mapListingToProperty', () => {
  it('maps the characteristics to the seller-property prefill', () => {
    const { prefill } = mapListingToProperty(listing());
    expect(prefill.surface_area).toBe(72);
    expect(prefill.rooms_count).toBe(3);
    expect(prefill.city).toBe('Antibes');
    expect(prefill.energy_rating).toBe('C');
    expect(prefill.general_condition).toBe('good');
    expect(prefill.exposure).toBe('south');
    expect(prefill.outdoor_spaces).toEqual(['balcony']);
    expect(prefill.parking_types).toEqual(['garage']);
    expect(prefill.description).toBe('Bel appartement traversant.');
  });

  it('GUARDRAIL: the prefill carries no price and no advisor range', () => {
    const { prefill } = mapListingToProperty(listing({ price: 430000 }));
    const keys = Object.keys(prefill);
    expect(keys).not.toContain('price');
    expect(keys).not.toContain('advisor_price_min');
    expect(keys).not.toContain('advisor_price_max');
    expect(keys).not.toContain('monthly_charges');
    // No key anywhere holds the read price value.
    expect(JSON.stringify(prefill)).not.toContain('430000');
  });

  it('surfaces the read price as INFORMATION only (never a field)', () => {
    const { info } = mapListingToProperty(
      listing({ price: 430000, portalPricePerSquareMeter: 5972 }),
    );
    expect(info.readPrice).toBe(430000);
    expect(info.readPortalPricePerSquareMeter).toBe(5972);
  });

  it('does not map the listing title to a property type', () => {
    const { prefill } = mapListingToProperty(listing());
    expect(prefill).not.toHaveProperty('property_type');
    expect(JSON.stringify(prefill)).not.toContain('Appartement T3 lumineux');
  });

  it('reports the detected photo count without pre-filling any photo field', () => {
    const { prefill, info } = mapListingToProperty(listing());
    expect(info.detectedPhotoCount).toBe(2);
    expect(prefill).not.toHaveProperty('photo_urls');
    expect(JSON.stringify(prefill)).not.toContain('cdn.example');
  });

  it('leaves fields the listing did not carry empty', () => {
    const { prefill } = mapListingToProperty(listing({ surfaceArea: null, city: null }));
    expect(prefill.surface_area).toBeNull();
    expect(prefill.city).toBeNull();
  });
});
