import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { LivingHereView } from '@/features/living-here/components/living-here-view';
import {
  buildSheetBlocks,
  type LivingHereReaders,
} from '@/features/living-here/services/build-sheet';
import {
  judgeOverpass,
  judgeRisksLine,
  judgeRoute,
  judgeSchools,
  schoolCategory,
} from '@/features/living-here/services/living-here-judges';
import {
  minutesOf,
  nearestByCategory,
  priorityVerdict,
  readTrip,
  roundToDistrict,
  sectorPrioritiesOf,
  startPoint,
} from '@/features/living-here/services/living-here-rules';
import { readLivingHereBlocks } from '@/features/living-here/services/sheet-schema';
import { visitMoment } from '@/features/living-here/services/visit-moment';
import type { LivingHereBlocks, LivingHereSheet } from '@/features/living-here/types';
import { demoLivingHereBlocks } from '@/features/demo/services/demo-living-here';
import { DEMO_LIVING_HERE } from '@/features/demo/data/living-here';
import { frenchLeaks } from '@/test-fixtures/french-leaks';

// Mission 142 — « Vivre ici » : le point de départ (jamais l'adresse exacte d'un bien du marché),
// le plus proche de chaque catégorie, les minutes, les ★ du secteur, une source en panne, la langue.

const FROM = { lat: 43.6031, lon: 7.0012 };

describe('le point de départ', () => {
  it('seul un mandat signé part de son adresse ; sinon le quartier arrondi, sinon la commune', () => {
    const exact = { lat: 43.585213, lon: 7.121147 };
    expect(
      startPoint({ mandateAddressPoint: exact, listingPoint: null, communeCentre: FROM }),
    ).toEqual({
      point: exact,
      origin: 'address',
    });
    const district = startPoint({
      mandateAddressPoint: null,
      listingPoint: exact,
      communeCentre: FROM,
    });
    expect(district?.origin).toBe('district');
    expect(district?.point).toEqual({ lat: 43.585, lon: 7.12 });
    expect(
      startPoint({ mandateAddressPoint: null, listingPoint: null, communeCentre: FROM }),
    ).toEqual({
      point: FROM,
      origin: 'commune',
    });
    expect(
      startPoint({ mandateAddressPoint: null, listingPoint: null, communeCentre: null }),
    ).toBeNull();
  });
  it('l’adresse exacte d’un bien du marché n’est jamais retrouvable : la grille de 500 m', () => {
    for (const point of [
      { lat: 43.58521, lon: 7.12114 },
      { lat: 43.58699, lon: 7.12249 },
      { lat: 48.84454, lon: 2.28008 },
    ]) {
      const rounded = roundToDistrict(point);
      expect(Math.round(rounded.lat * 1000) % 5).toBe(0);
      expect(Math.round(rounded.lon * 1000) % 5).toBe(0);
      expect(rounded).not.toEqual(point);
    }
  });
});

describe('le plus proche, et les minutes', () => {
  it('le plus proche de chaque catégorie, à vol d’oiseau', () => {
    const nearest = nearestByCategory(
      FROM,
      [
        { category: 'bakery', name: 'Loin', point: { lat: 43.62, lon: 7.0012 } },
        { category: 'bakery', name: 'Près', point: { lat: 43.6041, lon: 7.0012 } },
        { category: 'pharmacy', name: 'Pharmacie', point: { lat: 43.605, lon: 7.0012 } },
        { category: 'transit', name: 'Arrêt', point: { lat: 43.6032, lon: 7.0012 } },
      ],
      ['bakery', 'pharmacy'],
    );
    expect(nearest.get('bakery')?.name).toBe('Près');
    expect(nearest.get('pharmacy')?.name).toBe('Pharmacie');
    expect(nearest.has('transit')).toBe(false);
  });
  it('des minutes entières, au moins une', () => {
    expect(minutesOf(716)).toBe(12);
    expect(minutesOf(20)).toBe(1);
    expect(minutesOf(2170.7)).toBe(36);
  });
});

