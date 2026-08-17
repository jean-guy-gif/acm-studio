import { describe, expect, it } from 'vitest';

import { buildComparableFeatureComparison } from '@/features/live-seller/services/build-comparable-feature-comparison';
import type { FeatureBundle } from '@/features/live-seller/types';

function bundle(over: Partial<FeatureBundle> = {}): FeatureBundle {
  return {
    surfaceArea: null,
    roomsCount: null,
    bedroomsCount: null,
    generalCondition: null,
    energyRating: null,
    gesRating: null,
    outdoorSpaces: null,
    parkingTypes: null,
    exposure: null,
    ...over,
  };
}

function statusOf(list: ReturnType<typeof buildComparableFeatureComparison>, criterion: string) {
  return list.find((f) => f.criterion === criterion)?.comparisonStatus;
}

describe('buildComparableFeatureComparison', () => {
  it('returns one entry per criterion, in order', () => {
    const result = buildComparableFeatureComparison(bundle(), bundle());
    expect(result.map((f) => f.criterion)).toEqual([
      'surface',
      'rooms',
      'bedrooms',
      'condition',
      'energy_rating',
      'ges_rating',
      'outdoor',
      'parking',
      'exposure',
    ]);
  });

  it('surface: same within 5%, advantage when bigger, weakness when smaller', () => {
    expect(
      statusOf(
        buildComparableFeatureComparison(bundle({ surfaceArea: 80 }), bundle({ surfaceArea: 82 })),
        'surface',
      ),
    ).toBe('same'); // 2.5% diff
    expect(
      statusOf(
        buildComparableFeatureComparison(bundle({ surfaceArea: 80 }), bundle({ surfaceArea: 95 })),
        'surface',
      ),
    ).toBe('competitor_advantage');
    expect(
      statusOf(
        buildComparableFeatureComparison(bundle({ surfaceArea: 80 }), bundle({ surfaceArea: 65 })),
        'surface',
      ),
    ).toBe('competitor_weakness');
  });

  it('rooms and bedrooms use strict equality', () => {
    expect(
      statusOf(
        buildComparableFeatureComparison(bundle({ roomsCount: 3 }), bundle({ roomsCount: 3 })),
        'rooms',
      ),
    ).toBe('same');
    expect(
      statusOf(
        buildComparableFeatureComparison(bundle({ roomsCount: 3 }), bundle({ roomsCount: 4 })),
        'rooms',
      ),
    ).toBe('competitor_advantage');
    expect(
      statusOf(
        buildComparableFeatureComparison(
          bundle({ bedroomsCount: 2 }),
          bundle({ bedroomsCount: 1 }),
        ),
        'bedrooms',
      ),
    ).toBe('competitor_weakness');
  });

  it('condition uses the deterministic order (better condition = advantage)', () => {
    expect(
      statusOf(
        buildComparableFeatureComparison(
          bundle({ generalCondition: 'good' }),
          bundle({ generalCondition: 'excellent' }),
        ),
        'condition',
      ),
    ).toBe('competitor_advantage');
    expect(
      statusOf(
        buildComparableFeatureComparison(
          bundle({ generalCondition: 'good' }),
          bundle({ generalCondition: 'to_renovate' }),
        ),
        'condition',
      ),
    ).toBe('competitor_weakness');
    expect(
      statusOf(
        buildComparableFeatureComparison(
          bundle({ generalCondition: 'good' }),
          bundle({ generalCondition: 'good' }),
        ),
        'condition',
      ),
    ).toBe('same');
  });

  it('DPE and GES: better letter (A>G) is an advantage', () => {
    expect(
      statusOf(
        buildComparableFeatureComparison(
          bundle({ energyRating: 'D' }),
          bundle({ energyRating: 'B' }),
        ),
        'energy_rating',
      ),
    ).toBe('competitor_advantage');
    expect(
      statusOf(
        buildComparableFeatureComparison(bundle({ gesRating: 'B' }), bundle({ gesRating: 'E' })),
        'ges_rating',
      ),
    ).toBe('competitor_weakness');
    expect(
      statusOf(
        buildComparableFeatureComparison(
          bundle({ energyRating: 'C' }),
          bundle({ energyRating: 'C' }),
        ),
        'energy_rating',
      ),
    ).toBe('same');
  });

  it('outdoor and parking compare presence/quantity', () => {
    expect(
      statusOf(
        buildComparableFeatureComparison(
          bundle({ outdoorSpaces: [] }),
          bundle({ outdoorSpaces: ['balcony'] }),
        ),
        'outdoor',
      ),
    ).toBe('competitor_advantage');
    expect(
      statusOf(
        buildComparableFeatureComparison(
          bundle({ parkingTypes: ['garage'] }),
          bundle({ parkingTypes: ['none'] }),
        ),
        'parking',
      ),
    ).toBe('competitor_weakness');
    expect(
      statusOf(
        buildComparableFeatureComparison(
          bundle({ outdoorSpaces: ['terrace'] }),
          bundle({ outdoorSpaces: ['balcony'] }),
        ),
        'outdoor',
      ),
    ).toBe('same'); // both have exactly one usable outdoor space
  });

  it('exposure uses the business ranking', () => {
    expect(
      statusOf(
        buildComparableFeatureComparison(
          bundle({ exposure: 'north' }),
          bundle({ exposure: 'south' }),
        ),
        'exposure',
      ),
    ).toBe('competitor_advantage');
    expect(
      statusOf(
        buildComparableFeatureComparison(
          bundle({ exposure: 'south' }),
          bundle({ exposure: 'north' }),
        ),
        'exposure',
      ),
    ).toBe('competitor_weakness');
  });

  it('missing data on either side yields unknown, never an invented conclusion', () => {
    const result = buildComparableFeatureComparison(bundle(), bundle());
    expect(result.every((f) => f.comparisonStatus === 'unknown')).toBe(true);
    expect(
      statusOf(buildComparableFeatureComparison(bundle({ surfaceArea: 80 }), bundle()), 'surface'),
    ).toBe('unknown');
    expect(
      statusOf(
        buildComparableFeatureComparison(
          bundle({ exposure: 'multiple' }),
          bundle({ exposure: 'south' }),
        ),
        'exposure',
      ),
    ).toBe('unknown'); // `multiple` has a null rank (neutral)
  });

  it('never mutates its inputs and exposes both raw values', () => {
    const subject = bundle({ surfaceArea: 80 });
    const comparable = bundle({ surfaceArea: 95 });
    const result = buildComparableFeatureComparison(subject, comparable);
    const surface = result.find((f) => f.criterion === 'surface');
    expect(surface?.subjectValue).toBe('80 m²');
    expect(surface?.comparableValue).toBe('95 m²');
    expect(subject.surfaceArea).toBe(80);
  });
});

