import { describe, expect, it } from 'vitest';

import { mapComparableCharacteristics } from '@/features/comparable-import/services/map-comparable-characteristics';

describe('mapComparableCharacteristics', () => {
  it('extracts a general condition from clear text', () => {
    expect(
      mapComparableCharacteristics({ features: ['Appartement à rénover entièrement'] })
        .generalCondition,
    ).toBe('to_renovate');
    expect(mapComparableCharacteristics({ description: 'Bien en bon état' }).generalCondition).toBe(
      'good',
    );
  });

  it('extracts a single exposure (compound directions first)', () => {
    expect(mapComparableCharacteristics({ features: ['Exposition Sud'] }).exposure).toBe('south');
    expect(mapComparableCharacteristics({ description: 'Séjour sud-ouest' }).exposure).toBe(
      'south_west',
    );
    expect(mapComparableCharacteristics({ features: ['Appartement traversant'] }).exposure).toBe(
      'dual_aspect',
    );
  });

  it('extracts outdoor spaces (multiple, deduped)', () => {
    const mapped = mapComparableCharacteristics({
      features: ['Balcon filant', 'Grande terrasse', 'Jardin privatif'],
    });
    expect(mapped.outdoorSpaces.sort()).toEqual(['balcony', 'garden', 'terrace']);
  });

  it('does not double-count a rooftop terrace as a plain terrace', () => {
    expect(mapComparableCharacteristics({ features: ['Toit-terrasse'] }).outdoorSpaces).toEqual([
      'roof_terrace',
    ]);
  });

  it('extracts parking types', () => {
    const mapped = mapComparableCharacteristics({
      features: ['Garage fermé', 'Parking souterrain'],
    });
    expect(mapped.parkingTypes).toEqual(['garage', 'indoor_parking']);
  });

  it('leaves an ambiguous exposure null (two directions mentioned)', () => {
    expect(
      mapComparableCharacteristics({ description: 'Exposition sud et nord' }).exposure,
    ).toBeNull();
  });

  it('invents nothing when the text has no signal', () => {
    const mapped = mapComparableCharacteristics({
      features: ['Proche commerces'],
      description: '',
    });
    expect(mapped).toEqual({
      generalCondition: null,
      exposure: null,
      outdoorSpaces: [],
      parkingTypes: [],
    });
  });
});

// Terrain (19/08) — cas relevés sur les pages réelles envoyées par Laurent.
describe('mapComparableCharacteristics — relevés de terrain', () => {
  it('reconnaît un stationnement dit fermé comme un box', () => {
    // Green Acres : « emplacement de parking fermé » ne cochait rien.
    expect(
      mapComparableCharacteristics({ description: 'un emplacement de parking fermé au sous-sol' })
        .parkingTypes,
    ).toEqual(['closed_box']);
    expect(
      mapComparableCharacteristics({ features: ['Place de stationnement fermée'] }).parkingTypes,
    ).toEqual(['closed_box']);
  });

  it('reconnaît « entièrement rénové » sans le confondre avec « à rénover »', () => {
    // SeLoger affiche « État : Entièrement rénové » et la case restait vide.
    expect(
      mapComparableCharacteristics({ features: ['État Entièrement rénové'] }).generalCondition,
    ).toBe('excellent');
    expect(
      mapComparableCharacteristics({ description: 'appartement à rénover' }).generalCondition,
    ).toBe('to_renovate');
    // Les deux mentions dans la même annonce : on ne tranche pas.
    expect(
      mapComparableCharacteristics({
        description: 'séjour entièrement rénové, cuisine à rénover',
      }).generalCondition,
    ).toBeNull();
  });

  it('laisse vide un stationnement dont la nature n’est pas dite', () => {
    // « deux espaces de stationnement » (Green Acres) : couvert ou extérieur ?
    // La page ne le dit pas — on ne coche rien plutôt que de supposer.
    expect(
      mapComparableCharacteristics({
        description: 'deux espaces de stationnement accompagnent le bien',
      }).parkingTypes,
    ).toEqual([]);
  });
});
