import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import proximityFixture from '@/features/competitor-search/__fixtures__/stream-estate-nice-4p-proximite.json';
import { extractSearchResults } from '@/features/competitor-search/services/extract-search-results';
import { geocodeUrl, judgeGeocode } from '@/features/competitor-search/services/geocode-subject';
import { learnFromDecisions } from '@/features/competitor-search/services/learn-from-decisions';
import {
  assessProximity,
  distanceBand,
  PRESELECTED_CANDIDATES,
  splitVisible,
  VISIBLE_CANDIDATES,
} from '@/features/competitor-search/services/proximity';
import { rankCandidates } from '@/features/competitor-search/services/rank-candidates';
import { readSearchPage } from '@/features/competitor-search/services/read-search-page';
import { parseStreamEstateResponse } from '@/features/competitor-search/services/stream-estate';
import {
  isFillerLocation,
  readStreamEstateFeatures,
  repeatedLocations,
} from '@/features/competitor-search/services/stream-estate-features';
import {
  STREAM_ESTATE_LABEL,
  STREAM_ESTATE_SOURCE,
  type CandidateFeatures,
  type CompetitorCandidate,
  type CompetitorSearchCriteria,
  type GeoPoint,
  type PortalSearchResult,
  type SearchPortal,
  type SubjectProximityFacts,
} from '@/features/competitor-search/types';

// ÉTAPE 2 « les 10 plus proches » — l'ORDRE et la LIMITE changent, les filtres non.

const PREFS = learnFromDecisions([]);
// Heure de la recherche enregistrée (05/10/2026) : fixe la fenêtre des 7 jours de l’annonce d’origine.
const RECORDED_AT = new Date('2026-10-05T13:16:18Z');
// 12 avenue Jean Médecin, Nice — géocodé au numéro (score 0,98) le 05/10/2026.
const JEAN_MEDECIN: GeoPoint = { lat: 43.699502, lon: 7.268857 };

const SUBJECT: SubjectProximityFacts = {
  parkingTypes: ['garage'],
  outdoorSpaces: ['terrace'],
  generalCondition: 'good',
  floor: 2,
  hasElevator: true,
  hasPool: false,
  exposure: 'south',
  constructionYear: 1970,
};

const FLAT: CompetitorSearchCriteria = {
  city: 'Nice',
  postalCode: '06000',
  propertyType: 'apartment',
  district: null,
  surfaceArea: 80,
  roomsCount: 4,
  advisorPriceMin: 400000,
  advisorPriceMax: 480000,
  subject: SUBJECT,
};