describe('les réponses des sources', () => {
  it('OpenStreetMap : la catégorie et le nom, jamais l’adresse', () => {
    const candidates = judgeOverpass({
      elements: [
        {
          lat: 1,
          lon: 2,
          tags: {
            shop: 'bakery',
            name: 'Le Pain d’Olivier',
            'addr:street': 'Rue des Lilas',
            'addr:housenumber': '12',
          },
        },
        { center: { lat: 3, lon: 4 }, tags: { leisure: 'park' } },
        { lat: 5, lon: 6, tags: { shop: 'clothes', name: 'Boutique' } },
      ],
    });
    expect(candidates).toEqual([
      { category: 'bakery', name: 'Le Pain d’Olivier', point: { lat: 1, lon: 2 } },
      { category: 'green_space', name: null, point: { lat: 3, lon: 4 } },
    ]);
    expect(JSON.stringify(candidates)).not.toContain('Lilas');
    expect(() => judgeOverpass({ nope: true })).toThrow();
  });
  it('les écoles par leur nature', () => {
    expect(schoolCategory('ECOLE MATERNELLE')).toBe('nursery_school');
    expect(schoolCategory('ECOLE DE NIVEAU ELEMENTAIRE')).toBe('primary_school');
    expect(schoolCategory('COLLEGE')).toBe('middle_school');
    expect(schoolCategory('LYCEE D ENSEIGNEMENT GENERAL')).toBe('high_school');
    expect(schoolCategory('CIRCONSCRIPTIONS INSPECTION EDUC NAT')).toBeNull();
    expect(
      judgeSchools({
        results: [
          {
            nom_etablissement: 'Ecole Rebuffel',
            libelle_nature: 'ECOLE MATERNELLE',
            latitude: 1,
            longitude: 2,
          },
        ],
      }),
    ).toEqual([{ category: 'nursery_school', name: 'Ecole Rebuffel', point: { lat: 1, lon: 2 } }]);
  });
  it('l’itinéraire de l’IGN, en secondes', () => {
    expect(judgeRoute({ duration: 716.1, timeUnit: 'second' })).toBe(716.1);
    expect(judgeRoute({ duration: 12, timeUnit: 'minute' })).toBe(720);
    expect(() => judgeRoute({ distance: 3 })).toThrow();
  });
  it('les risques : les codes de la commune, sa zone sismique, les argiles', () => {
    expect(
      judgeRisksLine(
        {
          gaspar: {
            data: [
              {
                risques_detail: [{ num_risque: '11' }, { num_risque: '113' }, { num_risque: '16' }],
              },
            ],
          },
          seismic: {
            data: [
              { code_zone: '2', code_insee: '06029' },
              { code_zone: '3', code_insee: '06085' },
            ],
          },
          clay: {},
        },
        '06085',
      ),
    ).toEqual({ riskCodes: ['11', '16'], seismicZone: '3', clay: null });
  });
});

const ok = <T>(data: T) => ({
  state: 'ok' as const,
  readAt: '2026-11-07T10:00:00.000Z',
  sourceDate: null,
  data,
});
const blocks = (over: Partial<LivingHereBlocks> = {}): LivingHereBlocks => ({
  daily: ok({
    places: [
      { category: 'bakery', name: 'Boulangerie', walkMinutes: 6 },
      { category: 'supermarket', name: 'Marché', walkMinutes: 9 },
      { category: 'pharmacy', name: 'Pharmacie', walkMinutes: 12 },
    ],
  }),
  schools: ok({ places: [{ category: 'primary_school', name: 'École', walkMinutes: 8 }] }),
  moves: ok({
    transit: null,
    drives: [{ kind: 'airport', name: "Nice-Côte d'Azur", minutes: 34 }],
  }),
  surroundings: ok({ green: null }),
  risks: ok({ riskCodes: ['11', '13'], seismicZone: '3', clay: 'high' as const }),
  ...over,
});

describe('ce qui compte pour lui', () => {
  it('les commerces à pied, les écoles, et le calme toujours « à vérifier »', () => {
    expect(priorityVerdict('shops_on_foot', blocks())).toBe('yes');
    expect(priorityVerdict('schools', blocks())).toBe('partly');
    expect(priorityVerdict('quiet', blocks())).toBe('to_check');
    expect(
      priorityVerdict('shops_on_foot', blocks({ daily: { state: 'unavailable', readAt: 'x' } })),
    ).toBe('to_check');
  });
  it('les ★ relues : la liste fermée, sans doublon', () => {
    expect(sectorPrioritiesOf(['schools', 'schools', 'pool', 'quiet'])).toEqual([
      'quiet',
      'schools',
    ]);
    expect(sectorPrioritiesOf(null)).toEqual([]);
  });
  it('le trajet jusqu’à son lieu : la durée seulement', () => {
    expect(readTrip({ mode: 'car', minutes: 18 })).toEqual({ minutes: 18 });
    expect(readTrip({ mode: 'car', minutes: 18, label: 'Sophia', lat: 43 })).toEqual({
      minutes: 18,
    });
    expect(readTrip({ mode: 'bike', minutes: 18 })).toBeNull();
  });
});

describe('une source en panne', () => {
  const readers = (over: Partial<LivingHereReaders> = {}): LivingHereReaders => ({
    places: async () => [
      { category: 'bakery', name: 'Boulangerie', point: { lat: 43.6041, lon: 7.0012 } },
    ],
    schools: async () => [],
    walkSeconds: async () => 300,
    driveSeconds: async () => 1200,
    risks: async () => ({ riskCodes: [], seismicZone: null, clay: null }),
    locate: async () => null,
    ...over,
  });
  const context = {
    from: FROM,
    inseeCode: '06085',
    commune: 'Mougins',
    communeCentre: { lat: 43.6, lon: 7.0 },
  };
  it('n’empêche pas les autres, et garde sa dernière lecture datée', async () => {
    const now = new Date('2026-11-07T10:00:00Z');
    const first = await buildSheetBlocks({ context, readers: readers(), previous: null, now });
    expect(first.blocks.daily).toMatchObject({
      state: 'ok',
      data: { places: [{ category: 'bakery', walkMinutes: 5 }] },
    });
    expect(first.blocks.schools.state).toBe('empty');
    const later = new Date('2026-11-20T10:00:00Z');
    const second = await buildSheetBlocks({
      context,
      readers: readers({ places: async () => Promise.reject(new Error('Overpass 504')) }),
      previous: first.blocks,
      now: later,
    });
    expect(second.blocks.daily).toMatchObject({ state: 'ok', failedAt: later.toISOString() });
    expect(second.blocks.surroundings).toEqual({
      state: 'unavailable',
      readAt: later.toISOString(),
    });
    expect(second.blocks.risks.state).toBe('ok');
    expect(second.failures.map((failure) => failure.source).sort()).toEqual([
      'daily',
      'moves',
      'surroundings',
    ]);
  });
});

