import { describe, expect, it } from 'vitest';

import { learnFromDecisions } from '@/features/competitor-search/services/learn-from-decisions';
import { rankCandidates } from '@/features/competitor-search/services/rank-candidates';
import { DEFAULT_SEARCH_SETTINGS } from '@/features/competitor-search/services/search-settings';
import { baseStreamEstateQuery } from '@/features/competitor-search/services/stream-estate';
import {
  describeStreamEstateSearch,
  type StreamEstateSearchNote,
} from '@/features/competitor-search/services/stream-estate-summary';
import {
  neighbourInseeCodes,
  planTiers,
  runTieredSearch,
  tierQueryParams,
  type TierPlan,
} from '@/features/competitor-search/services/stream-estate-tiers';
import {
  STREAM_ESTATE_LABEL,
  STREAM_ESTATE_SOURCE,
  type CandidateSource,
  type CompetitorCandidate,
  type CompetitorSearchCriteria,
  type StreamEstateTier,
} from '@/features/competitor-search/types';
import {
  arrondissementCityInsee,
  arrondissementInsee,
  arrondissementLabel,
  arrondissementOfInsee,
  arrondissementOfPostalCode,
  compareArrondissements,
  displayCommune,
  neighbourArrondissements,
  resolveArrondissement,
  siblingArrondissements,
  type Arrondissement,
  type ArrondissementCity,
} from '@/features/competitor-search/utils/arrondissements';

// MISSION 99 — Paris, Lyon, Marseille. Aucun appel réseau, aucun appel payant.

const paris = (number: number): Arrondissement => ({ city: 'paris', number });
const lyon = (number: number): Arrondissement => ({ city: 'lyon', number });
const marseille = (number: number): Arrondissement => ({ city: 'marseille', number });
const numbers = (list: Arrondissement[]): number[] => list.map((entry) => entry.number);

describe('rattachement à l’arrondissement', () => {
  it('par le code postal : 75001 à 75020 (et 75116), 69001 à 69009, 13001 à 13016', () => {
    expect(arrondissementOfPostalCode('75015')).toEqual(paris(15));
    expect(arrondissementOfPostalCode('75001')).toEqual(paris(1));
    expect(arrondissementOfPostalCode('75020')).toEqual(paris(20));
    expect(arrondissementOfPostalCode('75116')).toEqual(paris(16));
    expect(arrondissementOfPostalCode('69003')).toEqual(lyon(3));
    expect(arrondissementOfPostalCode('69009')).toEqual(lyon(9));
    expect(arrondissementOfPostalCode('13008')).toEqual(marseille(8));
    expect(arrondissementOfPostalCode('13016')).toEqual(marseille(16));
    for (const other of [
      '75021',
      '75000',
      '69010',
      '13017',
      '69100',
      '13100',
      '06000',
      '7501',
      null,
    ]) {
      expect(arrondissementOfPostalCode(other)).toBeNull();
    }
  });

  it('donne les codes INSEE 75101 à 75120, 69381 à 69389, 13201 à 13216', () => {
    expect(arrondissementInsee(paris(1))).toBe('75101');
    expect(arrondissementInsee(paris(15))).toBe('75115');
    expect(arrondissementInsee(paris(20))).toBe('75120');
    expect(arrondissementInsee(lyon(1))).toBe('69381');
    expect(arrondissementInsee(lyon(3))).toBe('69383');
    expect(arrondissementInsee(lyon(9))).toBe('69389');
    expect(arrondissementInsee(marseille(1))).toBe('13201');
    expect(arrondissementInsee(marseille(8))).toBe('13208');
    expect(arrondissementInsee(marseille(16))).toBe('13216');
    expect(arrondissementOfInsee('75115')).toEqual(paris(15));
    expect(arrondissementOfInsee('69383')).toEqual(lyon(3));
    expect(arrondissementOfInsee('13208')).toEqual(marseille(8));
    expect(arrondissementOfInsee('75056')).toBeNull();
    expect(arrondissementOfInsee('06088')).toBeNull();
  });

  it('depuis une saisie, un import ou un code postal', () => {
    // Saisie : la ville et le code postal de la fiche.
    expect(resolveArrondissement('Paris', '75015')).toEqual(paris(15));
    expect(resolveArrondissement('Lyon', '69003')).toEqual(lyon(3));
    expect(resolveArrondissement('Marseille', '13008')).toEqual(marseille(8));
    // Import : les portails écrivent l'arrondissement dans la ville.
    expect(resolveArrondissement('Paris 15e', null)).toEqual(paris(15));
    expect(resolveArrondissement('Paris 15ème', null)).toEqual(paris(15));
    expect(resolveArrondissement('PARIS 15E ARRONDISSEMENT', null)).toEqual(paris(15));
    expect(resolveArrondissement('Paris 1er', null)).toEqual(paris(1));
    expect(resolveArrondissement('Lyon 3ème', null)).toEqual(lyon(3));
    expect(resolveArrondissement('Marseille 08', null)).toEqual(marseille(8));
    expect(resolveArrondissement('Marseille 8e Arrondissement', '13008')).toEqual(marseille(8));
    // Un code postal collé à la ville.
    expect(resolveArrondissement('Paris 75015', null)).toEqual(paris(15));
  });

  it('ne devine jamais', () => {
    expect(resolveArrondissement('Paris', null)).toBeNull();
    expect(resolveArrondissement('Paris 14e', '75015')).toBeNull(); // désaccord
    expect(resolveArrondissement('Paris 25', null)).toBeNull();
    expect(resolveArrondissement('Nice', '06000')).toBeNull();
    expect(resolveArrondissement('Parisot', '81310')).toBeNull();
    expect(resolveArrondissement('Lyon', '75015')).toBeNull(); // le code postal d'une autre ville
    expect(resolveArrondissement('Villeurbanne', '69100')).toBeNull();
  });
});

