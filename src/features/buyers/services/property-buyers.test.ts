import { describe, expect, it } from 'vitest';

import { budgetStepLabel } from '@/features/buyers/services/budget-steps';
import { NO_PROGRESS } from '@/features/buyers/services/buyer-progress';
import {
  buyerMatchesProperty,
  buyerReferencePrice,
  LIVE_BUYERS_THRESHOLD,
  propertyBuyers,
  propertyBuyersHeadline,
  type BuyerLoopProperty,
} from '@/features/buyers/services/property-buyers';
import type { Buyer } from '@/features/buyers/types';
import type { Comparable } from '@/features/comparables/types';
import { DEMO_BUYERS } from '@/features/demo/services/demo-buyers';
import { demoSeedPlan } from '@/features/demo/services/demo-seed';
import {
  budgetBand,
  liveBuyersReveal,
  searchingSince,
} from '@/features/live-seller/services/live-buyers';
import { exampleDecisionRow } from '@/features/welcome/services/example-decision';

// Mission 133 — la boucle vendeur → acquéreurs : une seule règle pour le bloc, le Suivi, le Live
// et la tâche du mandat signé.
const NOW = new Date('2026-11-06T10:00:00Z');
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 86_400_000).toISOString();

const HOUSE: BuyerLoopProperty = {
  propertyType: 'house',
  roomsCount: 5,
  surfaceArea: 135,
  city: 'Vence',
  bedroomsCount: 4,
  floor: null,
  hasElevator: null,
  hasPool: false,
  outdoorSpaces: ['terrace', 'garden'],
  parkingTypes: ['garage'],
  energyRating: 'D',
  generalCondition: null,
};

let seq = 0;
function buyer(over: Partial<Buyer> = {}): Buyer {
  seq += 1;
  return {
    language: 'fr',
    id: `b-${seq}`,
    agencyId: 'a',
    advisorId: 'adv',
    createdAt: daysAgo(21),
    updatedAt: daysAgo(2),
    archivedAt: null,
    status: 'searching',
    statusChangedAt: daysAgo(21),
    demo: false,
    ignoredSuggestions: [],
    financing: 'validated',
    financingChangedAt: daysAgo(10),
    contactedAt: daysAgo(3),
    name: `Famille Test ${seq}`,
    phone: '06 39 98 00 00',
    email: 'test@example.com',
    purpose: null,
    timeline: null,
    notes: 'Note privée du conseiller',
    propertyTypes: ['house'],
    cities: ['Vence', 'Saint-Paul-de-Vence'],
    budgetIdeal: 720_000,
    budgetMax: 780_000,
    roomsMin: 4,
    bedroomsMin: null,
    surfaceMin: 110,
    outdoor: null,
    parking: null,
    pool: null,
    floorMin: null,
    elevator: null,
    energyRatingMax: null,
    worksAccepted: null,
    mustHave: ['cities', 'budget'],
    dealBreakers: 'Ligne rouge privée',
    ...over,
  };
}

const run = (buyers: Buyer[], price: number | null = 740_000) =>
  propertyBuyers(buyers, new Map(), HOUSE, price, NOW);

describe('le prix de référence du bien (§ 3)', () => {
  it('le prix retenu ensemble, puis l’analyse figée, puis la décision, puis le haut de la fourchette', () => {
    const all = {
      commercializationPrice: 735_000,
      frozenAdvisorAnalysis: 745_000,
      advisorAnalysis: 750_000,
      advisorPriceMax: 760_000,
    };
    expect(buyerReferencePrice(all)).toBe(735_000);
    expect(buyerReferencePrice({ ...all, commercializationPrice: null })).toBe(745_000);
    expect(
      buyerReferencePrice({ ...all, commercializationPrice: null, frozenAdvisorAnalysis: null }),
    ).toBe(750_000);
    expect(
      buyerReferencePrice({
        commercializationPrice: null,
        frozenAdvisorAnalysis: null,
        advisorAnalysis: null,
        advisorPriceMax: 760_000,
      }),
    ).toBe(760_000);
    expect(
      buyerReferencePrice({
        commercializationPrice: 0,
        frozenAdvisorAnalysis: null,
        advisorAnalysis: null,
        advisorPriceMax: null,
      }),
    ).toBeNull();
  });

  it('sans prix de référence, personne ne correspond', () => {
    expect(run([buyer()], null)).toEqual({ price: null, ready: [], others: [] });
  });
});