const NO_FEATURES: CandidateFeatures = {
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

let n = 0;
function card(features: Partial<CandidateFeatures>, over: Partial<CompetitorCandidate> = {}) {
  n += 1;
  const candidate: CompetitorCandidate = {
    key: `p${n}`,
    url: `https://www.seloger.com/annonces/p${n}.htm`,
    title: null,
    // Centre de la fourchette 400–480 k€, à 1 € près : même commune, même prix, mêmes pièces et
    // même surface seraient UN SEUL bien pour Stream Estate (mission 78).
    price: 440000 + n,
    surfaceArea: 80,
    roomsCount: 4,
    propertyType: 'apartment',
    pricePerSqm: null,
    landArea: null,
    city: 'Nice',
    photoUrls: [],
    isNewBuild: false,
    features: { ...NO_FEATURES, ...features },
    ...over,
  };
  return candidate;
}

function portalOf(candidates: CompetitorCandidate[]): PortalSearchResult {
  return {
    portal: STREAM_ESTATE_SOURCE,
    label: STREAM_ESTATE_LABEL,
    searchUrl: '',
    status: 'ok',
    message: null,
    candidates,
  };
}

const order = (
  candidates: CompetitorCandidate[],
  criteria: CompetitorSearchCriteria = FLAT,
  subjectLocation: GeoPoint | null = JEAN_MEDECIN,
) =>
  rankCandidates(criteria, [portalOf(candidates)], PREFS, { subjectLocation }).ranked.map(
    (entry) => entry.candidate.key,
  );

const reasonOf = (candidate: CompetitorCandidate, criterion: string, criteria = FLAT) =>
  assessProximity(criteria, candidate, JEAN_MEDECIN, 'apartment').reasons.find(
    (reason) => reason.criterion === criterion,
  );

// Un point à ~300 m et un à ~3 km de l'avenue Jean Médecin.
const NEAR: GeoPoint = { lat: 43.7022, lon: 7.268857 };
const FAR: GeoPoint = { lat: 43.7265, lon: 7.268857 };

describe('ordre en deux niveaux : le niveau 1 prime toujours sur le niveau 2', () => {
  it('meilleur au niveau 1 passe devant, même avec tout le niveau 2 contre lui', () => {
    const level1 = card({
      location: NEAR,
      floor: 9,
      hasElevator: false,
      hasPool: true,
      condition: 'to_renovate',
      exposure: 'north',
      constructionYear: 2020,
    });
    const level2 = card({
      location: FAR,
      floor: 2,
      hasElevator: true,
      hasPool: false,
      condition: 'good',
      exposure: 'south',
      constructionYear: 1970,
    });
    const [first] = rankCandidates(FLAT, [portalOf([level2, level1])], PREFS, {
      subjectLocation: JEAN_MEDECIN,
    }).ranked;
    expect(first.candidate.key).toBe(level1.key);
    expect(first.proximity.level2).toBeLessThan(0);
  });

  it('à niveau 1 égal, le niveau 2 départage', () => {
    const sameStreetBadFloor = card({ location: NEAR, floor: 7 });
    const sameStreetSameFloor = card({ location: NEAR, floor: 2 });
    expect(order([sameStreetBadFloor, sameStreetSameFloor])).toEqual([
      sameStreetSameFloor.key,
      sameStreetBadFloor.key,
    ]);
  });

  it('les critères du niveau 1 ordonnent : secteur, surface, prix, stationnement, extérieur', () => {
    const base = { location: NEAR };
    const garage = card({ ...base, parking: ['garage'] });
    const box = card({ ...base, parking: ['box'] });
    expect(order([box, garage])).toEqual([garage.key, box.key]);

    const terrace = card({ ...base, outdoor: { present: ['terrace'], absent: [] } });
    const balcony = card({ ...base, outdoor: { present: ['balcony'], absent: [] } });
    expect(order([balcony, terrace])).toEqual([terrace.key, balcony.key]);

    const centered = card(base, { price: 440000 });
    const edge = card(base, { price: 478000 });
    expect(order([edge, centered])).toEqual([centered.key, edge.key]);

    const sameSurface = card(base, { surfaceArea: 80 });
    const offSurface = card(base, { surfaceArea: 87 });
    expect(order([offSurface, sameSurface])).toEqual([sameSurface.key, offSurface.key]);
  });

  it('le barème distance : +2 sous 500 m, +1 jusqu’à 1 km, 0 de 1 à 2 km, −1 au-delà', () => {
    expect(distanceBand(350)).toEqual({ points: 2, label: 'à 350 m' });
    expect(distanceBand(800)).toEqual({ points: 1, label: 'à 800 m' });
    expect(distanceBand(1400)).toEqual({ points: 0, label: 'à 1,4 km' });
    expect(distanceBand(2000).points).toBe(0);
    expect(distanceBand(2600)).toEqual({ points: -1, label: 'à 2,6 km' });
  });

  it('une distance connue et proche ne passe jamais derrière une position inconnue', () => {
    // L'inconnu a tout le niveau 2 pour lui ; la distance connue (< 1 km) passe quand même devant.
    const bestLevel2 = {
      floor: 2,
      hasElevator: true,
      hasPool: false,
      condition: 'good',
      exposure: 'south',
      constructionYear: 1970,
    };
    const unknownPosition = card(bestLevel2);
    const at350 = card({ location: NEAR }); // ≈ 300 m
    const at800 = card({ location: { lat: 43.7067, lon: 7.268857 } }); // ≈ 800 m
    expect(order([unknownPosition, at800, at350])).toEqual([
      at350.key,
      at800.key,
      unknownPosition.key,
    ]);
    // De 1 à 2 km : à égalité avec l'inconnu au niveau 1 (0 point), jamais derrière lui à cause
    // de la distance ; c'est le niveau 2 qui départage.
    const at1400 = card({ location: { lat: 43.712, lon: 7.268857 } });
    expect(reasonOf(at1400, 'sector')?.points).toBe(0);
    expect(reasonOf(unknownPosition, 'sector')?.points).toBe(0);
    // Au-delà de 2 km, la distance éloigne.
    expect(reasonOf(card({ location: FAR }), 'sector')?.points).toBe(-1);
  });

  it('les filtres ne changent pas : un bien hors fourchette n’entre pas, même tout proche', () => {
    // Mission 71 — Stream Estate admet jusqu'à 5 % hors fourchette (504 000 €) ; au-delà, rien.
    const outside = card({ location: NEAR }, { price: 510000 });
    const inside = card({ location: FAR });
    expect(order([outside, inside])).toEqual([inside.key]);
  });
});

describe('une donnée inconnue est NEUTRE, et dite « non indiqué »', () => {
  it('inconnu côté annonce : 0 point, libellé « non indiqué »', () => {
    const unknown = card({});
    expect(reasonOf(unknown, 'parking')).toMatchObject({
      points: 0,
      known: false,
      label: 'stationnement non indiqué',
    });
    expect(reasonOf(unknown, 'condition')?.label).toBe('état non indiqué');
    expect(reasonOf(unknown, 'elevator')?.label).toBe('ascenseur non indiqué');
    expect(reasonOf(unknown, 'pool')?.label).toBe('piscine non indiquée');
  });

  it('inconnu côté bien vendeur : 0 point, même quand l’annonce, elle, le dit', () => {
    const blank: CompetitorSearchCriteria = {
      ...FLAT,
      subject: {
        ...SUBJECT,
        parkingTypes: [],
        outdoorSpaces: [],
        generalCondition: null,
        hasElevator: null,
        hasPool: null,
      },
    };
    const said = card({
      parking: ['box'],
      outdoor: { present: ['balcony'], absent: [] },
      condition: 'to_renovate',
      hasElevator: false,
      hasPool: true,
    });
    for (const criterion of ['parking', 'outdoor', 'condition', 'elevator', 'pool']) {
      expect(reasonOf(said, criterion, blank)).toMatchObject({ points: 0, known: false });
    }
  });

  it('l’inconnu se range ENTRE ce qui correspond et ce qui ne correspond pas', () => {
    const match = card({ location: NEAR, parking: ['garage'] });
    const unknown = card({ location: NEAR });
    const mismatch = card({ location: NEAR, parking: ['place'] });
    expect(order([mismatch, unknown, match])).toEqual([match.key, unknown.key, mismatch.key]);
  });

  it('une annonce sans aucun champ structuré n’est ni avantagée ni pénalisée par son silence', () => {
    const silent = card({});
    const assessment = assessProximity(FLAT, silent, null, 'apartment');
    const unknownReasons = assessment.reasons.filter((reason) => !reason.known);
    expect(unknownReasons.every((reason) => reason.points === 0)).toBe(true);
    expect(unknownReasons.map((reason) => reason.label)).toContain('secteur non indiqué');
  });

  it('pour une maison vendeuse, étage et ascenseur ne sont ni comptés ni affichés', () => {
    const house = { ...FLAT, propertyType: 'house' };
    const criteria = assessProximity(house, card({ floor: 9 }), null, 'house').reasons.map(
      (reason) => reason.criterion,
    );
    expect(criteria).not.toContain('floor');
    expect(criteria).not.toContain('elevator');
    expect(criteria).toContain('pool');
  });
});

describe('secteur : géocodage de l’adresse du bien vendeur', () => {
  const feature = (type: string, score: number, city = 'Nice') => ({
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [7.268857, 43.699502] },
        properties: { label: '12 Avenue Jean Médecin 06000 Nice', score, type, city },
      },
    ],
  });

  it('accepte un résultat au numéro ou à la rue, avec un score ≥ 0,8', () => {
    expect(judgeGeocode(feature('housenumber', 0.98), 'Nice')).toEqual({
      ok: true,
      point: JEAN_MEDECIN,
      sector: { status: 'located', label: '12 Avenue Jean Médecin 06000 Nice' },
    });
    expect(judgeGeocode(feature('street', 0.8), 'Nice').ok).toBe(true);
  });

  it('refuse un résultat au quartier ou à la commune, même avec un bon score', () => {
    // Mesuré le 05/10 : « Saint-Barthélemy Nice » sort au quartier, score 0,71.
    expect(judgeGeocode(feature('locality', 0.95), 'Nice')).toEqual({
      ok: false,
      sector: { status: 'neutral', reason: 'imprecise' },
    });
    expect(judgeGeocode(feature('municipality', 0.99), 'Nice').ok).toBe(false);
  });

  it('refuse un score sous 0,8, une autre commune, une réponse vide ou illisible', () => {
    expect(judgeGeocode(feature('housenumber', 0.79), 'Nice').sector).toEqual({
      status: 'neutral',
      reason: 'low_score',
    });
    expect(judgeGeocode(feature('housenumber', 0.95, 'Cagnes-sur-Mer'), 'Nice').sector).toEqual({
      status: 'neutral',
      reason: 'other_city',
    });
    expect(judgeGeocode({ features: [] }, 'Nice').sector).toEqual({
      status: 'neutral',
      reason: 'imprecise',
    });
    expect(judgeGeocode('<html>', 'Nice').sector).toEqual({
      status: 'neutral',
      reason: 'unavailable',
    });
  });

  it('sans adresse, aucune requête ; avec, la commune et le code postal l’accompagnent', () => {
    expect(geocodeUrl(null, '06000', 'Nice')).toBeNull();
    expect(geocodeUrl('  ', '06000', 'Nice')).toBeNull();
    const url = new URL(geocodeUrl('12 avenue Jean Médecin', '06000', 'Nice')!);
    expect(url.origin).toBe('https://api-adresse.data.gouv.fr');
    expect(url.searchParams.get('q')).toBe('12 avenue Jean Médecin 06000 Nice');
    expect(url.searchParams.get('postcode')).toBe('06000');
  });

  it('géocodage refusé : le secteur est neutre pour tous, l’ordre suit les autres critères', () => {
    const near = card({ location: NEAR, parking: ['box'] });
    const far = card({ location: FAR, parking: ['garage'] });
    expect(order([near, far], FLAT, JEAN_MEDECIN)).toEqual([near.key, far.key]);
    expect(order([near, far], FLAT, null)).toEqual([far.key, near.key]);
    expect(reasonOf(near, 'sector', FLAT)?.label).toMatch(/^à \d+ m$/);
    expect(
      assessProximity(FLAT, near, null, 'apartment').reasons.find((r) => r.criterion === 'sector'),
    ).toMatchObject({ points: 0, known: false, label: 'secteur non indiqué' });
  });

  it('portails : même quartier écrit sur la carte → rapproche ; autre quartier → neutre', () => {
    const inLePort = { ...FLAT, district: 'Sainte-Marguerite' };
    const same = card({ district: 'Caucade - Sainte Marguerite' });
    const other = card({ district: 'Libération' });
    expect(reasonOf(same, 'sector', inLePort)).toMatchObject({
      points: 1,
      label: 'même quartier (Caucade - Sainte Marguerite)',
    });
    expect(reasonOf(other, 'sector', inLePort)).toMatchObject({
      points: 0,
      label: 'quartier Libération',
    });
  });
});