describe('arrondissements voisins', () => {
  it('Paris : 15e, 1er, 9e, 20e', () => {
    expect(numbers(neighbourArrondissements(paris(15)))).toEqual([6, 7, 14, 16]);
    expect(numbers(neighbourArrondissements(paris(1)))).toEqual([2, 3, 4, 6, 7, 8, 9]);
    // Le 9e et le 17e ne se touchent qu'en un point (place de Clichy) : pas voisins.
    expect(numbers(neighbourArrondissements(paris(9)))).toEqual([1, 2, 8, 10, 18]);
    expect(numbers(neighbourArrondissements(paris(20)))).toEqual([11, 12, 19]);
  });

  it('Lyon : 3e, 1er, 8e', () => {
    expect(numbers(neighbourArrondissements(lyon(3)))).toEqual([2, 6, 7, 8]);
    expect(numbers(neighbourArrondissements(lyon(1)))).toEqual([2, 4, 5, 6, 9]);
    expect(numbers(neighbourArrondissements(lyon(8)))).toEqual([3, 7]);
  });

  it('Marseille : 8e, 1er, 16e', () => {
    expect(numbers(neighbourArrondissements(marseille(8)))).toEqual([6, 7, 9, 10]);
    expect(numbers(neighbourArrondissements(marseille(1)))).toEqual([2, 3, 4, 5, 6, 7]);
    expect(numbers(neighbourArrondissements(marseille(16)))).toEqual([15]);
  });

  it('la liste est symétrique, complète, et jamais « toute la ville »', () => {
    const cities: [ArrondissementCity, number][] = [
      ['paris', 20],
      ['lyon', 9],
      ['marseille', 16],
    ];
    for (const [city, count] of cities) {
      for (let number = 1; number <= count; number += 1) {
        const neighbours = numbers(neighbourArrondissements({ city, number }));
        expect(neighbours.length).toBeGreaterThan(0);
        expect(neighbours.length).toBeLessThan(count - 1);
        expect(neighbours).not.toContain(number);
        for (const other of neighbours) {
          expect(numbers(neighbourArrondissements({ city, number: other }))).toContain(number);
        }
        expect(siblingArrondissements({ city, number })).toHaveLength(count - 1);
      }
    }
  });
});

