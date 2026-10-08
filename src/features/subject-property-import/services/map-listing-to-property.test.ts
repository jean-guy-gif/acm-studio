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
    floor: null,
    floorsCount: null,
    listingDescription: 'Bel appartement traversant.',
    listingFeatures: ['balcon'],
    outdoorSuggestions: [],
    photoUrls: ['https://cdn.example/1.jpg', 'https://cdn.example/2.jpg'],
    generalCondition: 'good',
    exposure: 'south',
    outdoorSpaces: ['balcony'],
    parkingTypes: ['garage'],
    listingPublishedAt: null,
    daysOnMarket: null,
    publicationLowerBoundLabel: null,
    modifiedAt: null,
    viewCount: null,
    viewCountSince: null,
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

  it('GUARDRAIL: the prefill carries no sale price and no advisor range', () => {
    const { prefill } = mapListingToProperty(listing({ price: 430000 }));
    const keys = Object.keys(prefill);
    expect(keys).not.toContain('price');
    expect(keys).not.toContain('advisor_price_min');
    expect(keys).not.toContain('advisor_price_max');
    // The factual-cost fields exist (Mission 44) but a listing never fills them.
    expect(prefill.monthly_charges).toBeNull();
    expect(prefill.property_tax).toBeNull();
    // No key anywhere holds the read sale-price value.
    expect(JSON.stringify(prefill)).not.toContain('430000');
  });

  it('surfaces the read price as INFORMATION only (never a field)', () => {
    const { info } = mapListingToProperty(
      listing({ price: 430000, portalPricePerSquareMeter: 5972 }),
    );
    expect(info.readPrice).toBe(430000);
    expect(info.readPortalPricePerSquareMeter).toBe(5972);
  });

  // Mission 77 — the type the title names fills the list choice; the headline itself is
  // still never written anywhere.
  it('maps the type named by the title to its list label, never the title itself', () => {
    const { prefill } = mapListingToProperty(listing());
    expect(prefill.property_type).toBe('Appartement');
    expect(JSON.stringify(prefill)).not.toContain('Appartement T3 lumineux');
  });

  it('leaves the type empty when neither the title nor the address names one', () => {
    const { prefill } = mapListingToProperty(listing({ title: 'Bien rare à saisir' }));
    expect(prefill.property_type).toBeNull();
  });

  it('maps the floor and the number of floors when the listing publishes them', () => {
    const { prefill } = mapListingToProperty(listing({ floor: 2, floorsCount: 6 }));
    expect(prefill.floor).toBe(2);
    expect(prefill.building_floors).toBe(6);
    const empty = mapListingToProperty(listing()).prefill;
    expect(empty.floor).toBeNull();
    expect(empty.building_floors).toBeNull();
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
