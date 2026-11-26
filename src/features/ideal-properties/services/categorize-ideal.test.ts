import { describe, expect, it } from 'vitest';

import type { BuyerInput } from '@/features/buyers/types';
import type { CandidateFeatures, CompetitorCandidate } from '@/features/competitor-search/types';
import {
  categorizeIdeal,
  excludedLine,
  judgeCandidate,
  toVerifyLabels,
} from '@/features/ideal-properties/services/categorize-ideal';
import { idealSearchCriteria } from '@/features/ideal-properties/services/ideal-criteria';

const buyer: BuyerInput = {
  name: 'M. et Mme Rossi',
  phone: null,
  email: null,
  purpose: null,
  timeline: null,
  notes: null,
  propertyTypes: ['apartment'],
  cities: ['Antibes', 'Juan-les-Pins'],
  budgetIdeal: 380_000,
  budgetMax: 400_000,
  roomsMin: 3,
  bedroomsMin: 2,
  surfaceMin: 60,
  outdoor: true,
  parking: true,
  pool: null,
  floorMin: 1,
  elevator: null,
  energyRatingMax: 'D',
  worksAccepted: false,
  mustHave: ['outdoor', 'budget'],
  dealBreakers: null,
};

type Over = Omit<Partial<CompetitorCandidate>, 'features'> & {
  features?: Partial<CandidateFeatures>;
};

const candidate = (over: Over): CompetitorCandidate => ({
  key: 'k',
  url: 'https://www.seloger.com/annonces/1.htm',
  title: null,
  price: 390_000,
  surfaceArea: 68,
  roomsCount: 3,
  propertyType: 'apartment',
  pricePerSqm: null,
  landArea: null,
  city: 'Antibes',
  photoUrls: [],
  isNewBuild: false,
  energyClass: 'C',
  streamEstate: {
    propertyId: 'p',
    originSite: 'SeLoger',
    onlineSince: null,
    lastSeenAt: null,
    priceDrops: [],
    bedrooms: 2,
  },
  ...over,
  features: {
    location: null,
    locationDiscarded: false,
    district: null,
    floor: 2,
    hasElevator: null,
    hasPool: null,
    parking: ['place'],
    outdoor: { present: ['balcony'], absent: [] },
    condition: 'good',
    exposure: null,
    constructionYear: null,
    ...(over.features ?? {}),
  },
});

// Les montants s'écrivent avec des espaces insécables (M74) : on compare sans en tenir compte.
const plain = (value: unknown): unknown => JSON.parse(JSON.stringify(value).replace(/[  ]/g, ' '));

