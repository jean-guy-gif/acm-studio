import { describe, expect, it } from 'vitest';

import {
  appendFilterParams,
  checkFilters,
  DEFAULT_SEARCH_FILTERS,
  describeFilters,
  type SearchFilters,
} from '@/features/competitor-search/services/search-filters';
import { readSearchFiltersInput } from '@/features/competitor-search/services/search-filters-schema';
import {
  parseSavedSearchSettings,
  parseSearchSettings,
  savedSearchSettingsSchema,
} from '@/features/competitor-search/services/search-settings-schema';
import {
  applySavedSearch,
  DEFAULT_SEARCH_SETTINGS,
  isDefaultSettings,
  savedSearchSettings,
  type SearchSettings,
} from '@/features/competitor-search/services/search-settings';
import {
  describeSavedSearch,
  readSavedSearchName,
} from '@/features/competitor-search/services/saved-searches';
import type { CompetitorCandidate } from '@/features/competitor-search/types';

const filters = (patch: Partial<SearchFilters>): SearchFilters => ({
  ...DEFAULT_SEARCH_FILTERS,
  ...patch,
});

function candidate(patch: Partial<CompetitorCandidate> = {}): CompetitorCandidate {
  return {
    key: 'k',
    url: 'https://www.seloger.com/annonces/achat/maison/k.htm',
    title: null,
    price: 900000,
    surfaceArea: 150,
    roomsCount: 5,
    propertyType: 'house',
    pricePerSqm: null,
    landArea: null,
    city: 'Vence',
    photoUrls: [],
    isNewBuild: false,
    ...patch,
  };
}

const features = (patch: Partial<NonNullable<CompetitorCandidate['features']>>) => ({
  location: null,
  locationDiscarded: false,
  district: null,
  floor: null,
  hasElevator: null,
  hasPool: null,
  parking: null,
  outdoor: null,
  condition: null,
  exposure: null,
  constructionYear: null,
  ...patch,
});

describe('les critères de la mission 110', () => {
  it('sans critère, tout bien passe', () => {
    expect(checkFilters(DEFAULT_SEARCH_FILTERS, candidate())).toEqual({ kind: 'meets' });
  });

  it('une donnée connue qui ne remplit pas le critère écarte', () => {
    expect(checkFilters(filters({ minLand: 1000 }), candidate({ landArea: 800 }))).toEqual({
      kind: 'fails',
      failing: ['minLand'],
    });
    expect(
      checkFilters(filters({ pool: true }), candidate({ features: features({ hasPool: false }) })),
    ).toEqual({ kind: 'fails', failing: ['pool'] });
    expect(checkFilters(filters({ dpe: ['A', 'B'] }), candidate({ energyClass: 'D' }))).toEqual({
      kind: 'fails',
      failing: ['dpe'],
    });
  });

  it('une donnée absente garde le bien, et dit laquelle', () => {
    expect(checkFilters(filters({ minLand: 1000, pool: true }), candidate())).toEqual({
      kind: 'unknown',
      unknown: ['minLand', 'pool'],
    });
  });

  it('extérieur : au moins l’un des cochés ; écarté seulement si tous sont dits absents', () => {
    const wanted = filters({ outdoor: ['terrace', 'garden'] });
    const outdoor = (present: string[], absent: string[]) =>
      candidate({ features: features({ outdoor: { present, absent } }) });
    expect(checkFilters(wanted, outdoor(['garden'], [])).kind).toBe('meets');
    expect(checkFilters(wanted, outdoor([], ['terrace'])).kind).toBe('unknown');
    expect(checkFilters(wanted, outdoor([], ['terrace', 'garden'])).kind).toBe('fails');
  });

  it('seul le DPE part dans la requête', () => {
    const params = new URLSearchParams();
    appendFilterParams(params, filters({ dpe: ['C', 'D'], minFloor: 3, minLand: 500, pool: true }));
    expect([...params.keys()]).toEqual(['energyCategories[]', 'energyCategories[]']);
    expect(params.getAll('energyCategories[]')).toEqual(['C', 'D']);
  });

  it('ce que l’écran envoie est relu', () => {
    expect(
      readSearchFiltersInput({
        dpe: ['D', 'A', 'Z'],
        minFloor: ' 2 ',
        outdoor: ['garden', 'pool'],
        minLand: '1 500 m²',
        pool: true,
      }),
    ).toEqual({
      ok: true,
      filters: { dpe: ['A', 'D'], minFloor: 2, outdoor: ['garden'], minLand: 1500, pool: true },
    });
    expect(readSearchFiltersInput({ ...emptyInput(), minFloor: 'deux' }).ok).toBe(false);
    expect(readSearchFiltersInput({ ...emptyInput(), minLand: '0' }).ok).toBe(false);
  });

  it('le bilan les dit', () => {
    expect(
      describeFilters(
        filters({ dpe: ['A', 'B', 'C'], minFloor: 1, outdoor: ['balcony', 'terrace'], pool: true }),
      ),
    ).toEqual(['DPE A, B, C', '1er étage ou plus', 'Balcon ou terrasse', 'Piscine']);
  });
});

