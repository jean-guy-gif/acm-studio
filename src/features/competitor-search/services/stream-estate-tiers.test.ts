import { describe, expect, it } from 'vitest';

import { distanceMeters } from '@/features/competitor-search/services/proximity';
import type { GeoCommune } from '@/features/competitor-search/services/resolve-insee-code';
import { baseStreamEstateQuery } from '@/features/competitor-search/services/stream-estate';
import {
  neighbourInseeCodes,
  planTiers,
  runTieredSearch,
  tierQueryParams,
  tierSlices,
  type FetchStreamEstatePage,
  type TieredSearchInput,
} from '@/features/competitor-search/services/stream-estate-tiers';
import type { CompetitorSearchCriteria, GeoPoint } from '@/features/competitor-search/types';

// Mission 71 — la recherche par crans, rejouée sur une API SIMULÉE qui applique les mêmes filtres
// que Stream Estate (mesures du 06/10 : rayon en km, exclusion de communes, tranches de surface,
// de pièces et de prix, pages). Aucun appel réseau.

const NOW = new Date('2026-10-06T12:00:00Z');
const SLV = '06123';
const NICE = '06088';
const SUBJECT_POINT: GeoPoint = { lat: 43.6745, lon: 7.1875 };

// Bien vendeur : appartement 3 pièces, 63 m², fourchette 370–450 k€, à Saint-Laurent-du-Var.
// Surface identique ±10 % → 56–70 m² ; plus grand jusqu'à +25 % → 71–78 m².
const CRITERIA: CompetitorSearchCriteria = {
  city: 'St Laurent du Var',
  postalCode: '06700',
  propertyType: 'Appartement',
  district: null,
  surfaceArea: 63,
  roomsCount: 3,
  advisorPriceMin: 370000,
  advisorPriceMax: 450000,
};

type Fake = {
  id: string;
  point: GeoPoint | null;
  insee?: string;
  city?: string;
  surface?: number;
  room?: number;
  price?: number;
  host?: string;
  seenDaysAgo?: number; // dernier passage du robot sur l'annonce d'origine (1 jour par défaut)
};

let counter = 0;
// Un point unique (6 décimales, jamais répété) à `meters` au nord du bien vendeur.
function north(meters: number): GeoPoint {
  counter += 1;
  return {
    lat: Number((SUBJECT_POINT.lat + meters / 111_320 + counter * 1e-6).toFixed(6)),
    lon: Number((SUBJECT_POINT.lon + counter * 1e-6).toFixed(6)),
  };
}

// Chaque bien factice a son prix, à 1 € près : même commune, même prix, mêmes pièces et même
// surface seraient UN SEUL bien (mission 78, doublons).
const priceOffsets = new Map<string, number>();
function distinctPrice(id: string): number {
  if (!priceOffsets.has(id)) priceOffsets.set(id, priceOffsets.size);
  return 400000 + priceOffsets.get(id)!;
}

function toJson(fake: Fake) {
  const seenAt = new Date(NOW.getTime() - (fake.seenDaysAgo ?? 1) * 86_400_000).toISOString();
  return {
    uuid: fake.id,
    title: 'Appartement à vendre',
    propertyType: 0,
    price: fake.price ?? distinctPrice(fake.id),
    surface: fake.surface ?? 63,
    room: fake.room ?? 3,
    createdAt: '2026-09-20T10:00:00+02:00',
    lastCrawledAt: '2026-10-05T10:00:00+02:00',
    location: fake.point,
    pictures: [],
    city: { name: fake.city ?? 'Saint-Laurent-du-Var', insee: fake.insee ?? SLV },
    adverts: [
      {
        url: `https://www.${fake.host ?? 'seloger.com'}/annonces/achat/appartement/${fake.id}.htm`,
        expired: false,
        lastCrawledAt: seenAt,
      },
    ],
  };
}

function inRange(params: URLSearchParams, min: string, max: string, value: number): boolean {
  const lo = params.get(min);
  const hi = params.get(max);
  return (lo == null || value >= Number(lo)) && (hi == null || value <= Number(hi));
}