describe('affichage « Paris 15e »', () => {
  it('écrit l’arrondissement à la place de la ville', () => {
    expect(arrondissementLabel(paris(15))).toBe('Paris 15e');
    expect(arrondissementLabel(lyon(3))).toBe('Lyon 3e');
    expect(arrondissementLabel(marseille(8))).toBe('Marseille 8e');
    expect(arrondissementLabel(paris(1))).toBe('Paris 1er');
    expect(displayCommune('Paris', '75015')).toBe('Paris 15e');
    expect(displayCommune('PARIS', '75015')).toBe('Paris 15e');
    expect(displayCommune('Lyon', '69003')).toBe('Lyon 3e');
    expect(displayCommune('Marseille', '13008')).toBe('Marseille 8e');
    expect(displayCommune('Paris 15ème')).toBe('Paris 15e');
    expect(displayCommune('Paris 15e Arrondissement', null)).toBe('Paris 15e');
  });

  it('laisse les autres communes telles que saisies, et ne devine pas l’arrondissement', () => {
    expect(displayCommune('Saint-Laurent-du-Var', '06700')).toBe('Saint-Laurent-du-Var');
    expect(displayCommune('  Nice ', '06000')).toBe('Nice');
    expect(displayCommune('Paris', null)).toBe('Paris');
    expect(displayCommune('Paris 14e', '75015')).toBe('Paris'); // désaccord : la ville seule
    expect(displayCommune(null, '75015')).toBeNull();
    expect(displayCommune('', null)).toBeNull();
  });

  it('compare deux communes, arrondissement compris', () => {
    const subject = { city: 'Paris', postalCode: '75015' };
    expect(compareArrondissements(subject, { city: 'Paris 15e' })).toBe('same');
    expect(compareArrondissements(subject, { city: 'Paris 15ème' })).toBe('same');
    expect(compareArrondissements(subject, { city: 'Paris 14e' })).toBe('different');
    expect(compareArrondissements(subject, { city: 'Paris' })).toBe('unknown');
    expect(compareArrondissements(subject, { city: 'Lyon 3e' })).toBe('different');
    expect(compareArrondissements(subject, { city: 'Issy-les-Moulineaux' })).toBe('different');
    expect(compareArrondissements({ city: 'Nice' }, { city: 'Antibes' })).toBe('not_applicable');
  });
});

// --- La recherche ----------------------------------------------------------------------------

const NOW = new Date('2026-10-12T08:00:00Z');

// Un appartement de 3 pièces et 70 m², fourchette 600 000 – 700 000 €.
const criteria = (city: string, postalCode: string): CompetitorSearchCriteria => ({
  city,
  postalCode,
  propertyType: 'Appartement',
  district: null,
  surfaceArea: 70,
  roomsCount: 3,
  advisorPriceMin: 600_000,
  advisorPriceMax: 700_000,
});

type Case = {
  label: string;
  arrondissement: Arrondissement;
  criteria: CompetitorSearchCriteria;
  origin: { lat: number; lon: number };
};
const CASES: Case[] = [
  {
    label: 'Paris 15e',
    arrondissement: paris(15),
    criteria: criteria('Paris', '75015'),
    origin: { lat: 48.844828, lon: 2.309841 }, // 12 rue Lecourbe
  },
  {
    label: 'Lyon 3e',
    arrondissement: lyon(3),
    criteria: criteria('Lyon', '69003'),
    origin: { lat: 45.7606, lon: 4.85 },
  },
  {
    label: 'Marseille 8e',
    arrondissement: marseille(8),
    criteria: criteria('Marseille', '13008'),
    origin: { lat: 43.2715, lon: 5.3885 },
  },
];

const codes = (list: Arrondissement[]): string[] => list.map(arrondissementInsee);
const plansFor = (entry: Case, located = true): TierPlan[] =>
  planTiers(entry.criteria, {
    located,
    hasCentre: true,
    arrondissement: {
      code: arrondissementInsee(entry.arrondissement),
      neighbours: codes(neighbourArrondissements(entry.arrondissement)),
    },
  });
const excludedFor = (entry: Case): string[] =>
  neighbourInseeCodes([], arrondissementInsee(entry.arrondissement), entry.origin, 1, {
    cityCode: arrondissementCityInsee(entry.arrondissement.city),
    siblings: codes(siblingArrondissements(entry.arrondissement)),
  });

function queryOf(entry: Case, plan: TierPlan): string {
  const base = baseStreamEstateQuery(entry.criteria, NOW);
  if (!base.ok) throw new Error('type non cherché');
  const slice = plan.slices?.[0] ?? { rooms: plan.rooms, surface: plan.surface };
  return decodeURIComponent(
    tierQueryParams(
      base.params,
      { area: plan.area, ...slice },
      plan.prices[0] ?? null,
      { inseeCode: arrondissementInsee(entry.arrondissement), origin: entry.origin },
      plan.area.kind === 'circle' && plan.area.withinCommune ? excludedFor(entry) : null,
      1,
      20,
    ).toString(),
  );
}

