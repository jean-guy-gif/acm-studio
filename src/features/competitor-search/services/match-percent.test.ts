import { describe, expect, it } from 'vitest';

import { learnFromDecisions } from '@/features/competitor-search/services/learn-from-decisions';
import {
  gapLine,
  matchPercent,
  type MatchPlace,
} from '@/features/competitor-search/services/match-percent';
import type { ProximityReason } from '@/features/competitor-search/types';
import { rankCandidates } from '@/features/competitor-search/services/rank-candidates';
import {
  STREAM_ESTATE_LABEL,
  STREAM_ESTATE_SOURCE,
  type CompetitorCandidate,
  type CompetitorSearchCriteria,
  type GeoPoint,
} from '@/features/competitor-search/types';

// Mission 71 §4 — le % de correspondance, sur 100 points ; un critère inconnu sort du calcul.

const CRITERIA: CompetitorSearchCriteria = {
  city: 'Saint-Laurent-du-Var',
  postalCode: '06700',
  propertyType: 'apartment',
  district: null,
  surfaceArea: 70,
  roomsCount: 4,
  advisorPriceMin: 400000,
  advisorPriceMax: 450000,
};

const SUBJECT: GeoPoint = { lat: 43.6745, lon: 7.1875 };
const metersNorth = (m: number): GeoPoint => ({ lat: SUBJECT.lat + m / 111_320, lon: SUBJECT.lon });

function candidate(overrides: Partial<CompetitorCandidate> = {}): CompetitorCandidate {
  return {
    key: 'k',
    url: 'https://www.seloger.com/annonces/achat/appartement/k.htm',
    title: null,
    price: 420000,
    surfaceArea: 70,
    roomsCount: 4,
    propertyType: 'apartment',
    pricePerSqm: null,
    landArea: null,
    city: 'Saint-Laurent-du-Var',
    photoUrls: [],
    isNewBuild: false,
    ...overrides,
  };
}

const known = (criterion: string, points: number): ProximityReason => ({
  criterion,
  level: 1,
  label: criterion,
  points,
  known: true,
});

const place = (distanceMeters: number | null, sameCommune = true): MatchPlace => ({
  distanceMeters,
  sameCommune,
});

describe('matchPercent', () => {
  it('identique à moins de 500 m : 100 %', () => {
    expect(matchPercent(CRITERIA, candidate(), [], place(300))).toBe(100);
  });

  it('les tranches du secteur : 25, 20, 15, 8, 4 points', () => {
    const at = (m: number) => matchPercent(CRITERIA, candidate(), [], place(m));
    // Surface, prix et pièces identiques (55 points sur 55) + secteur sur 25.
    expect([at(400), at(900), at(1600), at(4000), at(9000)]).toEqual([100, 94, 88, 79, 74]);
  });

  it('sans position : même commune 15, commune voisine 5', () => {
    expect(matchPercent(CRITERIA, candidate(), [], place(null, true))).toBe(88);
    expect(matchPercent(CRITERIA, candidate(), [], place(null, false))).toBe(75);
  });

  it('plus grand de 12 %, une pièce de plus, prix 4 % hors fourchette, à 1,6 km', () => {
    const wider = candidate({ surfaceArea: 78.4, roomsCount: 5, price: 468000 });
    // 15 (secteur) + 8 (surface) + 10 (prix) + 7 (pièces) = 40 sur 80.
    expect(matchPercent(CRITERIA, wider, [], place(1600))).toBe(50);
  });

  it('un critère inconnu sort du calcul ; un critère connu qui ne rapproche pas compte 0', () => {
    const unknownSurface = candidate({ surfaceArea: null });
    expect(matchPercent(CRITERIA, unknownSurface, [], place(300))).toBe(100);
    // Stationnement connu et différent (0 sur 5), extérieur identique (5 sur 5) : 85 sur 90.
    const reasons = [known('parking', -1), known('outdoor', 1)];
    expect(matchPercent(CRITERIA, candidate(), reasons, place(300))).toBe(94);
    // Un critère « non indiqué » (known: false) ne pèse rien.
    const unknown = { ...known('parking', 0), known: false };
    expect(matchPercent(CRITERIA, candidate(), [unknown], place(300))).toBe(100);
  });

  it('niveau 2 : état, étage, ascenseur, année 2 ; piscine, exposition 1', () => {
    const reasons = ['condition', 'floor', 'elevator', 'year', 'pool', 'exposure'].map((c) =>
      known(c, -1),
    );
    // 80 + 0 sur 80 + 10.
    expect(matchPercent(CRITERIA, candidate(), reasons, place(300))).toBe(89);
  });
});

