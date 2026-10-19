import { DEFAULT_SEARCH_FILTERS } from '@/features/competitor-search/services/search-filters';
import { describe, expect, it } from 'vitest';

import { learnFromDecisions } from '@/features/competitor-search/services/learn-from-decisions';
import { searchFingerprint } from '@/features/competitor-search/services/paid-search-guard';
import { rankCandidates } from '@/features/competitor-search/services/rank-candidates';
import {
  DEFAULT_SEARCH_SETTINGS,
  describeSearchCriteria,
  isSettingCustom,
  parseSearchSettings,
  readSearchSettingsInput,
  settingsToInput,
  settingsToStore,
  type SearchSettings,
} from '@/features/competitor-search/services/search-settings';
import { baseStreamEstateQuery } from '@/features/competitor-search/services/stream-estate';
import {
  describeStreamEstateSearch,
  type StreamEstateSearchNote,
} from '@/features/competitor-search/services/stream-estate-summary';
import {
  planTiers,
  searchDefaults,
  tierQueryParams,
  type TierPlan,
} from '@/features/competitor-search/services/stream-estate-tiers';
import {
  STREAM_ESTATE_LABEL,
  STREAM_ESTATE_SOURCE,
  type CompetitorCandidate,
  type CompetitorSearchCriteria,
  type StreamEstateTier,
} from '@/features/competitor-search/types';

// MISSION 99 — les réglages de la recherche. Aucun appel réseau : le plan, les paramètres de
// chaque requête, l'empreinte du résultat gardé et la revalidation du classement sont purs.

const NOW = new Date('2026-10-12T08:00:00Z');
const NICE = '06088';
const ORIGIN = { lat: 43.7, lon: 7.26 };
const LOCATED = { located: true, hasCentre: true };

// Appartement niçois : 3 pièces, 70 m², fourchette 300 000 – 380 000 €.
const CRITERIA: CompetitorSearchCriteria = {
  city: 'Nice',
  postalCode: '06000',
  propertyType: 'Appartement',
  district: null,
  surfaceArea: 70,
  roomsCount: 3,
  advisorPriceMin: 300_000,
  advisorPriceMax: 380_000,
};

const settings = (overrides: Partial<SearchSettings>): SearchSettings => ({
  ...DEFAULT_SEARCH_SETTINGS,
  ...overrides,
});

// Toutes les requêtes d'un plan, telles qu'elles partiraient (première page de chaque tranche).
function queries(plans: TierPlan[]): string[] {
  const base = baseStreamEstateQuery(CRITERIA, NOW);
  if (!base.ok) throw new Error('type non cherché');
  return plans.flatMap((plan) =>
    (plan.slices ?? [{ rooms: plan.rooms, surface: plan.surface }]).flatMap((slice) =>
      (plan.prices.length > 0 ? plan.prices : [null]).map((price) =>
        decodeURIComponent(
          tierQueryParams(
            base.params,
            { area: plan.area, ...slice },
            price,
            { inseeCode: NICE, origin: ORIGIN },
            plan.area.kind === 'circle' && plan.area.withinCommune ? ['06123'] : null,
            1,
            20,
          ).toString(),
        ),
      ),
    ),
  );
}

const first = (custom: Partial<SearchSettings>): string =>
  queries(planTiers(CRITERIA, LOCATED, settings(custom)))[0];
const tiersOf = (custom: Partial<SearchSettings>): StreamEstateTier[] =>
  planTiers(CRITERIA, LOCATED, settings(custom)).map((plan) => plan.tier);