describe('la recherche dans un arrondissement', () => {
  it('garde l’ordre de la mission 71, les voisins à la place de 2 et 5 km, puis 10 km', () => {
    for (const entry of CASES) {
      const plans = plansFor(entry);
      expect(plans.map((plan) => plan.tier)).toEqual([1, 2, 3, 4, 6, 7, 8]);
      // Identique, plus grand, une pièce de plus : 1 km DANS l'arrondissement.
      for (const plan of plans.slice(0, 3)) {
        expect(plan.area).toEqual({ kind: 'circle', radiusKm: 1, withinCommune: true });
      }
      // Puis l'arrondissement et ses voisins — jamais toute la ville d'un coup.
      const own = arrondissementInsee(entry.arrondissement);
      const around = {
        kind: 'commune',
        codes: [own, ...codes(neighbourArrondissements(entry.arrondissement))],
      };
      expect(plans[3].area).toEqual(around);
      expect(plans[4].area).toEqual(around);
      expect(around.codes.length).toBeLessThan(siblingArrondissements(entry.arrondissement).length);
      // Puis 10 km, communes voisines comprises, et le prix à ±5 %.
      expect(plans[5].area).toEqual({ kind: 'circle', radiusKm: 10, withinCommune: false });
      expect(plans[6].area).toEqual({ kind: 'circle', radiusKm: 10, withinCommune: false });
    }
  });

  it('Paris 15e : les requêtes construites (première recherche, puis les voisins)', () => {
    const [entry] = CASES;
    const plans = plansFor(entry);
    expect(queryOf(entry, plans[0])).toBe(
      'transactionType=0&propertyTypes[]=0&expired=false&fromUpdatedAt=2026-09-12+10:00:00' +
        '&lat=48.844828&lon=2.309841&radius=1' +
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 18, 19, 20]
          .map((n) => `&excludedInseeCodes[]=751${String(n).padStart(2, '0')}`)
          .join('') +
        '&roomMin=3&roomMax=3&surfaceMin=63&surfaceMax=77&budgetMin=600000&budgetMax=700000' +
        '&order[updatedAt]=desc&itemsPerPage=20',
    );
    expect(queryOf(entry, plans[3])).toBe(
      'transactionType=0&propertyTypes[]=0&expired=false&fromUpdatedAt=2026-09-12+10:00:00' +
        '&includedInseeCodes[]=75115&includedInseeCodes[]=75106&includedInseeCodes[]=75107' +
        '&includedInseeCodes[]=75114&includedInseeCodes[]=75116' +
        '&roomMin=3&roomMax=4&surfaceMin=63&surfaceMax=87&budgetMin=600000&budgetMax=700000' +
        '&order[updatedAt]=desc&itemsPerPage=20',
    );
  });

  it('Lyon 3e et Marseille 8e : les requêtes construites', () => {
    const [, lyon3, marseille8] = CASES;
    expect(queryOf(lyon3, plansFor(lyon3)[0])).toContain(
      '&lat=45.7606&lon=4.85&radius=1&excludedInseeCodes[]=69381&excludedInseeCodes[]=69382' +
        '&excludedInseeCodes[]=69384&excludedInseeCodes[]=69385&excludedInseeCodes[]=69386' +
        '&excludedInseeCodes[]=69387&excludedInseeCodes[]=69388&excludedInseeCodes[]=69389&roomMin=3',
    );
    expect(queryOf(lyon3, plansFor(lyon3)[3])).toContain(
      '&includedInseeCodes[]=69383&includedInseeCodes[]=69382&includedInseeCodes[]=69386' +
        '&includedInseeCodes[]=69387&includedInseeCodes[]=69388&roomMin=3&roomMax=4',
    );
    expect(queryOf(marseille8, plansFor(marseille8)[0])).toContain(
      '&radius=1&excludedInseeCodes[]=13201',
    );
    expect(queryOf(marseille8, plansFor(marseille8)[0])).not.toContain(
      'excludedInseeCodes[]=13208',
    );
    expect(queryOf(marseille8, plansFor(marseille8)[3])).toContain(
      '&includedInseeCodes[]=13208&includedInseeCodes[]=13206&includedInseeCodes[]=13207' +
        '&includedInseeCodes[]=13209&includedInseeCodes[]=13210&roomMin=3&roomMax=4',
    );
  });

  it('n’exclut jamais la ville entière ni l’arrondissement du bien', () => {
    for (const entry of CASES) {
      const excluded = excludedFor(entry);
      expect(excluded).not.toContain(arrondissementCityInsee(entry.arrondissement.city));
      expect(excluded).not.toContain(arrondissementInsee(entry.arrondissement));
      expect(excluded).toEqual(codes(siblingArrondissements(entry.arrondissement)).sort());
    }
    // La liste du département rend la ville entière : elle n'est pas envoyée.
    const dept = [
      {
        nom: 'Paris',
        code: '75056',
        centre: { coordinates: [2.347, 48.8589] as [number, number] },
      },
    ];
    expect(
      neighbourInseeCodes(dept, '75115', CASES[0].origin, 1, { cityCode: '75056', siblings: [] }),
    ).toEqual([]);
  });

  it('sans adresse géocodée : tout l’arrondissement, puis ses voisins quand même', () => {
    const [entry] = CASES;
    const plans = plansFor(entry, false);
    expect(plans.map((plan) => plan.tier)).toEqual([1, 2, 3, 4, 6, 7, 8]);
    expect(plans[0].area).toEqual({ kind: 'commune' });
    expect(queryOf(entry, plans[0])).toContain('&includedInseeCodes[]=75115&roomMin=3&roomMax=3');
    expect(plans[3].area).toMatchObject({
      kind: 'commune',
      codes: expect.arrayContaining(['75114']),
    });
  });

  it('avec des réglages : « Tout l’arrondissement » ne sort jamais du 15e, le rayon reste possible', () => {
    const [entry] = CASES;
    const options = {
      located: true,
      hasCentre: true,
      arrondissement: { code: '75115', neighbours: ['75106', '75107', '75114', '75116'] },
    };
    const whole = planTiers(entry.criteria, options, {
      ...DEFAULT_SEARCH_SETTINGS,
      sector: { kind: 'commune' },
    });
    expect(whole.every((plan) => plan.area.kind === 'commune' && plan.area.codes == null)).toBe(
      true,
    );
    const radius = planTiers(entry.criteria, options, {
      ...DEFAULT_SEARCH_SETTINGS,
      sector: { kind: 'radius', km: 2 },
    });
    expect(
      radius.every(
        (plan) =>
          plan.area.kind === 'circle' && plan.area.radiusKm === 2 && !plan.area.withinCommune,
      ),
    ).toBe(true);
  });
});

