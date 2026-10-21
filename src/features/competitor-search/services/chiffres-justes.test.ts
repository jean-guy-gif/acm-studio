import { describe, expect, it } from 'vitest';

import { searchFingerprint } from '@/features/competitor-search/services/paid-search-guard';
import {
  DEFAULT_SEARCH_FILTERS,
  sortedFiltersLoosened,
  sortReceived,
  type SearchFilters,
} from '@/features/competitor-search/services/search-filters';
import {
  DEFAULT_SEARCH_SETTINGS,
  isDefaultSettings,
  settingsChangeKind,
  type SearchSettings,
} from '@/features/competitor-search/services/search-settings';
import {
  afterSettingsChange,
  describeStreamEstateSearch,
  RESORTED_LOOSER_NOTE,
  RESORTED_NOTE,
  STALE_SETTINGS_NOTE,
  type StreamEstateSearchNote,
} from '@/features/competitor-search/services/stream-estate-summary';
import type {
  CompetitorCandidate,
  CompetitorSearchCriteria,
} from '@/features/competitor-search/types';

// Mission 111 — affiner un critère ne fait plus perdre ni repayer en silence.

const filters = (patch: Partial<SearchFilters>): SearchFilters => ({
  ...DEFAULT_SEARCH_FILTERS,
  ...patch,
});
const settings = (patch: Partial<SearchSettings>): SearchSettings => ({
  ...DEFAULT_SEARCH_SETTINGS,
  ...patch,
});

function stream(
  key: string,
  floor: number | null,
  pool: boolean | null = null,
): CompetitorCandidate {
  return {
    key,
    url: `https://www.seloger.com/annonces/achat/appartement/${key}.htm`,
    title: null,
    price: 400_000,
    surfaceArea: 70,
    roomsCount: 3,
    propertyType: 'apartment',
    pricePerSqm: null,
    landArea: null,
    city: 'Nice',
    photoUrls: [],
    isNewBuild: false,
    features: {
      location: null,
      locationDiscarded: false,
      district: null,
      floor,
      hasElevator: null,
      hasPool: pool,
      parking: null,
      outdoor: null,
      condition: null,
      exposure: null,
      constructionYear: null,
    },
    streamEstate: {
      propertyId: key,
      originSite: 'SeLoger',
      onlineSince: null,
      lastSeenAt: null,
      priceDrops: [],
      tier: 1,
    },
  };
}

const NOTE: StreamEstateSearchNote = {
  billed: 20,
  stop: 'target',
  cursor: null,
  tiers: [{ tier: 1, billed: 20, kept: 3, fallback: false }],
  counts: {
    unreadable: 0,
    outsideWhitelist: 0,
    expiredOrigin: 0,
    otherCommune: 0,
    unverifiedPosition: 0,
    duplicates: 0,
  },
  newBuild: 0,
  located: true,
  communeName: 'Nice',
  inseeCode: '06088',
};

const RECEIVED = [stream('a', 4, true), stream('b', 1, true), stream('c', null, false)];

describe('ce que change un nouveau réglage', () => {
  it('étage, extérieur, terrain, piscine : trié ; le reste : une nouvelle recherche payante', () => {
    const base = settings({});
    expect(settingsChangeKind(base, base)).toBe('none');
    for (const patch of [
      { minFloor: 2 },
      { outdoor: ['garden' as const] },
      { minLand: 500 },
      { pool: true },
    ]) {
      expect(settingsChangeKind(base, settings({ filters: filters(patch) }))).toBe('sorted');
    }
    for (const patch of [
      { sector: { kind: 'commune' as const } },
      { autoWiden: false },
      { price: { min: 300_000, max: 400_000 } },
      { rooms: { min: 3, max: 4 } },
      { surface: { min: 60, max: 80 } },
      { filters: filters({ dpe: ['C'] }) },
    ]) {
      expect(settingsChangeKind(base, settings(patch))).toBe('paid');
    }
  });

  it('dit quand un critère trié se desserre', () => {
    expect(sortedFiltersLoosened(filters({ minFloor: 3 }), filters({ minFloor: 1 }))).toBe(true);
    expect(sortedFiltersLoosened(filters({ minFloor: 1 }), filters({ minFloor: 3 }))).toBe(false);
    expect(sortedFiltersLoosened(filters({ pool: true }), filters({}))).toBe(true);
    expect(
      sortedFiltersLoosened(
        filters({ outdoor: ['balcony'] }),
        filters({ outdoor: ['balcony', 'garden'] }),
      ),
    ).toBe(true);
    expect(sortedFiltersLoosened(filters({}), filters({ minLand: 500 }))).toBe(false);
  });
});