// L'API simulée : mêmes filtres que Stream Estate, pages comprises. Garde chaque appel.
function fakeApi(pool: Fake[], options: { refuseExclusions?: boolean; refuseAll?: boolean } = {}) {
  const calls: { params: URLSearchParams; billed: string[] }[] = [];
  const fetchPage: FetchStreamEstatePage = async (params) => {
    if (options.refuseAll) return { ok: false, refused: true };
    if (options.refuseExclusions && params.has('excludedInseeCodes[]')) {
      calls.push({ params, billed: [] });
      return { ok: false, refused: false };
    }
    const excluded = params.getAll('excludedInseeCodes[]');
    const included = params.getAll('includedInseeCodes[]');
    const lat = params.get('lat');
    const matches = pool.filter((fake) => {
      const json = toJson(fake);
      if (included.length > 0) {
        // Mesure du 06/10 : avec un code INSEE, le rayon est ignoré.
        if (!included.includes(json.city.insee)) return false;
      } else if (lat != null) {
        if (fake.point == null) return false;
        const centre = { lat: Number(lat), lon: Number(params.get('lon')) };
        if (distanceMeters(centre, fake.point) > Number(params.get('radius')) * 1000) return false;
      }
      if (excluded.includes(json.city.insee)) return false;
      return (
        inRange(params, 'roomMin', 'roomMax', json.room) &&
        inRange(params, 'surfaceMin', 'surfaceMax', json.surface) &&
        inRange(params, 'budgetMin', 'budgetMax', json.price)
      );
    });
    const size = Number(params.get('itemsPerPage'));
    const page = Number(params.get('page') ?? '1');
    const member = matches.slice((page - 1) * size, page * size).map(toJson);
    calls.push({ params, billed: member.map((item) => item.uuid) });
    return { ok: true, json: { 'hydra:totalItems': matches.length, 'hydra:member': member } };
  };
  return { calls, fetchPage };
}

function search(pool: Fake[], overrides: Partial<TieredSearchInput> = {}) {
  const api = fakeApi(pool);
  const input: TieredSearchInput = {
    criteria: CRITERIA,
    plans: planTiers(CRITERIA, { located: true, hasCentre: true }),
    context: { inseeCode: SLV, origin: SUBJECT_POINT },
    neighbours: () => [NICE],
    fetchPage: api.fetchPage,
    now: NOW,
    ...overrides,
  };
  return { api, run: runTieredSearch(input) };
}

const many = (count: number, prefix: string, make: (i: number) => Omit<Fake, 'id'>): Fake[] =>
  Array.from({ length: count }, (_, i) => ({ id: `${prefix}-${i}`, ...make(i) }));

describe('les tranches sont disjointes', () => {
  const slices = tierSlices(CRITERIA);

  it('surface : identique 56–70 m², plus grand 71–78 m² (jamais plus petit)', () => {
    expect(slices.identicalSurface).toEqual({ min: 56, max: 70 });
    expect(slices.biggerSurface).toEqual({ min: 71, max: 78 });
  });

  it('prix : la fourchette stricte, puis ±5 % en dessous et au-dessus, sans recouvrement', () => {
    expect(slices.advisorPrices).toEqual({ min: 370000, max: 450000 });
    expect(slices.outsidePrices).toEqual([
      { min: 351500, max: 369999 },
      { min: 450001, max: 472500 },
    ]);
  });

  it('petit bien : le plancher ±3 m² peut ne rien laisser au « plus grand »', () => {
    const small = tierSlices({ ...CRITERIA, surfaceArea: 12 });
    expect(small.identicalSurface).toEqual({ min: 9, max: 15 });
    expect(small.biggerSurface).toBeNull();
  });

  it('dans la commune, aucun bien n’est facturé deux fois par les crans 1 à 6', async () => {
    const pool = [
      ...many(2, 'same', () => ({ point: north(300) })),
      ...many(2, 'big', (i) => ({ point: north(400), surface: 71 + i * 7 })),
      ...many(2, 'room', () => ({ point: north(500), room: 4, surface: 75 })),
      ...many(2, 'small', () => ({ point: north(300), surface: 55 })), // plus petit : jamais
      // Une pièce de moins : jamais avant le cran 6, où les pièces se libèrent (mission 78).
      ...many(2, 'less', () => ({ point: north(300), room: 2 })),
    ];
    const { api, run } = search(pool);
    const outcome = await run;
    const inCircle = api.calls.filter((call) => call.params.get('radius') === '1');
    const billed = inCircle.flatMap((call) => call.billed);
    expect(new Set(billed).size).toBe(billed.length);
    expect(billed.sort()).toEqual(
      ['big-0', 'big-1', 'room-0', 'room-1', 'same-0', 'same-1'].sort(),
    );
    // Crans 4 à 6 (2 et 5 km dans la commune) : seul le cran 6 ramène du nouveau, une fois.
    const beyond = api.calls
      .filter((call) => ['2', '5'].includes(call.params.get('radius') ?? ''))
      .flatMap((call) => call.billed.filter((id) => id.startsWith('less')));
    expect(beyond.sort()).toEqual(['less-0', 'less-1']);
    expect(outcome.ok && outcome.candidates.map((c) => c.streamEstate?.tier)).toEqual([
      1, 1, 2, 2, 3, 3, 6, 6,
    ]);
    expect(outcome.ok && outcome.candidates.map((c) => c.key)).not.toContain('small-0');
  });
});