// Mission 118 — les trois catégories, l'écart nommé, l'écarté compté, l'indispensable non indiqué.
describe('les trois catégories des biens idéaux', () => {
  it('tout satisfait : Correspondance forte', () => {
    expect(judgeCandidate(buyer, candidate({}))).toMatchObject({
      kind: 'kept',
      category: 'strong',
      gaps: [],
      toCheck: [],
    });
  });

  // Essai de Jean-Guy (26/10) : « N critères sur M » remplace le % de correspondance.
  it('« N critères sur M » : ceux qu’il satisfait, sur les critères renseignés', () => {
    const all = judgeCandidate(buyer, candidate({}));
    expect(all.kind === 'kept' && all.criteriaOk === all.criteriaTotal).toBe(true);
    const twoGaps = judgeCandidate(
      buyer,
      candidate({ roomsCount: 2, features: { parking: [], floor: 0 } }),
    );
    expect(twoGaps.kind === 'kept' && twoGaps.criteriaTotal - twoGaps.criteriaOk).toBe(3);
  });

  it('un indispensable contredit écarte, avec sa raison : budget dépassé, pas d’extérieur', () => {
    expect(plain(judgeCandidate(buyer, candidate({ price: 430_000 })))).toEqual({
      kind: 'excluded',
      reasons: ['Budget dépassé de 30 000 €'],
    });
    expect(
      judgeCandidate(
        buyer,
        candidate({ features: { outdoor: { present: [], absent: ['balcon'] } } }),
      ),
    ).toEqual({ kind: 'excluded', reasons: ['Pas d’extérieur'] });
    // Le budget indispensable est strict : 1 € au-dessus écarte.
    expect(judgeCandidate(buyer, candidate({ price: 400_001 })).kind).toBe('excluded');
  });

  it('une préférence non satisfaite : Bon compromis, chaque écart nommé', () => {
    expect(
      judgeCandidate(buyer, candidate({ roomsCount: 2, features: { parking: [], floor: 0 } })),
    ).toMatchObject({
      kind: 'kept',
      category: 'compromise',
      gaps: ['2 pièces au lieu de 3', 'Pas de parking', 'Rez-de-chaussée'],
    });
  });

  it('un indispensable non indiqué par l’annonce : À explorer, et la carte dit lequel', () => {
    expect(judgeCandidate(buyer, candidate({ features: { outdoor: null } }))).toMatchObject({
      kind: 'kept',
      category: 'explore',
      toCheck: ['Extérieur'],
    });
    // Une préférence non indiquée est neutre : Correspondance forte.
    expect(
      judgeCandidate(buyer, candidate({ features: { parking: null, floor: null } })),
    ).toMatchObject({ category: 'strong' });
  });

  it('un budget en préférence : « à négocier » jusqu’à +5 %, dépassé au-delà, jamais écarté', () => {
    const soft: BuyerInput = { ...buyer, mustHave: ['outdoor'] };
    expect(plain(judgeCandidate(soft, candidate({ price: 410_000 })))).toMatchObject({
      category: 'compromise',
      gaps: ['10 000 € au-dessus du budget, à négocier'],
    });
    expect(plain(judgeCandidate(soft, candidate({ price: 450_000 })))).toMatchObject({
      category: 'compromise',
      gaps: ['Budget dépassé de 50 000 €'],
    });
  });

  it('les autres critères de la fiche : type, commune (alias M86), chambres, surface, DPE, travaux', () => {
    expect(judgeCandidate(buyer, candidate({ propertyType: 'house' }))).toMatchObject({
      gaps: ['Une maison, pas un appartement'],
    });
    expect(judgeCandidate(buyer, candidate({ city: 'Juan-les-Pins' })).kind).toBe('kept');
    expect(judgeCandidate(buyer, candidate({ city: 'Nice' }))).toMatchObject({
      gaps: ['Hors des communes demandées (Nice)'],
    });
    expect(
      judgeCandidate(
        buyer,
        candidate({
          streamEstate: {
            propertyId: 'p',
            originSite: 's',
            onlineSince: null,
            lastSeenAt: null,
            priceDrops: [],
            bedrooms: 1,
          },
        }),
      ),
    ).toMatchObject({ gaps: ['1 chambre au lieu de 2'] });
    expect(judgeCandidate(buyer, candidate({ surfaceArea: 55 }))).toMatchObject({
      gaps: ['55 m² au lieu de 60 m²'],
    });
    expect(judgeCandidate(buyer, candidate({ energyClass: 'F' }))).toMatchObject({
      gaps: ['DPE F, au-delà de D'],
    });
    expect(
      judgeCandidate(buyer, candidate({ features: { condition: 'to_renovate' } })),
    ).toMatchObject({ gaps: ['Travaux à prévoir'] });
    // Un critère non renseigné sur la fiche ne compte pas.
    expect(
      judgeCandidate(
        { ...buyer, worksAccepted: null },
        candidate({ features: { condition: 'to_renovate' } }),
      ),
    ).toMatchObject({ category: 'strong' });
  });

  it('range, compte les écartés par raison, et classe par % de correspondance dans chaque catégorie', () => {
    const criteria = idealSearchCriteria(buyer);
    if (!criteria.ok) throw new Error('attendu ok');
    const result = categorizeIdeal(
      buyer,
      [
        candidate({ key: 'a', url: 'https://www.seloger.com/a.htm' }),
        candidate({ key: 'b', url: 'https://www.seloger.com/b.htm', price: 450_000 }),
        candidate({ key: 'c', url: 'https://www.seloger.com/c.htm', price: 420_000 }),
        candidate({ key: 'd', url: 'https://www.seloger.com/d.htm', features: { outdoor: null } }),
        candidate({ key: 'e', url: 'https://www.seloger.com/e.htm', roomsCount: 2 }),
        candidate({
          key: 'f',
          url: 'https://www.seloger.com/f.htm',
          features: { outdoor: { present: [], absent: [] } },
        }),
      ],
      criteria.criteria,
    );
    expect(result.byCategory.strong.map((entry) => entry.candidate.key)).toEqual(['a']);
    expect(result.byCategory.compromise.map((entry) => entry.candidate.key)).toEqual(['e']);
    expect(result.byCategory.explore.map((entry) => entry.candidate.key)).toEqual(['d']);
    expect(result.excluded).toEqual({
      count: 3,
      reasons: [
        { label: 'budget dépassé', count: 2 },
        { label: 'pas d’extérieur', count: 1 },
      ],
    });
    expect(excludedLine(result.excluded)).toBe(
      '3 écartés : budget dépassé (2), pas d’extérieur (1)',
    );
    expect(excludedLine({ count: 0, reasons: [] })).toBeNull();
    for (const entry of result.byCategory.strong) expect(entry.percent).not.toBeNull();
  });
});