describe('coordonnées de remplissage Stream Estate écartées', () => {
  it('un point à moins de 3 décimales est du remplissage (« 43.7,7.25 », « 43,7 »)', () => {
    expect(isFillerLocation({ lat: 43.7, lon: 7.25 }, new Set())).toBe(true);
    expect(isFillerLocation({ lat: 43, lon: 7 }, new Set())).toBe(true);
    expect(isFillerLocation({ lat: 43.708414, lon: 7.260273 }, new Set())).toBe(false);
  });

  it('un point exact partagé par deux biens distincts est du remplissage', () => {
    const shared = { lat: 43.718583846154, lon: 7.25697 };
    const repeated = repeatedLocations([shared, { ...shared }, { lat: 43.70841, lon: 7.26027 }]);
    expect(isFillerLocation(shared, repeated)).toBe(true);
    expect(isFillerLocation({ lat: 43.70841, lon: 7.26027 }, repeated)).toBe(false);
  });

  it('sur une vraie réponse (30 biens) : les points répétés et grossiers sont écartés, pas devinés', () => {
    const parsed = parseStreamEstateResponse(proximityFixture, RECORDED_AT)!;
    const features = parsed.candidates.map((candidate) => candidate.features!);
    const kept = features.filter((f) => f.location != null);
    const discarded = features.filter((f) => f.locationDiscarded);
    // Mesuré sur cette réponse : 2 × 43.7,7.25 et 2 points de zone partagés chacun par 2 biens.
    // e8aec357 (un des 2 au point 43.7186,7.25697) n'est plus affiché, origine expirée : il en
    // reste 5 — mais le point reste « répété » pour son jumeau, compté sur toute la réponse.
    expect(discarded).toHaveLength(5);
    expect(discarded.every((f) => f.location == null)).toBe(true);
    expect(kept.some((f) => f.location!.lat === 43.7 && f.location!.lon === 7.25)).toBe(false);
    const keys = kept.map((f) => `${f.location!.lat},${f.location!.lon}`);
    expect(new Set(keys).size).toBe(keys.length);
    // Un bien au point écarté : secteur « non indiqué (position approximative) », neutre.
    const filler = parsed.candidates.find((c) => c.features!.locationDiscarded)!;
    expect(reasonOf(filler, 'sector')).toMatchObject({
      points: 0,
      label: 'secteur non indiqué (position approximative)',
    });
  });

  it('lit les champs structurés de l’API, jamais la description', () => {
    const read = readStreamEstateFeatures(
      {
        location: { lat: 43.70841443346, lon: 7.2602738798141 },
        floor: 2,
        elevator: null,
        adverts: [
          {
            elevator: true,
            constructionYear: 1987,
            features: [
              '2/6 étage',
              'Ascenseur',
              '1 parking: Garage',
              'Balcon',
              'Terrasse',
              'Etat : très bon',
              'Exposition sud-est',
              'Piscine',
            ],
          },
          { features: ['Pas de balcon', 'Jardin à proximité'] },
        ],
      },
      new Set(),
    );
    expect(read).toEqual({
      location: { lat: 43.70841443346, lon: 7.2602738798141 },
      locationDiscarded: false,
      district: null,
      floor: 2,
      hasElevator: true,
      hasPool: true,
      parking: ['garage'],
      // « Balcon » d'une annonce l'emporte sur « Pas de balcon » d'une autre ; « Jardin à
      // proximité » n'est pas une étiquette de jardin.
      outdoor: { present: ['balcony', 'terrace'], absent: [] },
      condition: 'excellent',
      exposure: 'south_east',
      constructionYear: 1987,
    });
  });
});

