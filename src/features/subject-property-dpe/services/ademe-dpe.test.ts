import { describe, expect, it } from 'vitest';

import {
  ademeDpeUrl,
  banHouseNumberId,
  chooseDpe,
  translateDpeHeating,
} from '@/features/subject-property-dpe/services/ademe-dpe';

// Mission 79 — the official DPE (ADEME). Rows below are the ones measured on 08/10/2026.

const ban = (type: string, id: string, score = 0.97, city = 'Cagnes-sur-Mer') => ({
  features: [
    { geometry: { coordinates: [7.15, 43.66] }, properties: { id, type, score, city, label: '' } },
  ],
});

describe('banHouseNumberId', () => {
  it('gives the BAN id of an address found at the house number', () => {
    expect(banHouseNumberId(ban('housenumber', '06027_b25z26_00014'), 'Cagnes-sur-Mer')).toBe(
      '06027_b25z26_00014',
    );
  });
  it('refuses a street: ADEME would return the DPE of the whole street', () => {
    expect(banHouseNumberId(ban('street', '06027_0840', 0.83), 'Cagnes-sur-Mer')).toBeNull();
  });
  it('follows the rule of geocode-subject: low score, other city, nothing found', () => {
    expect(banHouseNumberId(ban('housenumber', '06027_1_00014', 0.6), 'Cagnes-sur-Mer')).toBeNull();
    expect(banHouseNumberId(ban('housenumber', '06027_1_00014'), 'Nice')).toBeNull();
    expect(banHouseNumberId({ features: [] }, 'Nice')).toBeNull();
    expect(banHouseNumberId(null, 'Nice')).toBeNull();
  });
  it('refuses an id that could break out of the query', () => {
    expect(banHouseNumberId(ban('housenumber', '06027" OR "1'), 'Cagnes-sur-Mer')).toBeNull();
  });
});

describe('ademeDpeUrl', () => {
  it('asks the post-2021 dataset for the exact BAN id', () => {
    const url = new URL(ademeDpeUrl('06088_3372_00012'));
    expect(url.origin + url.pathname).toBe(
      'https://data.ademe.fr/data-fair/api/v1/datasets/dpe03existant/lines',
    );
    expect(url.searchParams.get('qs')).toBe('identifiant_ban:"06088_3372_00012"');
  });
});

const row = (overrides: Record<string, unknown> = {}) => ({
  date_etablissement_dpe: '2023-04-02',
  type_batiment: 'appartement',
  surface_habitable_logement: 42.6,
  etiquette_dpe: 'E',
  etiquette_ges: 'E',
  type_energie_principale_chauffage: 'Gaz naturel',
  type_installation_chauffage: 'collectif',
  ...overrides,
});
const heating = (overrides: Record<string, unknown>) => translateDpeHeating(row(overrides));

describe('translateDpeHeating', () => {
  it('translates energy and installation into the list', () => {
    expect(heating({})).toBe('collective_gas');
    expect(
      heating({
        type_energie_principale_chauffage: 'Gaz naturel',
        type_installation_chauffage: 'individuel',
      }),
    ).toBe('individual_gas');
    expect(
      heating({
        type_energie_principale_chauffage: 'Fioul domestique',
        type_installation_chauffage: 'collectif',
      }),
    ).toBe('collective_fuel');
    expect(
      heating({
        type_energie_principale_chauffage: 'Bois – Bûches',
        type_installation_chauffage: 'individuel',
      }),
    ).toBe('individual_wood');
    expect(
      heating({
        type_energie_principale_chauffage: 'Bois – Granulés (pellets) ou briquettes',
        type_installation_chauffage: 'individuel',
      }),
    ).toBe('individual_wood');
    expect(heating({ type_energie_principale_chauffage: 'Réseau de Chauffage urbain' })).toBe(
      'collective_heat_network',
    );
  });

  it('a house is individual: its installation is always empty in the base', () => {
    expect(
      heating({
        type_batiment: 'maison',
        type_energie_principale_chauffage: 'Fioul domestique',
        type_installation_chauffage: undefined,
      }),
    ).toBe('individual_fuel');
    // An apartment whose installation is unknown decides nothing for gas.
    expect(heating({ type_installation_chauffage: undefined })).toBeNull();
  });

  it('heat pump only when the generator says so; electricity alone stays electric', () => {
    const electric = {
      type_energie_principale_chauffage: 'Électricité',
      type_installation_chauffage: 'individuel',
    };
    expect(heating(electric)).toBe('individual_electric');
    expect(
      heating({
        ...electric,
        type_generateur_chauffage_principal: 'PAC air/air installée à partir de 2015',
      }),
    ).toBe('individual_heat_pump');
    expect(
      heating({
        ...electric,
        type_generateur_chauffage_principal: 'radiateur électrique NFC, NF** et NF***',
      }),
    ).toBe('individual_electric');
  });

  it('« mixte (collectif-individuel) » is the « mixte » choice', () => {
    expect(heating({ type_installation_chauffage: 'mixte (collectif-individuel)' })).toBe('mixed');
  });

  it('leaves empty what the list cannot say', () => {
    expect(
      heating({
        type_energie_principale_chauffage: 'Électricité',
        type_installation_chauffage: 'collectif',
      }),
    ).toBeNull();
    for (const energy of ['Propane', 'GPL', 'Butane', 'Charbon']) {
      expect(
        heating({
          type_energie_principale_chauffage: energy,
          type_installation_chauffage: 'individuel',
        }),
      ).toBeNull();
    }
  });
});