describe('le résultat payé après un réglage', () => {
  it('critère trié resserré : les biens déjà reçus sont triés, sans rien perdre ni repayer', () => {
    const after = afterSettingsChange({
      previous: settings({}),
      next: settings({ filters: filters({ minFloor: 2 }) }),
      received: RECEIVED,
      note: NOTE,
    });
    expect(after.shown?.map((candidate) => candidate.key)).toEqual(['a', 'c']);
    expect(after.note.counts.outsideCriteria).toBe(1);
    expect(after.note.resorted).toBe('tighter');
    expect(after.note.billed).toBe(NOTE.billed); // aucun appel
    const { details } = describeStreamEstateSearch([], after.note);
    expect(details).toContain(RESORTED_NOTE);
  });

  it('desserré : ce qui était écarté revient, et l’écran le dit', () => {
    const after = afterSettingsChange({
      previous: settings({ filters: filters({ minFloor: 2 }) }),
      next: settings({}),
      received: RECEIVED,
      note: { ...NOTE, counts: { ...NOTE.counts, outsideCriteria: 1 } },
    });
    expect(after.shown?.map((candidate) => candidate.key)).toEqual(['a', 'b', 'c']);
    expect(after.note.counts.outsideCriteria).toBe(0);
    const { details } = describeStreamEstateSearch([], after.note);
    expect(details).toContain(`${RESORTED_NOTE} ${RESORTED_LOOSER_NOTE}`);
  });

  it('autre réglage : le résultat reste, marqué « réglages précédents », rien n’est trié', () => {
    const after = afterSettingsChange({
      previous: settings({}),
      next: settings({ sector: { kind: 'radius', km: 5 } }),
      received: RECEIVED,
      note: NOTE,
    });
    expect(after.shown).toBeNull();
    expect(after.note.staleSettings).toBe(true);
    expect(describeStreamEstateSearch([], after.note).details).toContain(STALE_SETTINGS_NOTE);
  });

  it('un bien des portails n’est jamais trié par ces critères (Stream Estate seul, M99)', () => {
    const portal = { ...stream('p', 0, false), streamEstate: undefined };
    expect(sortReceived([portal], filters({ minFloor: 3, pool: true })).candidates).toHaveLength(1);
  });
});

// L'empreinte d'avant les missions 110 et 111, recopiée : un résultat gardé avant la mission doit
// se rouvrir après.
function fingerprintBefore(
  criteria: CompetitorSearchCriteria,
  address: string | null,
  old: Omit<SearchSettings, 'filters'> | null,
): string {
  const used: Partial<CompetitorSearchCriteria> = { ...criteria };
  if (old?.price != null) {
    delete used.advisorPriceMin;
    delete used.advisorPriceMax;
  }
  const entries = Object.entries({ ...used, address: address?.trim() || null }).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  const isDefault =
    old == null ||
    (old.sector == null &&
      old.price == null &&
      old.rooms == null &&
      old.surface == null &&
      old.autoWiden);
  return isDefault ? JSON.stringify(entries) : JSON.stringify([...entries, ['settings', old]]);
}

const CRITERIA = {
  propertyType: 'apartment',
  city: 'Nice',
  postalCode: '06000',
  surfaceArea: 70,
  roomsCount: 3,
  advisorPriceMin: 300_000,
  advisorPriceMax: 380_000,
} as unknown as CompetitorSearchCriteria;

describe('l’empreinte du résultat payé', () => {
  it('un résultat gardé avant la mission se rouvre après : même empreinte', () => {
    expect(searchFingerprint(CRITERIA, '1 rue X', null)).toBe(
      fingerprintBefore(CRITERIA, '1 rue X', null),
    );
    expect(searchFingerprint(CRITERIA, '1 rue X', DEFAULT_SEARCH_SETTINGS)).toBe(
      fingerprintBefore(CRITERIA, '1 rue X', null),
    );
    const custom = settings({ sector: { kind: 'radius', km: 2 }, rooms: { min: 3, max: 4 } });
    const { filters: _unused, ...old } = custom;
    void _unused;
    expect(searchFingerprint(CRITERIA, '1 rue X', custom)).toBe(
      fingerprintBefore(CRITERIA, '1 rue X', old),
    );
  });

  it('étage, extérieur, terrain, piscine n’y entrent pas ; le DPE, si', () => {
    const base = searchFingerprint(CRITERIA, null, settings({}));
    const sorted = settings({
      filters: filters({ minFloor: 2, outdoor: ['garden'], minLand: 500, pool: true }),
    });
    expect(isDefaultSettings(sorted)).toBe(false);
    expect(searchFingerprint(CRITERIA, null, sorted)).toBe(base);
    expect(
      searchFingerprint(CRITERIA, null, settings({ filters: filters({ dpe: ['C'] }) })),
    ).not.toBe(base);
  });
});