function emptyInput() {
  return { dpe: [], minFloor: '', outdoor: [], minLand: '', pool: false };
}

const FULL: SearchSettings = {
  sector: { kind: 'radius', km: 5 },
  price: { min: 800_000, max: 1_200_000 },
  rooms: { min: 5, max: 7 },
  surface: { min: 140, max: 220 },
  autoWiden: false,
  filters: filters({ minLand: 1000, pool: true }),
};

describe('une recherche nommée ne garde jamais de prix, de pièces ni de surface', () => {
  it('seuls le secteur, l’élargissement et les critères sont gardés', () => {
    const saved = savedSearchSettings(FULL);
    expect(Object.keys(saved).sort()).toEqual(['autoWiden', 'filters', 'sector']);
    expect(JSON.stringify(saved)).not.toMatch(/price|rooms|surface/);
  });

  it('une recherche gardée qui porterait un prix est refusée à la relecture', () => {
    expect(
      parseSavedSearchSettings({ ...savedSearchSettings(FULL), price: FULL.price }),
    ).toBeNull();
    expect(savedSearchSettingsSchema.safeParse(FULL).success).toBe(false);
  });

  it('la rappeler sur un dossier garde le prix, les pièces et la surface de CE dossier', () => {
    const other: SearchSettings = {
      ...DEFAULT_SEARCH_SETTINGS,
      price: { min: 300_000, max: 380_000 },
      rooms: { min: 3, max: 3 },
    };
    const applied = applySavedSearch(other, savedSearchSettings(FULL));
    expect(applied).toEqual({
      ...other,
      sector: FULL.sector,
      autoWiden: false,
      filters: FULL.filters,
    });
  });

  it('se dit sans montant', () => {
    // Le formateur (M74) lie les milliers et l'unité par des espaces insécables.
    expect(describeSavedSearch(savedSearchSettings(FULL)).replace(/[\u202f\u00a0]/g, ' ')).toBe(
      'Rayon 5 km · Terrain de 1 000 m² ou plus · Piscine · sans élargissement',
    );
  });

  it('un nom de 1 à 60 caractères, espaces resserrés', () => {
    expect(readSavedSearchName('  Villas   Vence ')).toBe('Villas Vence');
    expect(readSavedSearchName('   ')).toBeNull();
    expect(readSavedSearchName('x'.repeat(61))).toBeNull();
    expect(readSavedSearchName(42)).toBeNull();
  });
});

describe('des réglages d’avant la mission 110', () => {
  it('se relisent sans critère, et restent « automatiques » s’ils l’étaient', () => {
    const old = {
      sector: null,
      price: null,
      rooms: null,
      surface: null,
      autoWiden: true,
    };
    expect(parseSearchSettings(old)).toEqual(DEFAULT_SEARCH_SETTINGS);
    expect(isDefaultSettings(parseSearchSettings(old))).toBe(true);
    expect(
      isDefaultSettings({ ...DEFAULT_SEARCH_SETTINGS, filters: filters({ pool: true }) }),
    ).toBe(false);
  });
});