describe('un acquéreur correspond au bien', () => {
  it('le prix au plus budget plafond + 5 %, même quand le budget est indispensable', () => {
    // 740 000 / 1,05 = 704 762 : un plafond de 704 762 € passe, 704 761 € non.
    expect(buyerMatchesProperty(buyer({ budgetMax: 704_762 }), HOUSE, 740_000)).toBe(true);
    expect(buyerMatchesProperty(buyer({ budgetMax: 704_761 }), HOUSE, 740_000)).toBe(false);
  });

  it('le type, les communes, les pièces et la surface (M86)', () => {
    expect(buyerMatchesProperty(buyer({ propertyTypes: ['apartment'] }), HOUSE, 740_000)).toBe(
      false,
    );
    expect(buyerMatchesProperty(buyer({ cities: ['Antibes'] }), HOUSE, 740_000)).toBe(false);
    expect(buyerMatchesProperty(buyer({ roomsMin: 6 }), HOUSE, 740_000)).toBe(false);
    expect(buyerMatchesProperty(buyer({ surfaceMin: 150 }), HOUSE, 740_000)).toBe(false);
  });

  it('un indispensable que le bien contredit écarte ; une préférence, non', () => {
    const pool = buyer({ pool: true, mustHave: ['cities', 'pool'] });
    expect(buyerMatchesProperty(pool, HOUSE, 740_000)).toBe(false);
    expect(buyerMatchesProperty(pool, { ...HOUSE, hasPool: true }, 740_000)).toBe(true);
    // Le bien n'indique pas sa piscine : il ne contredit rien.
    expect(buyerMatchesProperty(pool, { ...HOUSE, hasPool: null }, 740_000)).toBe(true);
    expect(buyerMatchesProperty(buyer({ pool: true }), HOUSE, 740_000)).toBe(true);
    const bedrooms = buyer({ bedroomsMin: 5, mustHave: ['bedrooms'] });
    expect(buyerMatchesProperty(bedrooms, HOUSE, 740_000)).toBe(false);
    expect(buyerMatchesProperty(buyer({ bedroomsMin: 5 }), HOUSE, 740_000)).toBe(true);
  });
});

describe('prêts à visiter, et les autres', () => {
  it('prêt : financement validé, échange récent, budget ; sinon ce qui manque', () => {
    const result = run([
      buyer({ name: 'Prêt' }),
      buyer({ name: 'En cours', financing: 'in_progress' }),
      buyer({ name: 'Inconnu', financing: 'unknown' }),
      buyer({
        name: 'Ancien',
        contactedAt: null,
        createdAt: daysAgo(60),
        statusChangedAt: daysAgo(60),
      }),
      buyer({ name: 'Sans budget', budgetMax: null, budgetIdeal: null, mustHave: ['cities'] }),
    ]);
    expect(result.ready.map((entry) => entry.buyer.name)).toEqual(['Prêt']);
    expect(
      Object.fromEntries(result.others.map((entry) => [entry.buyer.name, entry.missing])),
    ).toEqual({
      'En cours': 'financing_in_progress',
      Inconnu: 'financing_unknown',
      Ancien: 'recontact',
      'Sans budget': 'budget',
    });
  });

  it('une fiche archivée ne compte pas', () => {
    expect(run([buyer({ archivedAt: daysAgo(1) })])).toEqual({
      price: 740_000,
      ready: [],
      others: [],
    });
  });

  it('un acquéreur qui a acheté ou abandonné ne compte pas ; une lecture en échec non plus', () => {
    const result = run([buyer({ status: 'bought' }), buyer({ status: 'abandoned' })]);
    expect(result.ready).toEqual([]);
    expect(result.others).toEqual([]);
    const unread = buyer();
    const failed = propertyBuyers(
      [unread],
      new Map([[unread.id, { ...NO_PROGRESS, unread: true }]]),
      HOUSE,
      740_000,
      NOW,
    );
    expect(failed.ready).toEqual([]);
  });

  it('l’en-tête du bloc', () => {
    expect(propertyBuyersHeadline(7, 3)).toBe('7 prêts à visiter · 3 autres correspondent');
    expect(propertyBuyersHeadline(1, 1)).toBe('1 prêt à visiter · 1 autre correspond');
    expect(propertyBuyersHeadline(0, 2)).toBe('2 acquéreurs correspondent');
    expect(propertyBuyersHeadline(0, 0)).toBeNull();
  });
});

