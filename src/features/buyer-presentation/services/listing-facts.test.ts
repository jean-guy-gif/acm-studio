import { describe, expect, it } from 'vitest';

import { judgeForBuyer } from '@/features/buyer-deck/services/buyer-deck';
import {
  listingOutdoor,
  listingParking,
} from '@/features/buyer-presentation/services/listing-facts';
import type { PresentedItemInput } from '@/features/buyer-presentation/types';
import type { BuyerInput } from '@/features/buyers/types';

const buyer = {
  propertyTypes: [],
  cities: [],
  budgetMax: null,
  roomsMin: null,
  bedroomsMin: null,
  surfaceMin: null,
  outdoor: true,
  parking: true,
  pool: null,
  floorMin: null,
  elevator: null,
  energyRatingMax: null,
  worksAccepted: null,
  mustHave: [],
} as unknown as BuyerInput;

const judge = (criterion: 'parking' | 'outdoor', values: string[]) =>
  judgeForBuyer(criterion, buyer, {
    source: 'listing',
    outdoor: criterion === 'outdoor' ? values : [],
    parking: criterion === 'parking' ? values : [],
  } as unknown as PresentedItemInput);

// Mission 122 (décision de Jean-Guy, 25/10) — un parking connu comme absent sur la carte de
// recherche se dit « ✗ Pas de parking », jamais « ? à vérifier ».
describe('le parking et l’extérieur d’une annonce du marché', () => {
  it('une carte qui ne nomme aucun parking : « ✗ Pas de parking »', () => {
    const parking = listingParking(null, { parking: [] });
    expect(parking).toEqual(['none']);
    expect(judge('parking', parking)).toEqual({ mark: 'no', text: 'Pas de parking' });
  });

  it('une carte qui ne dit rien du parking : « ? à vérifier »', () => {
    const parking = listingParking(null, { parking: null });
    expect(parking).toEqual([]);
    expect(judge('parking', parking).mark).toBe('check');
    expect(listingParking(null, null)).toEqual([]);
  });

  it('une carte qui nomme un garage : « ✓ » ; l’annonce importée l’emporte', () => {
    expect(judge('parking', listingParking(null, { parking: ['garage'] })).mark).toBe('ok');
    expect(listingParking({ parkingTypes: ['box'] }, { parking: [] })).toEqual(['box']);
  });

  it('l’extérieur dit absent (« Pas de balcon ») : « ✗ Pas d’extérieur »', () => {
    const outdoor = listingOutdoor(null, { present: [] });
    expect(outdoor).toEqual(['none']);
    expect(judge('outdoor', outdoor)).toEqual({ mark: 'no', text: 'Pas d’extérieur' });
    expect(listingOutdoor(null, null)).toEqual([]);
  });
});
