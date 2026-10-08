import { describe, expect, it } from 'vitest';

import { EXPOSURES, HEATING_TYPES } from '@/features/subject-property/constants/property-options';
import {
  gesListValue,
  keepListValues,
  listValue,
  listValues,
  translateHeating,
} from '@/features/subject-property/services/list-values';

// Mission 78 — a list field never receives a value outside its list.
describe('translateHeating', () => {
  it('translates what the portals publish', () => {
    expect(translateHeating('gaz individuel')).toBe('individual_gas'); // Bien'ici, Cagnes
    expect(translateHeating('radiateur électrique individuel')).toBe('individual_electric');
    expect(translateHeating('Individuel, fioul')).toBe('individual_fuel');
    expect(translateHeating('Gaz collectif')).toBe('collective_gas');
    expect(translateHeating('collectif au fuel')).toBe('collective_fuel');
    expect(translateHeating('Pompe à chaleur')).toBe('individual_heat_pump');
    expect(translateHeating('Électrique')).toBe('individual_electric');
    expect(translateHeating('poêle à bois')).toBe('individual_wood');
    expect(translateHeating('Réseau de chaleur')).toBe('collective_heat_network');
  });

  it('joins the heating and its energy source (Green Acres)', () => {
    expect(translateHeating('individuel', 'gaz')).toBe('individual_gas');
    // « central au fuel » : nothing says individual or collective.
    expect(translateHeating('central', 'fuel')).toBeNull();
  });

  it('keeps a value that is already in the list', () => {
    for (const value of HEATING_TYPES) expect(translateHeating(value)).toBe(value);
  });

  it('leaves the field empty when the heating is not recognised without ambiguity', () => {
    expect(translateHeating(null)).toBeNull();
    expect(translateHeating('  ')).toBeNull();
    expect(translateHeating('central')).toBeNull();
    expect(translateHeating('gaz')).toBeNull(); // individual or collective?
    expect(translateHeating('collectif')).toBeNull(); // which energy?
    expect(translateHeating('électrique collectif')).toBeNull(); // not in the list
    expect(translateHeating('gaz et électrique')).toBeNull(); // two energies decide nothing
    expect(translateHeating('individuel ou collectif gaz')).toBeNull();
    expect(translateHeating('climatisation réversible')).toBeNull();
    expect(translateHeating('au sol')).toBeNull();
  });
});

describe('list guards', () => {
  it('listValue keeps a value of the list and nothing else', () => {
    expect(listValue('south', EXPOSURES)).toBe('south');
    expect(listValue('Sud', EXPOSURES)).toBeNull();
    expect(listValue(null, EXPOSURES)).toBeNull();
  });

  it('listValues keeps the values of the list, once each', () => {
    expect(listValues(['garage', 'cave', 'garage'], ['garage', 'carport'])).toEqual(['garage']);
    expect(listValues(null, ['garage'])).toEqual([]);
  });

  it('gesListValue writes the class as the list does', () => {
    expect(gesListValue('d')).toBe('D');
    expect(gesListValue('H')).toBeNull();
    expect(gesListValue('Non communiqué')).toBeNull();
  });

  it('keepListValues empties every list field that holds a foreign value', () => {
    const kept = keepListValues({
      ges_rating: 'vierge',
      heating_type: 'chauffage au sol',
      exposure: 'plein sud',
      general_condition: 'refait',
      outdoor_spaces: ['terrace', 'cour'],
      parking_types: ['2 places'],
      city: 'Cagnes-sur-Mer',
    });
    expect(kept).toEqual({
      ges_rating: null,
      heating_type: null,
      exposure: null,
      general_condition: null,
      outdoor_spaces: ['terrace'],
      parking_types: [],
      city: 'Cagnes-sur-Mer',
    });
  });
});