describe('on s’arrête dès qu’on a 10 biens anciens', () => {
  it('10 identiques à 1 km : un seul cran, les plus larges ne sont jamais appelés', async () => {
    const pool = [
      ...many(12, 'same', () => ({ point: north(300) })),
      ...many(5, 'far', () => ({ point: north(3000) })),
    ];
    const { api, run } = search(pool);
    const outcome = await run;
    if (!outcome.ok) throw new Error('échec');
    expect(outcome.stop).toBe('target');
    expect(api.calls).toHaveLength(1);
    expect(outcome.billed).toBe(12);
    expect(outcome.tiers.map((report) => report.tier)).toEqual([1]);
  });

  it('4 identiques + 8 plus grands : arrêt après le cran 2', async () => {
    const pool = [
      ...many(4, 'same', () => ({ point: north(300) })),
      ...many(8, 'big', () => ({ point: north(300), surface: 75 })),
      ...many(8, 'room', () => ({ point: north(300), room: 4 })),
    ];
    const { api, run } = search(pool);
    const outcome = await run;
    if (!outcome.ok) throw new Error('échec');
    expect(outcome.stop).toBe('target');
    expect(outcome.tiers.map((report) => report.tier)).toEqual([1, 2]);
    expect(api.calls.every((call) => call.params.get('roomMin') === '3')).toBe(true);
  });

  it('le neuf ne compte pas pour les 10', async () => {
    const pool = [
      ...many(6, 'same', () => ({ point: north(300) })),
      // « Appartement neuf à vendre » : titre généré du neuf, gardé mais pas compté.
      ...many(6, 'neuf', () => ({ point: north(300) })),
      ...many(6, 'big', () => ({ point: north(300), surface: 75 })),
    ];
    const json = pool.map(toJson);
    for (const item of json.filter((p) => p.uuid.startsWith('neuf'))) {
      item.title = 'Appartement neuf à vendre';
    }
    const api = fakeApi(pool);
    const fetchPage: FetchStreamEstatePage = async (params) => {
      const page = await api.fetchPage(params);
      if (!page.ok) return page;
      const body = page.json as { 'hydra:member': { uuid: string }[] };
      body['hydra:member'] = body['hydra:member'].map((item) =>
        json.find((p) => p.uuid === item.uuid)!,
      );
      return page;
    };
    const { run } = search(pool, { fetchPage });
    const outcome = await run;
    if (!outcome.ok) throw new Error('échec');
    expect(outcome.candidates.filter((c) => !c.isNewBuild)).toHaveLength(12);
    expect(outcome.tiers.map((report) => report.tier)).toEqual([1, 2]);
  });
});