const lines = (...results: unknown[]) => ({ total: results.length, results });
const apartment = (surface: number | null = null) => ({ propertyType: 'Appartement', surface });

describe('chooseDpe', () => {
  it('a single DPE fills the three fields, with its date (12 avenue Jean Médecin, Nice)', () => {
    expect(chooseDpe(lines(row()), apartment())).toEqual({
      heating_type: { value: 'collective_gas', date: '2023-04-02' },
      energy_rating: { value: 'E', date: '2023-04-02' },
      ges_rating: { value: 'E', date: '2023-04-02' },
    });
  });

  it('several DPE that agree fill the field, dated by the most recent — field by field', () => {
    const reading = chooseDpe(
      lines(
        row({ date_etablissement_dpe: '2024-05-17', etiquette_dpe: 'D', etiquette_ges: 'B' }),
        row({ date_etablissement_dpe: '2026-08-31', etiquette_dpe: 'C', etiquette_ges: 'B' }),
      ),
      apartment(),
    );
    expect(reading.heating_type).toEqual({ value: 'collective_gas', date: '2026-08-31' });
    expect(reading.ges_rating).toEqual({ value: 'B', date: '2026-08-31' });
    expect(reading.energy_rating).toBeUndefined();
  });

  it('when they disagree, only the DPE within 5 % of the surface decide', () => {
    const gas = row({
      surface_habitable_logement: 54.8,
      type_installation_chauffage: 'individuel',
    });
    const electric = row({
      surface_habitable_logement: 80,
      etiquette_dpe: 'D',
      type_energie_principale_chauffage: 'Électricité',
      type_installation_chauffage: 'individuel',
    });
    expect(chooseDpe(lines(gas, electric), apartment(55)).heating_type?.value).toBe(
      'individual_gas',
    );
    expect(chooseDpe(lines(gas, electric), apartment(55)).energy_rating?.value).toBe('E');
    // No surface on the sheet, or none close enough: empty, silently.
    expect(chooseDpe(lines(gas, electric), apartment())).toEqual({
      ges_rating: { value: 'E', date: '2023-04-02' },
    });
    expect(chooseDpe(lines(gas, electric), apartment(65)).heating_type).toBeUndefined();
  });

  it('the same flat diagnosed twice counts; two different flats of the same size do not', () => {
    const first = row({ surface_habitable_logement: 27.4, date_etablissement_dpe: '2024-05-17' });
    const again = row({ surface_habitable_logement: 27.4, date_etablissement_dpe: '2026-08-31' });
    const other = row({ surface_habitable_logement: 90, etiquette_dpe: 'B' });
    expect(chooseDpe(lines(first, again, other), apartment(27)).energy_rating).toEqual({
      value: 'E',
      date: '2026-08-31',
    });
    const neighbour = row({ surface_habitable_logement: 26.8, etiquette_dpe: 'C' });
    expect(chooseDpe(lines(first, neighbour, other), apartment(27)).energy_rating).toBeUndefined();
  });

  it('ignores a building DPE and a DPE of another type than the property', () => {
    const building = row({
      type_batiment: 'immeuble',
      surface_habitable_logement: undefined,
      etiquette_dpe: 'G',
    });
    const house = row({ type_batiment: 'maison', etiquette_dpe: 'A' });
    expect(chooseDpe(lines(row(), building, house), apartment()).energy_rating?.value).toBe('E');
    expect(chooseDpe(lines(building), apartment())).toEqual({});
    expect(chooseDpe(lines(row()), { propertyType: 'Maison', surface: null })).toEqual({});
  });

  it('decides nothing without a house or apartment type, or on an unreadable answer', () => {
    expect(chooseDpe(lines(row()), { propertyType: null, surface: null })).toEqual({});
    expect(chooseDpe(lines(row()), { propertyType: 'Terrain', surface: null })).toEqual({});
    expect(chooseDpe({ error: 'nope' }, apartment())).toEqual({});
    // More DPE than rows read: « all agree » cannot be said.
    expect(chooseDpe({ total: 250, results: [row()] }, apartment())).toEqual({});
  });

  it('writes a class as a single letter A to G, nothing else', () => {
    expect(
      chooseDpe(lines(row({ etiquette_dpe: 'e', etiquette_ges: 'N.C.' })), apartment()),
    ).toEqual({
      heating_type: { value: 'collective_gas', date: '2023-04-02' },
      energy_rating: { value: 'E', date: '2023-04-02' },
    });
  });
});