// Mission 151 — « Copropriété acceptée : non », un vrai critère (Jean-Guy, 10/11) : une copropriété
// connue écarte avec la ★ et se nomme sans elle ; une copropriété inconnue n'écarte jamais.
describe('la copropriété', () => {
  const noCondo = { ...buyer, condominiumAccepted: false, condominiumMustHave: false };
  const starred = { ...noCondo, condominiumMustHave: true };

  it('★ et copropriété connue : le bien est écarté, compté « en copropriété »', () => {
    const verdict = judgeCandidate(starred, candidate({ features: { isCondominium: true } }));
    expect(verdict).toEqual({ kind: 'excluded', reasons: ['En copropriété'] });
    const all = categorizeIdeal(starred, [candidate({ features: { isCondominium: true } })]);
    expect(excludedLine(all.excluded)).toBe('1 écarté : en copropriété (1)');
  });

  it('★ et copropriété inconnue : À explorer, la carte dit « Copropriété »', () => {
    expect(judgeCandidate(starred, candidate({}))).toMatchObject({
      kind: 'kept',
      category: 'explore',
      toCheck: ['Copropriété'],
      toVerify: [],
    });
  });

  it('sans ★ : connue, un écart du Bon compromis ; inconnue, dite sans changer la catégorie', () => {
    expect(judgeCandidate(noCondo, candidate({ features: { isCondominium: true } }))).toMatchObject(
      { category: 'compromise', gaps: ['En copropriété'] },
    );
    const unknown = judgeCandidate(noCondo, candidate({}));
    expect(unknown).toMatchObject({ category: 'strong', toCheck: [], toVerify: ['Copropriété'] });
    expect(unknown.kind === 'kept' && toVerifyLabels(unknown)).toEqual([
      'Copropriété : à vérifier',
    ]);
    // Une seule forme, pour une annonce comme pour un bien de l'agence (Jean-Guy, 12/11).
    expect(toVerifyLabels({ toCheck: ['Extérieur', 'Copropriété'], toVerify: [] })).toEqual([
      'Extérieur : à vérifier',
      'Copropriété : à vérifier',
    ]);
  });

  it('hors copropriété connue : le critère est rempli et compté', () => {
    const verdict = judgeCandidate(starred, candidate({ features: { isCondominium: false } }));
    const base = judgeCandidate(buyer, candidate({}));
    expect(verdict).toMatchObject({ category: 'strong', toVerify: [] });
    expect(verdict.kind === 'kept' && base.kind === 'kept' && verdict.criteriaTotal).toBe(
      base.kind === 'kept' ? base.criteriaTotal + 1 : null,
    );
  });

  it('acceptée ou non renseignée : la copropriété ne juge rien', () => {
    for (const accepted of [true, null]) {
      const verdict = judgeCandidate(
        { ...buyer, condominiumAccepted: accepted, condominiumMustHave: true },
        candidate({ features: { isCondominium: true } }),
      );
      expect(verdict).toMatchObject({ category: 'strong', toVerify: [] });
    }
  });
});