describe('plafond de 60 annonces facturées', () => {
  it('à 60, on s’arrête et on le dit', async () => {
    // 70 biens publiés seulement sur leboncoin : facturés, jamais importables.
    const pool = many(70, 'lbc', () => ({ point: north(300), host: 'leboncoin.fr' }));
    const { api, run } = search(pool);
    const outcome = await run;
    if (!outcome.ok) throw new Error('échec');
    expect(outcome.stop).toBe('cap');
    expect(outcome.billed).toBe(60);
    expect(outcome.counts.outsideWhitelist).toBe(60);
    expect(api.calls.map((call) => call.params.get('itemsPerPage'))).toEqual(['20', '20', '20']);
  });

  it('la première page d’une requête se réduit au reste du plafond', async () => {
    const pool = [
      ...many(55, 'lbc', () => ({ point: north(300), host: 'leboncoin.fr' })),
      ...many(10, 'big', () => ({ point: north(300), surface: 75 })),
    ];
    const { api, run } = search(pool);
    const outcome = await run;
    if (!outcome.ok) throw new Error('échec');
    expect(outcome.billed).toBe(60);
    expect(outcome.stop).toBe('cap');
    expect(api.calls.at(-1)!.params.get('itemsPerPage')).toBe('5');
  });
});

describe('le secteur : le cercle moins les communes voisines', () => {
  it('crans 1 à 5 : rayon + communes voisines exclues, jamais includedInseeCodes', () => {
    const plans = planTiers(CRITERIA, { located: true, hasCentre: true });
    const base = baseStreamEstateQuery(CRITERIA, NOW);
    if (!base.ok) throw new Error('type');
    const params = tierQueryParams(
      base.params,
      plans[0],
      { min: 370000, max: 450000 },
      { inseeCode: SLV, origin: SUBJECT_POINT },
      [NICE, '06027'],
      1,
      20,
    );
    expect(params.get('radius')).toBe('1');
    expect(params.get('lat')).toBe(String(SUBJECT_POINT.lat));
    expect(params.getAll('excludedInseeCodes[]')).toEqual([NICE, '06027']);
    expect(params.has('includedInseeCodes[]')).toBe(false);
    expect(params.get('page')).toBeNull();
  });

  it('un bien d’une commune voisine passé à travers est écarté, compté, et entre au cran 7', async () => {
    const pool = [{ id: 'nice', point: north(600), insee: NICE, city: 'Nice' }];
    const { run } = search(pool, { neighbours: () => [] }); // la liste a « raté » Nice
    const outcome = await run;
    if (!outcome.ok) throw new Error('échec');
    expect(outcome.candidates.map((c) => [c.key, c.streamEstate?.tier])).toEqual([['nice', 7]]);
    expect(outcome.counts.otherCommune).toBe(0); // entré ensuite : n'est plus compté écarté
    expect(outcome.stop).toBe('exhausted');
  });

  it('liste des voisines refusée par l’API : repli sur le cercle seul, signalé', async () => {
    const pool = many(3, 'same', () => ({ point: north(300) }));
    const api = fakeApi(pool, { refuseExclusions: true });
    const { run } = search(pool, { fetchPage: api.fetchPage });
    const outcome = await run;
    if (!outcome.ok) throw new Error('échec');
    expect(outcome.candidates).toHaveLength(3);
    expect(outcome.tiers.filter((r) => r.fallback).map((r) => r.tier)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('liste indisponible (geo.api.gouv.fr) : repli dit pour les crans 1 à 6', async () => {
    const { run } = search([], { neighbours: null });
    const outcome = await run;
    if (!outcome.ok) throw new Error('échec');
    expect(outcome.tiers.filter((r) => r.fallback).map((r) => r.tier)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('les voisines : communes du département dont le centre est à moins de rayon + 8 km', () => {
    const at = (code: string, km: number): GeoCommune => ({
      nom: code,
      code,
      centre: { coordinates: [SUBJECT_POINT.lon, SUBJECT_POINT.lat + km / 111.32] },
    });
    const communes = [at(SLV, 0), at('A', 5), at('B', 8.5), at('C', 9.5), at('D', 20)];
    expect(neighbourInseeCodes(communes, SLV, SUBJECT_POINT, 1)).toEqual(['A', 'B']);
    expect(neighbourInseeCodes(communes, SLV, SUBJECT_POINT, 2)).toEqual(['A', 'B', 'C']);
  });
});

describe('positions de remplissage et adresse non localisée', () => {
  it('un bien sans position, confirmé dans la commune (INSEE), entre dès le cran 1', async () => {
    const pool = [{ id: 'sans', point: null }];
    // L'API simulée ne trouve pas un bien sans position par le rayon : on l'injecte à chaque appel.
    const api = fakeApi([]);
    const fetchPage: FetchStreamEstatePage = async (params) => {
      await api.fetchPage(params);
      return { ok: true, json: { 'hydra:member': pool.map(toJson) } };
    };
    const { run } = search(pool, { fetchPage });
    const outcome = await run;
    if (!outcome.ok) throw new Error('échec');
    expect(outcome.candidates.map((c) => c.streamEstate?.tier)).toEqual([1]);
    expect(outcome.counts.unverifiedPosition).toBe(0);
  });

  it('chaque appel trie par date de mise à jour décroissante', async () => {
    const { api, run } = search(many(3, 'same', () => ({ point: north(300) })));
    await run;
    expect(api.calls.length).toBeGreaterThan(0);
    expect(api.calls.every((call) => call.params.get('order[updatedAt]') === 'desc')).toBe(true);
  });

  it('adresse non localisée : crans 1 à 3 sur toute la commune, 4 et 5 sautés, 10 km du centre', () => {
    const plans = planTiers(CRITERIA, { located: false, hasCentre: true });
    expect(plans.map((plan) => [plan.tier, plan.area.kind])).toEqual([
      [1, 'commune'],
      [2, 'commune'],
      [3, 'commune'],
      [6, 'commune'],
      [7, 'circle'],
      [8, 'circle'],
    ]);
    expect(plans.slice(0, 3).every((plan) => plan.acceptsUnverifiedPosition)).toBe(true);
    expect(planTiers(CRITERIA, { located: false, hasCentre: false }).map((p) => p.tier)).toEqual([
      1, 2, 3, 6,
    ]);
  });

  it('sans fourchette, pas de cran 8 ; sans pièces, ni cran 3 ni cran 6', () => {
    const bare = { ...CRITERIA, advisorPriceMin: null, advisorPriceMax: null, roomsCount: null };
    const plans = planTiers(bare, { located: true, hasCentre: true });
    expect(plans.map((p) => p.tier)).toEqual([1, 2, 4, 5, 7]);
    // Rien ne se libère : le rayon de 10 km garde ses bornes de la mission 71.
    expect(plans.at(-1)).toMatchObject({ surface: { min: 56, max: 78 }, originWithinDays: 7 });
  });
});

describe('« Chercher encore » : reprendre exactement où l’on s’est arrêté', () => {
  // 55 biens leboncoin (facturés, jamais importables) puis 12 importables, tous identiques.
  const pool = [
    ...many(55, 'lbc', () => ({ point: north(300), host: 'leboncoin.fr' })),
    ...many(12, 'ok', () => ({ point: north(300) })),
  ];

  it('au plafond, la recherche dit où reprendre (même cran, page suivante)', async () => {
    const { run } = search(pool);
    const outcome = await run;
    if (!outcome.ok) throw new Error('échec');
    expect(outcome.stop).toBe('cap');
    expect(outcome.billed).toBe(60);
    expect(outcome.candidates).toHaveLength(5);
    expect(outcome.cursor).toEqual({ plan: 0, price: 0, page: 4, size: 20, tier: 1 });
  });

  it('la reprise lit la page suivante, 20 annonces, sans refacturer ni reprendre un bien', async () => {
    const first = await search(pool).run;
    if (!first.ok || first.cursor == null) throw new Error('échec');
    const api = fakeApi(pool);
    const resumed = await runTieredSearch({
      criteria: CRITERIA,
      plans: planTiers(CRITERIA, { located: true, hasCentre: true }),
      context: { inseeCode: SLV, origin: SUBJECT_POINT },
      neighbours: () => [NICE],
      fetchPage: api.fetchPage,
      now: NOW,
      cap: 20,
      resume: {
        cursor: first.cursor,
        memory: {
          keys: first.candidates.map((c) => c.key!),
          oldCount: first.candidates.length,
          locations: [],
        },
      },
    });
    if (!resumed.ok) throw new Error('échec');
    expect(
      api.calls.map((call) => [call.params.get('page'), call.params.get('itemsPerPage')]),
    ).toEqual([['4', '20']]);
    expect(resumed.billed).toBe(7);
    expect(resumed.candidates.map((c) => c.key)).toEqual([
      'ok-5',
      'ok-6',
      'ok-7',
      'ok-8',
      'ok-9',
      'ok-10',
      'ok-11',
    ]);
    expect(resumed.stop).toBe('target'); // 5 + 7 = 12 anciens
  });

  it('une reprise sans plus rien à lire passe au cran suivant', async () => {
    const api = fakeApi(many(3, 'big', () => ({ point: north(300), surface: 75 })));
    const resumed = await runTieredSearch({
      criteria: CRITERIA,
      plans: planTiers(CRITERIA, { located: true, hasCentre: true }),
      context: { inseeCode: SLV, origin: SUBJECT_POINT },
      neighbours: () => [NICE],
      fetchPage: api.fetchPage,
      now: NOW,
      cap: 20,
      resume: {
        cursor: { plan: 0, price: 0, page: 5, size: 20, tier: 1 },
        memory: { keys: [], oldCount: 0, locations: [] },
      },
    });
    if (!resumed.ok) throw new Error('échec');
    expect(resumed.tiers[0].tier).toBe(1);
    expect(resumed.candidates.map((c) => c.streamEstate?.tier)).toEqual([2, 2, 2]);
    // Les cercles plus larges refacturent les 3 mêmes biens (accepté), jamais au-delà de 20.
    expect(resumed.billed).toBeLessThanOrEqual(20);
    expect(resumed.stop).toBe('exhausted');
  });
});

describe('erreurs de l’API', () => {
  it('clé refusée : la recherche le dit, sans rien garder', async () => {
    const api = fakeApi([], { refuseAll: true });
    const { run } = search([], { fetchPage: api.fetchPage });
    expect(await run).toEqual({ ok: false, reason: 'refused' });
  });
});

// MISSION 78 — les pièces se libèrent après la ville à 5 km, et le restent.
describe('mission 78 : une grande maison trouve ses comparables', () => {
  const CAGNES = '06027';
  // La maison de l'essai du 08/10 : 9 pièces, 200,13 m², 600–750 k€, sans adresse.
  const HOUSE: CompetitorSearchCriteria = {
    city: 'Cagnes-sur-Mer',
    postalCode: '06800',
    propertyType: 'Maison',
    district: null,
    surfaceArea: 200.13,
    roomsCount: 9,
    advisorPriceMin: 600000,
    advisorPriceMax: 750000,
  };
  const CENTRE: GeoPoint = { lat: 43.6712, lon: 7.1502 };
  const plans = planTiers(HOUSE, { located: false, hasCentre: true });
  const base = baseStreamEstateQuery(HOUSE, NOW);
  if (!base.ok) throw new Error('type');
  const paramsOf = (tier: number) => {
    const plan = plans.find((candidate) => candidate.tier === tier)!;
    const context = { inseeCode: CAGNES, origin: CENTRE };
    return (plan.slices ?? [plan]).map((slice) => {
      const params = tierQueryParams(
        base.params,
        { area: plan.area, ...slice },
        plan.prices[0],
        context,
        null,
        1,
        20,
      );
      return ['roomMin', 'roomMax', 'surfaceMin', 'surfaceMax'].map((key) => params.get(key));
    });
  };
  const house = (id: string, over: Partial<Fake> = {}): Fake => ({
    id,
    point: null,
    insee: CAGNES,
    city: 'Cagnes-sur-Mer',
    surface: 200,
    room: 6,
    price: 650000 + id.length * 1000 + id.charCodeAt(id.length - 1),
    ...over,
  });
  const run = (pool: Fake[]) => {
    const api = fakeApi(pool);
    return {
      api,
      outcome: runTieredSearch({
        criteria: HOUSE,
        plans,
        context: { inseeCode: CAGNES, origin: CENTRE },
        neighbours: null,
        fetchPage: api.fetchPage,
        now: NOW,
      }),
    };
  };

  it('les crans 1 à 3 gardent 9 ou 10 pièces ; le cran 6 libère les pièces dans la commune', () => {
    expect(plans.map((plan) => [plan.tier, plan.area.kind, plan.originWithinDays])).toEqual([
      [1, 'commune', 7],
      [2, 'commune', 7],
      [3, 'commune', 7],
      [6, 'commune', 21],
      [7, 'circle', 21],
      [8, 'circle', 21],
    ]);
    expect(paramsOf(1)).toEqual([['9', '9', '180', '221']]);
    expect(paramsOf(3)).toEqual([['10', '10', '180', '250']]);
    // Trois tranches qui ne redemandent rien aux crans 1 à 3 : moins de pièces, deux pièces de
    // plus et au-delà, mêmes pièces mais plus grand que +25 %. Jamais plus petit que 180 m².
    expect(paramsOf(6)).toEqual([
      [null, '8', '180', null],
      ['11', null, '180', null],
      ['9', '10', '251', null],
    ]);
  });

  it('à 10 km et hors fourchette, les pièces restent libres et la surface sans plafond', () => {
    expect(paramsOf(7)).toEqual([[null, null, '180', null]]);
    expect(paramsOf(8)).toEqual([[null, null, '180', null]]);
    expect(plans.find((plan) => plan.tier === 8)!.prices).toEqual([
      { min: 570000, max: 599999 },
      { min: 750001, max: 787500 },
    ]);
  });

  it('des maisons de 5 à 7 pièces entrent au cran 6 ; une plus petite, jamais', async () => {
    const pool = [
      house('six', { room: 6, surface: 185 }),
      house('seven', { room: 7, surface: 320 }), // plus de plafond de surface
      house('twelve', { room: 12, surface: 210 }),
      house('small', { room: 6, surface: 169 }), // plus de 10 % plus petite
    ];
    const { api, outcome } = run(pool);
    const result = await outcome;
    if (!result.ok) throw new Error('échec');
    expect(result.candidates.map((c) => [c.key, c.streamEstate?.tier])).toEqual([
      ['six', 6],
      ['seven', 6],
      ['twelve', 6],
    ]);
    // Le cran 6 ne facture chaque bien qu'une fois.
    const commune = api.calls.filter((call) => call.params.has('includedInseeCodes[]'));
    const billed = commune.flatMap((call) => call.billed);
    expect(new Set(billed).size).toBe(billed.length);
  });

  it('annonce d’origine revue il y a 12 jours : écartée au cran 1, gardée aux crans libérés', async () => {
    const pool = [
      house('same', { room: 9, seenDaysAgo: 12 }), // cran 1 : 7 jours, écartée
      house('freed', { room: 6, seenDaysAgo: 12 }),
      house('old', { room: 6, seenDaysAgo: 25 }), // plus de 21 jours : jamais
      house('fresh', { room: 5, seenDaysAgo: 2 }),
    ];
    const result = await run(pool).outcome;
    if (!result.ok) throw new Error('échec');
    expect(
      result.candidates.map((c) => [c.key, c.streamEstate?.tier, c.streamEstate?.staleOriginDays]),
    ).toEqual([
      ['freed', 6, 12],
      ['fresh', 6, undefined],
    ]);
    // « same » (9 pièces, 12 jours) : écartée au cran 1 ; « old » : écartée au cran 6.
    expect(result.counts.expiredOrigin).toBe(2);
  });

  it('le même bien sous deux identifiants n’apparaît et ne compte qu’une fois', async () => {
    const twin = { room: 6, surface: 169 + 15, price: 695000 };
    const pool = [
      house('a', twin),
      house('b', { ...twin, surface: 185.9 }), // à 2 m² près : le même
      house('c', { ...twin, surface: 190 }), // plus de 2 m² d'écart : un autre bien
      house('d', { ...twin, price: 696000 }), // autre prix : un autre bien
    ];
    const result = await run(pool).outcome;
    if (!result.ok) throw new Error('échec');
    expect(result.candidates.map((c) => c.key)).toEqual(['a', 'c', 'd']);
    expect(result.counts.duplicates).toBe(1);
  });

  it('un doublon ne compte pas dans les 10', async () => {
    const pool = [
      ...many(9, 'h', (i) => house(`h-${i}`, { price: 600000 + i * 1000 })),
      house('twin', { price: 600000 }), // le même que h-0
      house('tenth', { price: 700000 }),
    ];
    const result = await run(pool).outcome;
    if (!result.ok) throw new Error('échec');
    expect(result.stop).toBe('target');
    expect(result.candidates).toHaveLength(10);
    expect(result.candidates.map((c) => c.key)).not.toContain('twin');
  });
});