describe('sans réglage, la recherche est exactement celle d’avant la mission', () => {
  const SOCLE =
    'transactionType=0&propertyTypes[]=0&expired=false&fromUpdatedAt=2026-09-12+10:00:00';
  const FIN = '&order[updatedAt]=desc&itemsPerPage=20';
  const dans = (km: number) => `&lat=43.7&lon=7.26&radius=${km}&excludedInseeCodes[]=06123`;
  const large = '&lat=43.7&lon=7.26&radius=10';
  const prix = '&budgetMin=300000&budgetMax=380000';

  it('envoie, requête pour requête, ce qui partait avant (relevé avant la mission)', () => {
    expect(queries(planTiers(CRITERIA, LOCATED))).toEqual([
      `${SOCLE}${dans(1)}&roomMin=3&roomMax=3&surfaceMin=63&surfaceMax=77${prix}${FIN}`,
      `${SOCLE}${dans(1)}&roomMin=3&roomMax=3&surfaceMin=78&surfaceMax=87${prix}${FIN}`,
      `${SOCLE}${dans(1)}&roomMin=4&roomMax=4&surfaceMin=63&surfaceMax=87${prix}${FIN}`,
      `${SOCLE}${dans(2)}&roomMin=3&roomMax=4&surfaceMin=63&surfaceMax=87${prix}${FIN}`,
      `${SOCLE}${dans(5)}&roomMin=3&roomMax=4&surfaceMin=63&surfaceMax=87${prix}${FIN}`,
      `${SOCLE}${dans(5)}&roomMin=5&surfaceMin=63${prix}${FIN}`,
      `${SOCLE}${dans(5)}&roomMin=3&roomMax=4&surfaceMin=88${prix}${FIN}`,
      `${SOCLE}${large}&roomMin=3&surfaceMin=63${prix}${FIN}`,
      `${SOCLE}${large}&roomMin=3&surfaceMin=63&budgetMin=285000&budgetMax=299999${FIN}`,
      `${SOCLE}${large}&roomMin=3&surfaceMin=63&budgetMin=380001&budgetMax=399000${FIN}`,
    ]);
  });

  it('donne le même plan sans réglages, avec null, ou avec tout en automatique', () => {
    for (const options of [LOCATED, { located: false, hasCentre: true }]) {
      const before = planTiers(CRITERIA, options);
      expect(planTiers(CRITERIA, options, null)).toEqual(before);
      expect(planTiers(CRITERIA, options, DEFAULT_SEARCH_SETTINGS)).toEqual(before);
      expect(planTiers(CRITERIA, options, parseSearchSettings(null))).toEqual(before);
    }
  });

  it('garde l’empreinte d’avant : un résultat déjà gardé le reste', () => {
    const before = searchFingerprint(CRITERIA, '1 rue de France');
    expect(searchFingerprint(CRITERIA, '1 rue de France', DEFAULT_SEARCH_SETTINGS)).toBe(before);
    expect(searchFingerprint(CRITERIA, '1 rue de France', null)).toBe(before);
  });

  it('n’écrit rien en base quand tout est automatique', () => {
    expect(settingsToStore(DEFAULT_SEARCH_SETTINGS)).toBeNull();
    expect(settingsToStore(settings({ autoWiden: false }))).not.toBeNull();
  });
});