describe('limite : les 10 premiers, puis « Voir les N autres »', () => {
  const parsed = parseStreamEstateResponse(proximityFixture, RECORDED_AT)!;
  // Ce bloc porte sur la limite d'affichage, pas sur le neuf : les biens neufs de la réponse y sont
  // traités comme de l'ancien, pour garder plus de 10 annonces classées.
  const asOld = parsed.candidates.map((candidate) => ({ ...candidate, isNewBuild: false }));
  const ranked = rankCandidates(FLAT, [portalOf(asOld)], PREFS, {
    subjectLocation: JEAN_MEDECIN,
  }).ranked;

  it('montre 10 annonces et garde toutes les autres, dans le même ordre', () => {
    expect(ranked.length).toBeGreaterThan(VISIBLE_CANDIDATES);
    const { shown, others } = splitVisible(ranked);
    expect(VISIBLE_CANDIDATES).toBe(10);
    expect(shown).toHaveLength(10);
    expect(others).toHaveLength(ranked.length - 10);
    expect([...shown, ...others]).toEqual(ranked);
  });

  it('seuls les 5 premiers sont cochés d’office ; les 10 restent montrés et numérotés', () => {
    const { shown, preselected } = splitVisible(ranked);
    expect(PRESELECTED_CANDIDATES).toBe(5);
    expect(preselected).toEqual(ranked.slice(0, 5));
    expect(shown).toHaveLength(10);
    // Aucune annonce au-delà du 5e n'est cochée d'office, montrée ou non.
    expect(preselected.every((entry) => ranked.indexOf(entry) < 5)).toBe(true);
  });

  it('moins de 10 annonces : tout est montré, rien derrière le bouton', () => {
    expect(splitVisible(ranked.slice(0, 4))).toEqual({
      shown: ranked.slice(0, 4),
      others: [],
      preselected: ranked.slice(0, 4),
    });
  });

  it('l’ordre est bien décroissant : le %, puis niveau 1, puis niveau 2 (mission 71)', () => {
    for (let i = 1; i < ranked.length; i += 1) {
      const [a, b] = [ranked[i - 1], ranked[i]];
      const [pa, pb] = [a.matchPercent ?? -1, b.matchPercent ?? -1];
      expect(pa >= pb).toBe(true);
      if (pa === pb) {
        const [x, y] = [a.proximity, b.proximity];
        expect(x.level1 > y.level1 || (x.level1 === y.level1 && x.level2 >= y.level2)).toBe(true);
      }
    }
  });
});