// --- La conduite de la recherche, sur une API simulée -----------------------------------------

const property = (
  id: string,
  insee: string,
  name: string,
  extra: Record<string, unknown> = {},
) => ({
  uuid: id,
  title: 'Appartement à vendre',
  propertyType: 0,
  price: 650_000 + Number(id.replace(/\D/g, '')),
  surface: 70,
  room: 3,
  createdAt: '2026-09-20T10:00:00+02:00',
  lastCrawledAt: '2026-10-11T10:00:00+02:00',
  pictures: [],
  city: { name, insee },
  location: null,
  adverts: [
    {
      url: `https://www.seloger.com/annonces/achat/appartement/paris/${id}.htm`,
      expired: false,
      lastCrawledAt: '2026-10-11T10:00:00+02:00',
    },
  ],
  ...extra,
});

describe('la conduite de la recherche dans un arrondissement (API simulée, aucun appel payant)', () => {
  it('reste dans le 15e, puis admet les voisins à leur étape — jamais un arrondissement plus loin', async () => {
    const [entry] = CASES;
    const seen: string[] = [];
    const outcome = await runTieredSearch({
      criteria: entry.criteria,
      plans: plansFor(entry, false),
      context: { inseeCode: '75115', origin: entry.origin },
      neighbours: null,
      now: NOW,
      fetchPage: async (params) => {
        const included = params.getAll('includedInseeCodes[]');
        seen.push(included.join('+') || `rayon ${params.get('radius')}`);
        const members =
          included.length === 1
            ? [property('a1', '75115', 'Paris 15e'), property('a2', '75114', 'Paris 14e')]
            : included.length > 1
              ? [property('b3', '75114', 'Paris 14e'), property('b4', '75118', 'Paris 18e')]
              : [];
        return { ok: true, json: { 'hydra:totalItems': members.length, 'hydra:member': members } };
      },
    });
    if (!outcome.ok) throw new Error('recherche en échec');
    const found = outcome.candidates.map((candidate) => [
      candidate.key,
      candidate.city,
      candidate.streamEstate?.tier,
    ]);
    // a2 (14e) est écarté à la première recherche ; b3 (14e, voisin) entre à l'étape des voisins ;
    // b4 (18e, pas voisin) n'entre pas.
    expect(found).toEqual([
      ['a1', 'Paris 15e', 1],
      ['b3', 'Paris 14e', 4],
    ]);
    expect(seen[0]).toBe('75115');
    expect(seen).toContain('75115+75106+75107+75114+75116');
    expect(outcome.counts.otherCommune).toBeGreaterThan(0);
  });
});