describe('le compteur caché du Live', () => {
  const ready = (count: number) => run(Array.from({ length: count }, () => buyer()));

  it('à partir de 5 prêts ; à 4, rien ne part vers la scène', () => {
    expect(LIVE_BUYERS_THRESHOLD).toBe(5);
    expect(liveBuyersReveal(ready(4), NOW)).toBeNull();
    expect(liveBuyersReveal(ready(5), NOW)?.count).toBe(5);
    expect(liveBuyersReveal(null, NOW)).toBeNull();
  });

  it('au-delà de 7, le vrai nombre et sept cartes', () => {
    const reveal = liveBuyersReveal(ready(9), NOW);
    expect(reveal?.count).toBe(9);
    expect(reveal?.cards).toHaveLength(7);
  });

  it('des cartes anonymes : ni nom, ni téléphone, ni e-mail, ni note, ni ligne rouge', () => {
    const reveal = liveBuyersReveal(ready(5), NOW)!;
    const payload = JSON.stringify(reveal);
    for (const forbidden of [
      'Famille Test',
      '06 39 98',
      'example.com',
      'Note privée',
      'Ligne rouge',
      'b-',
    ]) {
      expect(payload).not.toContain(forbidden);
    }
    expect(Object.keys(reveal.cards[0]!).sort()).toEqual(['budget', 'sector', 'since']);
    expect(reveal.cards[0]).toEqual({
      sector: 'Vence · Saint-Paul-de-Vence',
      budget: '700 – 800 k€',
      since: 'cherche depuis 3 semaines',
    });
  });

  it('le budget en fourchette arrondie, jamais un seul montant', () => {
    expect(budgetBand(740_000, 790_000)).toBe('700 – 800 k€');
    expect(budgetBand(null, 750_000)).toBe('700 – 750 k€');
    expect(budgetBand(1_200_000, 1_400_000)).toBe('1,2 – 1,4 M€');
    expect(budgetBand(950_000, 1_050_000)).toBe(
      `${budgetStepLabel(950_000)} – ${budgetStepLabel(1_100_000)}`,
    );
    expect(budgetBand(null, null)).toBeNull();
  });

  it('depuis quand il cherche, depuis sa fiche', () => {
    expect(searchingSince(daysAgo(3), NOW)).toBe('cherche depuis moins d’une semaine');
    expect(searchingSince(daysAgo(7), NOW)).toBe('cherche depuis 1 semaine');
    expect(searchingSince(daysAgo(22), NOW)).toBe('cherche depuis 3 semaines');
  });
});

// La démo (décision de Jean-Guy, 06/11) : la maison des Bernard a une piscine, pas celle de
// Mme Garcia ; les Lambert la veulent (★). Le prix de référence est l'analyse calculée par le
// moteur, comme au semis.
describe('la démo de Vence', () => {
  const demoBuyers = DEMO_BUYERS.map((demo, index) =>
    buyer({
      ...demo,
      name: demo.name,
      financing: demo.financing ?? 'unknown',
      contactedAt: demo.contactedDaysAgo == null ? null : daysAgo(demo.contactedDaysAgo),
      createdAt: daysAgo(20 + index),
      statusChangedAt: daysAgo(20 + index),
    }),
  );
  const readyFor = (stage: 'ready' | 'direct') => {
    const plan = demoSeedPlan(stage, NOW);
    const comparables = plan.competitors.map(
      ({ listing }) =>
        ({
          is_selected: true,
          excluded_from_live: false,
          price: listing.price,
          surface_area: listing.surfaceArea,
          rooms_count: listing.roomsCount,
          city: plan.property!.city as string,
          district: listing.district,
          property_type: 'house',
        }) as unknown as Comparable,
    );
    const decision = exampleDecisionRow({
      projectId: 'p',
      agencyId: 'a',
      validatedBy: 'u',
      sellerSurface: plan.scenario.subject.surfaceArea,
      comparables,
      now: NOW,
    });
    const property = plan.property!;
    const price = buyerReferencePrice({
      commercializationPrice: null,
      frozenAdvisorAnalysis: null,
      advisorAnalysis: decision?.advisor_comparative_market_price ?? null,
      advisorPriceMax: property.advisor_price_max as number,
    });
    return propertyBuyers(
      demoBuyers,
      new Map(),
      {
        propertyType: 'house',
        roomsCount: plan.scenario.subject.roomsCount,
        surfaceArea: plan.scenario.subject.surfaceArea,
        city: property.city as string,
        bedroomsCount: plan.scenario.subject.bedroomsCount,
        floor: null,
        hasElevator: null,
        hasPool: property.has_pool as boolean | null,
        outdoorSpaces: [...plan.scenario.subject.outdoorSpaces],
        parkingTypes: [...plan.scenario.subject.parkingTypes],
        energyRating: null,
        generalCondition: null,
      },
      price,
      NOW,
    );
  };

  it('les Bernard : 5 prêts, la pastille ; M. Fontaine correspond sans être prêt', () => {
    const result = readyFor('direct');
    expect(result.ready).toHaveLength(5);
    expect(result.others.map((entry) => entry.buyer.name)).toContain('M. Fontaine');
  });

  it('Mme Garcia : 4 prêts, pas de pastille (les Lambert veulent une piscine)', () => {
    const result = readyFor('ready');
    expect(result.ready).toHaveLength(4);
    expect(result.ready.map((entry) => entry.buyer.name)).not.toContain('M. et Mme Lambert');
    expect(liveBuyersReveal(result, NOW)).toBeNull();
  });
});