// Anti-régression : les cartes comparatives Live doivent afficher les valeurs
// techniques traduites en français (jamais l'enum interne brut « good », « south »,
// « balcony »…), en réutilisant les mêmes dictionnaires que le Builder.
function valueOf(criterion: string, over: Partial<FeatureBundle>) {
  return buildComparableFeatureComparison(bundle(), bundle(over)).find(
    (f) => f.criterion === criterion,
  )?.comparableValue;
}

describe('francisation des valeurs affichées (Live)', () => {
  it('reproduit les cas de bug signalés : good→Bon, south→Sud, balcony→Balcon', () => {
    expect(valueOf('condition', { generalCondition: 'good' })).toBe('Bon');
    expect(valueOf('exposure', { exposure: 'south' })).toBe('Sud');
    expect(valueOf('outdoor', { outdoorSpaces: ['balcony'] })).toBe('Balcon');
  });

  it('general_condition : mapping complet', () => {
    expect(valueOf('condition', { generalCondition: 'new' })).toBe('Neuf');
    expect(valueOf('condition', { generalCondition: 'excellent' })).toBe('Excellent');
    expect(valueOf('condition', { generalCondition: 'good' })).toBe('Bon');
    expect(valueOf('condition', { generalCondition: 'to_refresh' })).toBe('À rafraîchir');
    expect(valueOf('condition', { generalCondition: 'to_renovate' })).toBe('À rénover');
    expect(valueOf('condition', { generalCondition: 'major_renovation' })).toBe('Gros travaux');
  });

  it('exposure : mapping complet', () => {
    expect(valueOf('exposure', { exposure: 'north' })).toBe('Nord');
    expect(valueOf('exposure', { exposure: 'north_east' })).toBe('Nord-Est');
    expect(valueOf('exposure', { exposure: 'east' })).toBe('Est');
    expect(valueOf('exposure', { exposure: 'south_east' })).toBe('Sud-Est');
    expect(valueOf('exposure', { exposure: 'south' })).toBe('Sud');
    expect(valueOf('exposure', { exposure: 'south_west' })).toBe('Sud-Ouest');
    expect(valueOf('exposure', { exposure: 'west' })).toBe('Ouest');
    expect(valueOf('exposure', { exposure: 'north_west' })).toBe('Nord-Ouest');
    expect(valueOf('exposure', { exposure: 'dual_aspect' })).toBe('Traversant');
    expect(valueOf('exposure', { exposure: 'multiple' })).toBe('Multiple');
    expect(valueOf('exposure', { exposure: 'unknown' })).toBe('Non renseignée');
  });

  it('outdoor_spaces : mapping complet + jointure multi-valeurs + Aucun', () => {
    expect(valueOf('outdoor', { outdoorSpaces: ['balcony'] })).toBe('Balcon');
    expect(valueOf('outdoor', { outdoorSpaces: ['terrace'] })).toBe('Terrasse');
    expect(valueOf('outdoor', { outdoorSpaces: ['garden'] })).toBe('Jardin');
    expect(valueOf('outdoor', { outdoorSpaces: ['loggia'] })).toBe('Loggia');
    expect(valueOf('outdoor', { outdoorSpaces: ['veranda'] })).toBe('Véranda');
    expect(valueOf('outdoor', { outdoorSpaces: ['roof_terrace'] })).toBe('Toit-terrasse');
    expect(valueOf('outdoor', { outdoorSpaces: ['balcony', 'terrace'] })).toBe('Balcon, Terrasse');
    expect(valueOf('outdoor', { outdoorSpaces: ['none'] })).toBe('Aucun');
    expect(valueOf('outdoor', { outdoorSpaces: [] })).toBe('Aucun');
  });

  it('parking_types : mapping complet + Aucun', () => {
    expect(valueOf('parking', { parkingTypes: ['garage'] })).toBe('Garage');
    expect(valueOf('parking', { parkingTypes: ['closed_box'] })).toBe('Box fermé');
    expect(valueOf('parking', { parkingTypes: ['indoor_parking'] })).toBe('Parking couvert');
    expect(valueOf('parking', { parkingTypes: ['outdoor_parking'] })).toBe('Parking extérieur');
    expect(valueOf('parking', { parkingTypes: ['carport'] })).toBe('Carport');
    expect(valueOf('parking', { parkingTypes: ['none'] })).toBe('Aucun');
  });

  it('DPE/GES : les lettres A–G restent inchangées (déjà correctes)', () => {
    expect(valueOf('energy_rating', { energyRating: 'D' })).toBe('D');
    expect(valueOf('ges_rating', { gesRating: 'B' })).toBe('B');
  });

  it('aucun jeton anglais interne ne fuit dans l’affichage', () => {
    const raws = ['good', 'south', 'balcony', 'garage', 'to_renovate'];
    const shown = [
      valueOf('condition', { generalCondition: 'good' }),
      valueOf('exposure', { exposure: 'south' }),
      valueOf('outdoor', { outdoorSpaces: ['balcony'] }),
      valueOf('parking', { parkingTypes: ['garage'] }),
      valueOf('condition', { generalCondition: 'to_renovate' }),
    ];
    for (const value of shown) {
      expect(raws).not.toContain(value);
    }
  });
});