describe('chaque réglage modifie la requête comme prévu', () => {
  it('rayon : un cercle autour du bien, communes voisines comprises, qui ne s’agrandit plus', () => {
    const query = first({ sector: { kind: 'radius', km: 2 } });
    expect(query).toContain('&lat=43.7&lon=7.26&radius=2&roomMin=3');
    expect(query).not.toContain('excludedInseeCodes');
    const all = queries(
      planTiers(CRITERIA, LOCATED, settings({ sector: { kind: 'radius', km: 2 } })),
    );
    expect(all.every((line) => line.includes('radius=2'))).toBe(true);
    // Plus de 2 km, 5 km ni 10 km : restent plus grand, pièce de plus, pièces libres, prix ±5 %.
    expect(tiersOf({ sector: { kind: 'radius', km: 2 } })).toEqual([1, 2, 3, 6, 8]);
  });

  it('toute la commune : par le code INSEE, à tous les élargissements', () => {
    const all = queries(planTiers(CRITERIA, LOCATED, settings({ sector: { kind: 'commune' } })));
    expect(all.every((line) => line.includes(`includedInseeCodes[]=${NICE}`))).toBe(true);
    expect(all.some((line) => line.includes('radius='))).toBe(false);
    expect(tiersOf({ sector: { kind: 'commune' } })).toEqual([1, 2, 3, 6, 8]);
  });

  it('prix : la fourchette réglée remplace celle de la fiche, sans ±5 %', () => {
    const custom = { price: { min: 320_000, max: 400_000 } };
    const all = queries(planTiers(CRITERIA, LOCATED, settings(custom)));
    expect(all.every((line) => line.includes('&budgetMin=320000&budgetMax=400000'))).toBe(true);
    expect(tiersOf(custom)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('pièces : de… à…, sans « pièce de plus » ni pièces libres', () => {
    const custom = { rooms: { min: 3, max: 4 } };
    const all = queries(planTiers(CRITERIA, LOCATED, settings(custom)));
    expect(all.every((line) => line.includes('&roomMin=3&roomMax=4'))).toBe(true);
    expect(tiersOf(custom)).toEqual([1, 2, 4, 5, 7, 8]);
  });

  it('surface : de… à… m², sans « plus grand », et jamais libérée', () => {
    const custom = { surface: { min: 60, max: 80 } };
    const all = queries(planTiers(CRITERIA, LOCATED, settings(custom)));
    expect(all.every((line) => line.includes('&surfaceMin=60&surfaceMax=80'))).toBe(true);
    expect(tiersOf(custom)).toEqual([1, 3, 4, 5, 6, 7, 8]);
  });

  it('élargir : non → la première recherche seulement', () => {
    expect(tiersOf({ autoWiden: false })).toEqual([1]);
    expect(first({ autoWiden: false })).toBe(queries(planTiers(CRITERIA, LOCATED))[0]);
  });

  it('tout réglé : une seule recherche, exactement ce qui est demandé', () => {
    const custom = {
      sector: { kind: 'radius', km: 2 } as const,
      price: { min: 300_000, max: 380_000 },
      rooms: { min: 3, max: 4 },
      surface: { min: 60, max: 80 },
    };
    expect(tiersOf(custom)).toEqual([1]);
    expect(first(custom)).toContain(
      '&lat=43.7&lon=7.26&radius=2&roomMin=3&roomMax=4&surfaceMin=60&surfaceMax=80&budgetMin=300000&budgetMax=380000',
    );
  });

  it('ne redemande jamais deux fois la même tranche dans un secteur réglé', () => {
    const all = queries(
      planTiers(CRITERIA, LOCATED, settings({ sector: { kind: 'radius', km: 5 } })),
    );
    expect(new Set(all).size).toBe(all.length);
    // Pièces libres : seulement ce que « identique », « plus grand » et « pièce de plus » n'ont
    // pas demandé dans ce cercle.
    expect(all).toContain(all.find((line) => line.includes('&roomMin=5&surfaceMin=63&budget')));
    expect(all).toContain(all.find((line) => line.includes('&roomMin=3&roomMax=4&surfaceMin=88')));
  });
});

describe('un réglage annule le résultat gardé (M93)', () => {
  it('l’empreinte change dès qu’un réglage change, et revient quand il est remis par défaut', () => {
    const automatic = searchFingerprint(CRITERIA, null);
    const custom = searchFingerprint(CRITERIA, null, settings({ rooms: { min: 3, max: 4 } }));
    expect(custom).not.toBe(automatic);
    expect(searchFingerprint(CRITERIA, null, settings({}))).toBe(automatic);
  });

  it('distingue chaque réglage', () => {
    const prints = [
      settings({ sector: { kind: 'commune' } }),
      settings({ sector: { kind: 'radius', km: 2 } }),
      settings({ sector: { kind: 'radius', km: 5 } }),
      settings({ price: { min: 1, max: 2 } }),
      settings({ rooms: { min: 1, max: 2 } }),
      settings({ surface: { min: 1, max: 2 } }),
      settings({ autoWiden: false }),
    ].map((custom) => searchFingerprint(CRITERIA, null, custom));
    expect(new Set(prints).size).toBe(prints.length);
  });
});

describe('ce que l’écran envoie est relu', () => {
  const blank = settingsToInput(DEFAULT_SEARCH_SETTINGS);

  it('tout vide = tout automatique', () => {
    expect(readSearchSettingsInput(blank)).toEqual({ ok: true, settings: DEFAULT_SEARCH_SETTINGS });
  });

  it('lit un rayon, des paires complètes et des montants écrits avec des espaces', () => {
    const read = readSearchSettingsInput({
      ...blank,
      sector: '2',
      priceMin: '300 000',
      priceMax: '380 000 €',
      roomsMin: '3',
      roomsMax: '4',
      surfaceMin: '60',
      surfaceMax: '80',
      autoWiden: false,
    });
    expect(read).toEqual({
      ok: true,
      settings: {
        sector: { kind: 'radius', km: 2 },
        price: { min: 300_000, max: 380_000 },
        rooms: { min: 3, max: 4 },
        surface: { min: 60, max: 80 },
        autoWiden: false,
        // Mission 110 — un appel sans critères n'en règle aucun.
        filters: DEFAULT_SEARCH_FILTERS,
      },
    });
    if (read.ok) expect(readSearchSettingsInput(settingsToInput(read.settings))).toEqual(read);
  });

  it('refuse une borne seule, une borne inversée, un texte, un rayon hors liste', () => {
    expect(readSearchSettingsInput({ ...blank, priceMin: '300000' }).ok).toBe(false);
    expect(readSearchSettingsInput({ ...blank, roomsMin: '4', roomsMax: '3' }).ok).toBe(false);
    expect(readSearchSettingsInput({ ...blank, surfaceMin: 'abc', surfaceMax: '80' }).ok).toBe(
      false,
    );
    expect(readSearchSettingsInput({ ...blank, sector: '3' as never }).ok).toBe(false);
    expect(readSearchSettingsInput({ ...blank, roomsMin: '0', roomsMax: '3' }).ok).toBe(false);
  });

  it('lit une valeur de base illisible comme « automatique »', () => {
    expect(parseSearchSettings({ sector: { kind: 'radius', km: 3 } })).toEqual(
      DEFAULT_SEARCH_SETTINGS,
    );
    expect(parseSearchSettings('n’importe quoi')).toEqual(DEFAULT_SEARCH_SETTINGS);
  });

  it('dit « réglé par vous » critère par critère', () => {
    const custom = settings({ rooms: { min: 3, max: 4 }, autoWiden: false });
    expect(isSettingCustom(custom, 'rooms')).toBe(true);
    expect(isSettingCustom(custom, 'autoWiden')).toBe(true);
    expect(isSettingCustom(custom, 'sector')).toBe(false);
    expect(isSettingCustom(DEFAULT_SEARCH_SETTINGS, 'autoWiden')).toBe(false);
  });
});

const nbsp = (text: string): string => text.replace(/[  ]/g, ' ');

describe('le bilan dit quels critères ont servi', () => {
  const note = (overrides: Partial<StreamEstateSearchNote>): StreamEstateSearchNote => ({
    billed: 12,
    stop: 'exhausted',
    cursor: null,
    tiers: [],
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
    inseeCode: NICE,
    ...overrides,
  });
  const report = (tier: StreamEstateTier) => ({ tier, billed: 5, kept: 1, fallback: false });

  it('les valeurs que l’outil utiliserait seul', () => {
    const defaults = searchDefaults(CRITERIA, true);
    expect(defaults).toEqual({
      located: true,
      price: { min: 300_000, max: 380_000 },
      rooms: 3,
      surface: { min: 63, max: 77 },
    });
    expect(describeSearchCriteria(DEFAULT_SEARCH_SETTINGS, defaults).map(nbsp)).toEqual([
      '1 km autour du bien, puis élargi',
      '300 000 – 380 000 €',
      '3 pièces',
      '63 à 77 m²',
    ]);
    expect(
      describeSearchCriteria(DEFAULT_SEARCH_SETTINGS, searchDefaults(CRITERIA, false))[0],
    ).toBe('Toute la commune, puis élargi');
  });

  it('« Rayon 2 km · 300 000 – 380 000 € · 3 à 4 pièces · 60 à 80 m² · élargie 1 fois »', () => {
    const custom = settings({
      sector: { kind: 'radius', km: 2 },
      rooms: { min: 3, max: 4 },
      surface: { min: 60, max: 80 },
    });
    const summary = describeStreamEstateSearch(
      [],
      note({
        tiers: [report(1), report(8)],
        criteriaUsed: describeSearchCriteria(custom, searchDefaults(CRITERIA, true)),
        customSettings: true,
      }),
    );
    expect(summary.details.map(nbsp)).toContain(
      'Rayon 2 km · 300 000 – 380 000 € · 3 à 4 pièces · 60 à 80 m² · élargie 1 fois',
    );
    expect(summary.details.join(' ')).toContain('dans les limites de vos réglages');
  });

  it('dit « sans élargissement », et n’invente pas un critère absent de la fiche', () => {
    const bare = { ...CRITERIA, advisorPriceMin: null, advisorPriceMax: null, surfaceArea: null };
    const summary = describeStreamEstateSearch(
      [],
      note({
        tiers: [report(1)],
        criteriaUsed: describeSearchCriteria(DEFAULT_SEARCH_SETTINGS, searchDefaults(bare, true)),
      }),
    );
    expect(summary.details[0]).toBe(
      '1 km autour du bien, puis élargi · 3 pièces · sans élargissement',
    );
  });

  it('garde l’ancienne phrase pour un résultat gardé avant la mission', () => {
    const summary = describeStreamEstateSearch([], note({ tiers: [report(1), report(2)] }));
    expect(summary.details).toContain('La recherche a été élargie 1 fois.');
  });
});

describe('le classement revalide les biens Stream Estate contre les réglages', () => {
  const candidate = (
    id: string,
    overrides: Partial<CompetitorCandidate> & { tier?: StreamEstateTier; insee?: string } = {},
  ): CompetitorCandidate => {
    const { tier = 1, insee = NICE, ...rest } = overrides;
    return {
      key: id,
      url: `https://www.seloger.com/annonces/${id}.htm`,
      title: null,
      price: 340_000,
      surfaceArea: 70,
      roomsCount: 3,
      propertyType: 'apartment',
      pricePerSqm: null,
      landArea: null,
      city: 'Nice',
      photoUrls: [],
      isNewBuild: false,
      streamEstate: {
        propertyId: id,
        originSite: 'SeLoger',
        onlineSince: null,
        lastSeenAt: null,
        priceDrops: [],
        inseeCode: insee,
        tier,
      },
      ...rest,
    };
  };
  const kept = (candidates: CompetitorCandidate[], custom: SearchSettings | null): string[] =>
    rankCandidates(
      CRITERIA,
      [
        {
          portal: STREAM_ESTATE_SOURCE,
          label: STREAM_ESTATE_LABEL,
          searchUrl: '',
          status: 'ok',
          message: null,
          candidates,
        },
      ],
      learnFromDecisions([]),
      { subjectInseeCode: NICE, settings: custom },
    )
      .ranked.map((entry) => entry.candidate.key!)
      .sort();

  const pool = [
    candidate('identique'),
    candidate('deux-pieces', { roomsCount: 2, price: 340_001 }),
    candidate('grand', { surfaceArea: 95, price: 340_002 }),
    candidate('voisin', { insee: '06123', city: 'Saint-Laurent-du-Var', price: 340_003 }),
    // Au-delà de la marge automatique de ±5 % (399 000 €).
    candidate('cher', { price: 400_000 }),
  ];

  it('sans réglage : les bornes automatiques, inchangées', () => {
    expect(kept(pool, null)).toEqual(['identique']);
    expect(kept(pool, DEFAULT_SEARCH_SETTINGS)).toEqual(['identique']);
  });

  it('pièces réglées de 2 à 3 : le 2 pièces entre, à la première recherche', () => {
    expect(kept(pool, settings({ rooms: { min: 2, max: 3 } }))).toEqual([
      'deux-pieces',
      'identique',
    ]);
  });

  it('surface réglée de 60 à 100 m² : le grand entre', () => {
    expect(kept(pool, settings({ surface: { min: 60, max: 100 } }))).toEqual([
      'grand',
      'identique',
    ]);
  });

  it('rayon réglé : la commune voisine entre ; « toute la commune » ne l’admet jamais', () => {
    expect(kept(pool, settings({ sector: { kind: 'radius', km: 2 } }))).toEqual([
      'identique',
      'voisin',
    ]);
    const far = [...pool, candidate('voisin-10km', { insee: '06123', tier: 8, price: 340_004 })];
    expect(kept(far, null)).toEqual(['identique', 'voisin-10km']);
    expect(kept(far, settings({ sector: { kind: 'commune' } }))).toEqual(['identique']);
  });

  it('prix réglé : bornes strictes, sans la marge de ±5 %', () => {
    const outside = [candidate('identique'), candidate('marge', { price: 395_000, tier: 8 })];
    expect(kept(outside, null)).toEqual(['identique', 'marge']);
    expect(kept(outside, settings({ price: { min: 300_000, max: 380_000 } }))).toEqual([
      'identique',
    ]);
    expect(kept(pool, settings({ price: { min: 300_000, max: 400_000 } }))).toEqual([
      'cher',
      'identique',
    ]);
  });
});