describe('non-régression : mêmes annonces admises sur les pages appartements, studio et maison', () => {
  const ROOT = join(__dirname, '..', '__fixtures__');
  const URLS: Record<SearchPortal, string> = {
    seloger: 'https://www.seloger.com/classified-search',
    bienici: 'https://www.bienici.com/recherche/achat/nice-06000',
    green_acres: 'https://www.green-acres.fr/x',
    maisons_appartements: 'https://www.maisonsetappartements.fr/views/Search.php',
  };
  const page = (portal: SearchPortal, file: string): PortalSearchResult => {
    const read = readSearchPage(readFileSync(join(ROOT, file), 'utf8'), URLS[portal]);
    if (!read.ok) throw new Error(`lecture ${file}`);
    return read.portal;
  };
  const pages = (suffix: '' | '-maison') => [
    page('seloger', `filtre/seloger${suffix}.html`),
    page('bienici', `filtre/bienici${suffix}.html`),
    page('green_acres', `filtre/green-acres${suffix}.html`),
    page('maisons_appartements', `filtre/maisons-appartements${suffix}.html`),
  ];
  const nicePages = (): PortalSearchResult[] =>
    (
      [
        ['seloger', 'seloger-resultats-nice.html'],
        ['bienici', 'bienici-resultats-nice.html'],
        ['green_acres', 'green-acres-resultats-nice.html'],
        ['maisons_appartements', 'maisons-et-appartements-resultats-nice.html'],
      ] as [SearchPortal, string][]
    ).map(([portal, file]) => ({
      portal,
      label: portal,
      searchUrl: URLS[portal],
      status: 'ok' as const,
      message: null,
      candidates: extractSearchResults(
        readFileSync(join(ROOT, file), 'utf8'),
        URLS[portal],
        portal,
      ),
    }));

  // Sans fiche détaillée ni position (comme avant l'étape 2) contre fiche complète + position : la
  // liste admise, le desserrage et les écartés doivent être IDENTIQUES ; seul l'ordre peut bouger.
  const same = (criteria: CompetitorSearchCriteria, portals: PortalSearchResult[]) => {
    const before = rankCandidates({ ...criteria, subject: undefined }, portals, PREFS);
    const after = rankCandidates({ ...criteria, district: 'Libération' }, portals, PREFS, {
      subjectLocation: JEAN_MEDECIN,
    });
    const keys = (r: typeof before) => r.ranked.map((e) => `${e.portal}:${e.candidate.key}`).sort();
    expect(keys(after)).toEqual(keys(before));
    expect(after.loosening).toEqual(before.loosening);
    expect(after.excludedForMissing).toEqual(before.excludedForMissing);
    expect(after.belowMinimum).toBe(before.belowMinimum);
    return after;
  };

  it('appartements (4 pièces, 80 m², pages filtrées des quatre portails)', () => {
    const after = same({ ...FLAT, advisorPriceMax: 500000 }, pages(''));
    expect(after.ranked.length).toBeGreaterThan(0);
  });

  it('studio (1 pièce, 20 m², pages Nice non filtrées)', () => {
    const studio: CompetitorSearchCriteria = {
      ...FLAT,
      surfaceArea: 20,
      roomsCount: 1,
      advisorPriceMin: 100000,
      advisorPriceMax: 250000,
    };
    const after = same(studio, nicePages());
    expect(after.ranked.length).toBeGreaterThan(0);
    expect(after.ranked.every((e) => e.candidate.roomsCount! <= 2)).toBe(true);
  });

  it('maison (5 pièces, 145 m², pages maison filtrées)', () => {
    const house: CompetitorSearchCriteria = {
      ...FLAT,
      propertyType: 'house',
      surfaceArea: 145,
      roomsCount: 5,
      advisorPriceMin: 650000,
      advisorPriceMax: 900000,
      landArea: 800,
      subject: { ...SUBJECT, hasPool: true },
    };
    const after = same(house, pages('-maison'));
    expect(after.ranked.length).toBeGreaterThan(0);
  });

  it('les cartes SeLoger portent le quartier écrit et l’étage ; Bien’ici le quartier', () => {
    const seloger = page('seloger', 'filtre/seloger.html').candidates;
    // « Appartement à vendre - Nice - 465 000 € - 4 pièces, 3 chambres, 80 m², Étage 6/7 ».
    const piol = seloger.find((c) => c.features?.district === 'Parc Impérial - Le Piol');
    expect(piol?.features?.floor).toBe(6);
    expect(seloger.some((c) => c.features?.floor === 0)).toBe(true); // « RDC/… »
    expect(seloger.filter((c) => c.features?.district != null).length).toBeGreaterThan(
      seloger.length / 2,
    );
    const bienici = page('bienici', 'filtre/bienici.html').candidates;
    expect(bienici.map((c) => c.features?.district)).toContain('Valrose');
    // Rien d'autre n'est tiré d'une carte de portail : équipements inconnus.
    expect(seloger.every((c) => c.features?.parking == null && c.features?.hasPool == null)).toBe(
      true,
    );
  });
});