// La refonte, lot C (maquettes REFONTE-3, 5 et 6) — « Pourquoi celui-ci pour eux » : ce que le
// bien a de ce que la fiche demande, dans ses mots. Un indispensable (★) satisfait d'abord ; le
// type et le budget ne se redisent pas (le libellé et la pastille du prix les disent déjà).
describe('« Pourquoi celui-ci pour eux »', () => {
  const why = (who: BuyerInput, over: Over = {}) => {
    const verdict = judgeCandidate(who, candidate(over));
    return verdict.kind === 'kept' ? verdict.why : null;
  };

  it('les indispensables satisfaits d’abord, puis les autres souhaits satisfaits', () => {
    expect(why(buyer)).toEqual([
      { tone: 'must', label: 'Extérieur' },
      { tone: 'plain', label: 'Antibes' },
      { tone: 'plain', label: 'Parking' },
      { tone: 'plain', label: 'Sans travaux à prévoir' },
    ]);
  });

  it('plus que demandé se dit : pièces, chambres, surface ; juste ce qui est demandé ne se redit pas', () => {
    const bigger = why(buyer, {
      roomsCount: 5,
      surfaceArea: 85,
      streamEstate: {
        propertyId: 'p',
        originSite: 'SeLoger',
        onlineSince: null,
        lastSeenAt: null,
        priceDrops: [],
        bedrooms: 3,
      },
    });
    expect(bigger?.map((pill) => pill.label)).toEqual([
      'Extérieur',
      'Antibes',
      '2 pièces de plus',
      '1 chambre de plus',
      '25 m² de plus',
      'Parking',
      'Sans travaux à prévoir',
    ]);
    // 68 m² pour 60 demandés : huit de plus ne font pas une raison.
    expect(why(buyer)?.some((pill) => pill.label.includes('m²'))).toBe(false);
  });

  it('un indispensable se dit par son fait : la commune, les pièces, la surface, l’étage, le DPE', () => {
    const starred: BuyerInput = {
      ...buyer,
      pool: true,
      mustHave: ['cities', 'rooms', 'surface', 'pool', 'floor', 'energy_rating'],
    };
    expect(why(starred, { features: { hasPool: true } })).toEqual([
      { tone: 'must', label: 'Antibes' },
      { tone: 'must', label: '3 pièces' },
      { tone: 'must', label: '68 m²' },
      { tone: 'must', label: 'Piscine' },
      { tone: 'must', label: '2e étage' },
      { tone: 'must', label: 'DPE C' },
      { tone: 'plain', label: 'Extérieur' },
      { tone: 'plain', label: 'Parking' },
      { tone: 'plain', label: 'Sans travaux à prévoir' },
    ]);
    expect(why({ ...starred, mustHave: ['floor'] }, { features: { floor: 1 } })?.[0]).toEqual({
      tone: 'must',
      label: '1er étage',
    });
  });

  it('ce que l’annonce ne dit pas, ou contredit sans écarter, ne fait pas une raison', () => {
    const labels = why(
      { ...buyer, mustHave: [] },
      { city: null, features: { parking: [], outdoor: null, condition: 'to_refresh' } },
    )?.map((pill) => pill.label);
    expect(labels).toEqual([]);
  });

  it('jamais le type ni le budget, jamais un pourcentage', () => {
    const all = why({ ...buyer, mustHave: ['property_types', 'budget'] });
    expect(all?.map((pill) => pill.label)).toEqual([
      'Antibes',
      'Extérieur',
      'Parking',
      'Sans travaux à prévoir',
    ]);
    expect(JSON.stringify(all)).not.toMatch(/%|€|appartement/i);
  });

  it('hors copropriété, quand ils n’en veulent pas', () => {
    const noCondo = { ...buyer, condominiumAccepted: false, condominiumMustHave: true };
    expect(why(noCondo, { features: { isCondominium: false } })).toContainEqual({
      tone: 'must',
      label: 'Hors copropriété',
    });
    expect(
      why({ ...noCondo, condominiumMustHave: false }, { features: { isCondominium: false } }),
    ).toContainEqual({ tone: 'plain', label: 'Hors copropriété' });
  });

  it('chaque bien rangé porte ses raisons', () => {
    const all = categorizeIdeal(buyer, [candidate({})]);
    expect(all.byCategory.strong[0]?.why.map((pill) => pill.label)).toEqual([
      'Extérieur',
      'Antibes',
      'Parking',
      'Sans travaux à prévoir',
    ]);
  });
});