describe('le classement dans un arrondissement', () => {
  const [entry] = CASES;
  const candidate = (
    id: string,
    insee: string,
    city: string,
    tier: StreamEstateTier,
  ): CompetitorCandidate => ({
    key: id,
    url: `https://www.seloger.com/annonces/${id}.htm`,
    title: null,
    price: 650_000 + id.length,
    surfaceArea: 70,
    roomsCount: 3,
    propertyType: 'apartment',
    pricePerSqm: null,
    landArea: null,
    city,
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
  });
  const kept = (
    candidates: CompetitorCandidate[],
    portal: CandidateSource = STREAM_ESTATE_SOURCE,
  ): string[] =>
    rankCandidates(
      entry.criteria,
      [
        {
          portal,
          label: STREAM_ESTATE_LABEL,
          searchUrl: '',
          status: 'ok',
          message: null,
          candidates,
        },
      ],
      learnFromDecisions([]),
      { subjectInseeCode: '75115', neighbourInseeCodes: ['75106', '75107', '75114', '75116'] },
    )
      .ranked.map((ranked) => ranked.candidate.key!)
      .sort();

  it('admet un voisin à partir de l’étape des voisins, jamais avant, jamais un non-voisin', () => {
    expect(
      kept([
        candidate('dans-le-15e', '75115', 'Paris 15e', 1),
        candidate('voisin-trop-tot', '75114', 'Paris 14e', 1),
        candidate('voisin', '75114', 'Paris 14e', 4),
        candidate('voisin-pieces-libres', '75116', 'Paris 16e', 6),
        candidate('pas-voisin', '75118', 'Paris 18e', 4),
        candidate('a-10-km', '75118', 'Paris 18e', 7),
      ]),
    ).toEqual(['a-10-km', 'dans-le-15e', 'voisin', 'voisin-pieces-libres']);
  });

  it('portails : une carte « Paris 15ème » ou « Paris » reste, une carte « Paris 14e » sort', () => {
    const card = (id: string, city: string | null): CompetitorCandidate => {
      const copy: CompetitorCandidate = { ...candidate(id, '', city ?? '', 1), city };
      delete copy.streamEstate;
      return copy;
    };
    expect(
      kept(
        [
          card('meme', 'Paris 15ème'),
          card('ville-seule', 'Paris'),
          card('sans-ville', null),
          card('autre', 'Paris 14e'),
        ],
        'seloger',
      ),
    ).toEqual(['meme', 'sans-ville', 'ville-seule']);
  });
});

describe('le bilan d’une recherche dans un arrondissement', () => {
  it('nomme l’arrondissement et l’étape des voisins', () => {
    const note: StreamEstateSearchNote = {
      billed: 30,
      stop: 'exhausted',
      cursor: null,
      tiers: [1, 4, 6].map((tier) => ({
        tier: tier as StreamEstateTier,
        billed: 10,
        kept: 1,
        fallback: false,
      })),
      counts: {
        unreadable: 0,
        outsideWhitelist: 0,
        expiredOrigin: 0,
        otherCommune: 2,
        unverifiedPosition: 0,
        duplicates: 0,
      },
      newBuild: 0,
      located: false,
      communeName: 'Paris 15e',
      inseeCode: '75115',
      arrondissement: true,
    };
    const text = describeStreamEstateSearch([], note).details.join(' ');
    expect(text).toContain('l’arrondissement et ses voisins');
    expect(text).toContain('tout l’arrondissement, puis sur ses voisins');
    expect(text).toContain('hors de Paris 15e');
    expect(text).not.toContain('2 et 5 km');
  });
});