describe('gapLine', () => {
  it('rien pour un bien identique et localisé à moins de 1 km', () => {
    const located = candidate({ features: { ...FEATURES, location: SUBJECT } });
    expect(gapLine(CRITERIA, located, place(300))).toBeNull();
  });

  it('dit chaque écart, dans l’ordre', () => {
    const wider = candidate({
      surfaceArea: 78.4,
      roomsCount: 5,
      price: 468000,
      features: { ...FEATURES, location: SUBJECT },
    });
    expect(gapLine(CRITERIA, wider, place(1600))).toBe(
      'Même ville, à 1,6 km · Plus grand : 78,4 m² (+12 %) · 5 pièces (+1) · Prix 4 % au-dessus de votre fourchette',
    );
  });

  it('commune voisine, et quartier non vérifié pour un bien sans position fiable', () => {
    const neighbour = candidate({ city: 'Cagnes-sur-Mer', features: { ...FEATURES } });
    expect(gapLine(CRITERIA, neighbour, place(6100, false))).toBe(
      'Commune voisine : Cagnes-sur-Mer, 6,1 km · Quartier non vérifié',
    );
    expect(gapLine(CRITERIA, candidate({ price: 385000 }), place(null))).toBe(
      'Quartier non vérifié · Prix 4 % en dessous de votre fourchette',
    );
  });
});

const FEATURES = {
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
};

describe('l’ordre affiché suit le %', () => {
  it('un bien à 4 km ne passe jamais devant un bien identique à 300 m', () => {
    const stream = (key: string, location: GeoPoint, tier: 1 | 5) =>
      candidate({
        key,
        url: `https://www.seloger.com/annonces/achat/appartement/${key}.htm`,
        features: { ...FEATURES, location, parking: ['garage'] },
        streamEstate: {
          propertyId: key,
          originSite: 'SeLoger',
          onlineSince: null,
          lastSeenAt: null,
          priceDrops: [],
          inseeCode: '06123',
          tier,
        },
      });
    const near = stream('near', metersNorth(300), 1);
    // Plus loin, mais même stationnement que le bien vendeur (le niveau 1 l'aurait favorisé).
    const far = stream('far', metersNorth(4000), 5);
    const criteria = {
      ...CRITERIA,
      subject: {
        parkingTypes: ['garage'],
        outdoorSpaces: [],
        generalCondition: null,
        floor: null,
        hasElevator: null,
        hasPool: null,
        exposure: null,
        constructionYear: null,
      },
    };
    const search = rankCandidates(
      criteria,
      [
        {
          portal: STREAM_ESTATE_SOURCE,
          label: STREAM_ESTATE_LABEL,
          searchUrl: '',
          status: 'ok',
          message: null,
          candidates: [far, near],
        },
      ],
      learnFromDecisions([]),
      { subjectLocation: SUBJECT, subjectInseeCode: '06123' },
    );
    expect(search.ranked.map((entry) => [entry.candidate.key, entry.matchPercent])).toEqual([
      ['near', 100],
      ['far', 80], // 8 + 20 + 20 + 15 + 5 (même garage) = 68 sur 85
    ]);
    expect(search.ranked[1].gapLine).toBe('Même ville, à 4 km');
  });
});