describe('la fiche relue', () => {
  it('un champ inconnu ne passe pas (jamais une adresse), une source illisible se lit en panne', () => {
    const stored = JSON.parse(JSON.stringify(blocks()));
    stored.daily.data.places[0].address = '12 rue des Lilas';
    stored.moves = { state: 'ok', readAt: 'x' };
    const read = readLivingHereBlocks(stored, '2026-11-07T10:00:00.000Z');
    expect(JSON.stringify(read)).not.toContain('Lilas');
    expect(read.moves).toEqual({ state: 'unavailable', readAt: '2026-11-07T10:00:00.000Z' });
  });
});

describe('la fiche à l’écran', () => {
  const sheet = (origin: LivingHereSheet['origin']): LivingHereSheet => ({
    propertyKey: 'listing:x:1',
    origin,
    commune: 'Antibes',
    builtAt: '2026-11-07T10:00:00.000Z',
    blocks: blocks(),
  });
  it('dit d’où partent les distances, en français et en anglais', () => {
    const render = (origin: LivingHereSheet['origin'], language: 'fr' | 'en') =>
      renderToStaticMarkup(
        createElement(LivingHereView, {
          sheet: sheet(origin),
          language,
          priorities: ['shops_on_foot', 'quiet'],
          livingPlace: 'Sophia Antipolis',
          livingPlaceMinutes: 18,
        }),
      );
    expect(render('district', 'fr')).toContain(
      'Distances depuis le quartier, pas depuis le bien lui-même.',
    );
    expect(render('commune', 'fr')).toContain('Distances depuis le centre de Antibes.');
    const english = render('district', 'en');
    expect(english).toContain('Distances from the neighbourhood');
    expect(english).toContain('To Sophia Antipolis: 18 min by car');
    expect(english).toContain('to check during the viewing');
    expect(english).toContain(
      'Known risks in the area: flooding, earthquake, seismic zone 3 of 5, clay soil: high exposure',
    );
    const text = english.replace(/<[^>]+>/g, ' ');
    expect(
      frenchLeaks(text, [
        'Boulangerie',
        'Marché',
        'Pharmacie',
        'École',
        "Nice-Côte d'Azur",
        'Nice-Côte d&#x27;Azur',
        'Antibes',
        'Sophia Antipolis',
        'OpenStreetMap',
        'Géorisques',
        'IGN',
      ]),
    ).toEqual([]);
  });
});

describe('le jour de la visite', () => {
  const now = new Date('2026-11-07T10:00:00Z');
  it('saisi à Paris, dit dans sa langue ; jamais dans le passé ni à plus d’un an', () => {
    const moment = visitMoment('2026-11-14', '10:30', now);
    expect(moment.ok).toBe(true);
    if (!moment.ok) return;
    expect(moment.at).toBe('2026-11-14T09:30:00.000Z');
    expect(moment.day('fr')).toBe('samedi 14 novembre');
    expect(moment.time('fr')).toBe('10 h 30');
    expect(moment.day('en')).toBe('Saturday 14 November');
    expect(moment.time('en')).toBe('10:30 am');
    expect(visitMoment('2026-11-01', '10:30', now).ok).toBe(false);
    expect(visitMoment('2028-11-14', '10:30', now).ok).toBe(false);
    expect(visitMoment('2026-02-30', '10:30', now).ok).toBe(false);
    expect(visitMoment('2026-11-14', '25:00', now).ok).toBe(false);
  });
});

describe('la démo', () => {
  it('au point d’une fiche relevée, ses données ; ailleurs, rien trouvé ; aucun appel réseau', () => {
    const now = new Date('2026-11-07T10:00:00Z');
    const mougins = demoLivingHereBlocks(DEMO_LIVING_HERE[0]!.from, now);
    expect(mougins.daily.state).toBe('ok');
    expect(mougins.moves.state).toBe('ok');
    expect(demoLivingHereBlocks({ lat: 48.85, lon: 2.35 }, now).daily.state).toBe('empty');
    // Le quartier d'Antibes est un point de la grille de 500 m, jamais l'adresse de l'annonce.
    expect(roundToDistrict(DEMO_LIVING_HERE[1]!.from)).toEqual(DEMO_LIVING_HERE[1]!.from);
  });
});
