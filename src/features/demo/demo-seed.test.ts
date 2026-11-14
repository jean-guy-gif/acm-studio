import { describe, expect, it } from 'vitest';

import { DEMO_SCENARIOS } from '@/features/demo/data/scenarios';
import { DEMO_BUYERS } from '@/features/demo/services/demo-buyers';
import {
  DEMO_SEED_SCENARIO,
  DEMO_SEED_STAGE,
  DEMO_SEEDS,
  DEMO_SEED_COMPETITORS,
  DEMO_STAGE_LABELS,
  DEMO_STAGES,
  DEMO_JOURNEYS,
  demoJourneyPlan,
  demoSeedCompetitors,
  demoSeedPlan,
  mouginsMandateId,
  type DemoSeedKey,
} from '@/features/demo/services/demo-seed';

// Mission 114 (partie B) — les quatre dossiers d'un closer, décrits avant d'être écrits : quatre
// étapes, chacune son scénario ; le bien tel que l'import le remplit (jamais le prix, M38) ; cinq
// concurrents, dont un qui baisse après le rendez-vous ; un Live et une conclusion pour les deux
// dossiers conclus ; rien ne dit « démo ».
const NOW = new Date('2026-10-24T10:00:00.000Z');
const UNSPOKEN = /d[ée]mo|fictif|simulat/i;

describe('le plan des dossiers de démo', () => {
  it('douze dossiers à cinq étapes nommées, chacun avec son scénario', () => {
    expect(DEMO_STAGES).toEqual(['to_prepare', 'ready', 'direct', 'signed', 'follow_up']);
    expect(DEMO_SEEDS).toEqual([
      'to_prepare',
      'ready',
      'direct',
      'signed',
      'signed_vence',
      'signed_antibes',
      'signed_juan',
      'signed_villeneuve',
      'signed_la_colle',
      'signed_saint_paul',
      'signed_valbonne',
      'follow_up',
    ]);
    for (const stage of DEMO_STAGES) expect(DEMO_STAGE_LABELS[stage]).not.toMatch(UNSPOKEN);
    for (const key of DEMO_SEEDS) {
      expect(DEMO_SCENARIOS.some((s) => s.id === DEMO_SEED_SCENARIO[key])).toBe(true);
      expect(DEMO_STAGES).toContain(DEMO_SEED_STAGE[key]);
      expect(demoSeedPlan(key, NOW).key).toBe(key);
    }
  });

  it('« À préparer » : un dossier nu, le bien reste à importer', () => {
    const plan = demoSeedPlan('to_prepare', NOW);
    expect(plan.scenario.id).toBe('antibes');
    expect(plan.property).toBeNull();
    expect(plan.competitors).toEqual([]);
    expect(plan.live).toBeNull();
    expect(plan.conclusion).toBeNull();
    expect(plan.sellerName).not.toMatch(UNSPOKEN);
  });

  it('« Prêt pour le Live » : le bien (sans son prix), sa fourchette, cinq concurrents, pas de Live', () => {
    const plan = demoSeedPlan('ready', NOW);
    expect(plan.scenario.id).toBe('vence');
    const property = plan.property!;
    expect(property.surface_area).toBe(plan.scenario.subject.surfaceArea);
    expect(property.city).toBe('Vence');
    expect(property.advisor_price_min).toBe(plan.scenario.subject.advisorRange.min);
    expect(property.advisor_price_max).toBe(plan.scenario.subject.advisorRange.max);
    expect(JSON.stringify(property)).not.toContain(String(plan.scenario.subject.listedPrice));
    expect(property.fields_to_verify).toEqual([]);
    expect(plan.photoFiles).toHaveLength(3);
    expect(plan.competitors).toHaveLength(DEMO_SEED_COMPETITORS);
    for (const competitor of plan.competitors) {
      expect(competitor.data.price).toBe(competitor.listing.price);
      expect(competitor.guess).toBeLessThan(competitor.listing.price);
      expect(competitor.data.title).not.toMatch(UNSPOKEN);
    }
    expect(plan.live).toBeNull();
    expect(plan.conclusion).toBeNull();
  });

  it('la piscine et l’ascenseur du bien vendeur sont ceux du scénario : la villa de Mougins a sa piscine', () => {
    const signed = demoSeedPlan('signed', NOW);
    expect(signed.scenario.id).toBe('mougins');
    expect(signed.property!.has_pool).toBe(true);
    for (const stage of ['ready', 'signed', 'follow_up'] as const) {
      const plan = demoSeedPlan(stage, NOW);
      expect(plan.property!.has_pool).toBe(plan.scenario.subject.hasPool);
      expect(plan.property!.has_elevator).toBe(plan.scenario.subject.hasElevator);
    }
  });

  it('« Mandat signé » : un Live mené, un mandat exclusif, une adresse « Ne plus solliciter »', () => {
    const plan = demoSeedPlan('signed', NOW);
    expect(plan.scenario.id).toBe('mougins');
    expect(plan.live).toMatchObject({ readinessFirst: 7, readinessLast: 10, dangerousIndex: 0 });
    expect(plan.live!.perceivedPrice).toBeGreaterThan(plan.live!.revisedPrice);
    expect(plan.live!.agreedPrice).toBeLessThan(plan.live!.revisedPrice);
    expect(plan.conclusion).toEqual({ outcome: 'signed', mandateType: 'exclusive' });
    expect(plan.priceDrop).toBeNull();
    expect(plan.opposedAddress).toMatch(/Mougins$/);
  });

  it('« À relancer » : conclu avec un motif et des freins, et un concurrent qui a baissé depuis', () => {
    const plan = demoSeedPlan('follow_up', NOW);
    expect(plan.scenario.id).toBe('antibes');
    expect(plan.conclusion).toEqual({
      outcome: 'follow_up',
      motive: 'thinking_price',
      objections: ['price', 'timing'],
    });
    expect(plan.priceDrop).not.toBeNull();
    const dropped = plan.competitors[plan.priceDrop!.index];
    expect(plan.priceDrop!.price).toBeLessThan(dropped.listing.price);
    expect(plan.opposedAddress).toBeNull();
  });

  it('les concurrents retenus sont les plus proches du prix du bien, un qui baisse toujours parmi eux', () => {
    for (const scenario of DEMO_SCENARIOS) {
      const chosen = demoSeedCompetitors(scenario);
      expect(chosen).toHaveLength(DEMO_SEED_COMPETITORS);
      expect(new Set(chosen.map((c) => c.id)).size).toBe(DEMO_SEED_COMPETITORS);
      expect(chosen.some((c) => c.priceAfterMeeting != null && c.priceAfterMeeting < c.price)).toBe(
        true,
      );
    }
  });
});

// Essai de Jean-Guy (25/10) — la sélection des Keller de « Préparer ma démo » : un bien qui coche
// tout, un compromis au budget en orange, un bien avec un « ? ».
describe('la sélection des Keller', async () => {
  const { demoKellerSelectionPlan } = await import('@/features/demo/services/demo-seed');
  const { buyerBudgetTone } = await import('@/features/buyer-deck/services/buyer-budget-tone');
  const { poolFromLabels } =
    await import('@/features/competitor-search/services/stream-estate-features');
  const plan = demoKellerSelectionPlan(NOW);

  it('le mandat de Mougins, puis mou-02, puis mou-07', () => {
    expect(plan.map((item) => [item.source, item.listingId, item.category])).toEqual([
      ['project', null, 'agency'],
      ['listing', 'mou-02', 'compromise'],
      ['listing', 'mou-07', 'explore'],
    ]);
  });

  it('le compromis : au-dessus du budget, sous +5 %, « à négocier », le budget en orange', () => {
    expect(plan[1]!.listedPrice).toBe(1_720_000);
    expect(buyerBudgetTone(plan[1]!.listedPrice, 1_650_000)).toBe('orange');
    expect(plan[1]!.gaps[0]).toMatch(/au-dessus du budget, à négocier$/);
  });

  it('trois miniatures différentes, et les deux annonces sans photo commune', () => {
    const scenario = DEMO_SCENARIOS.find((item) => item.id === 'mougins')!;
    const photosOf = (id: string | null) =>
      id == null ? scenario.subject.photos : scenario.listings.find((l) => l.id === id)!.photos;
    const sets = plan.map((item) => photosOf(item.listingId));
    expect(new Set(sets.map((photos) => photos[0])).size).toBe(3);
    const [b, c] = [sets[1]!, sets[2]!];
    expect(b.filter((photo) => c.includes(photo))).toEqual([]);
    // Les miniatures de B et C ne sont aucune des photos montrées pour A (les trois premières).
    const shownForA = scenario.subject.photos.slice(0, 3);
    expect(shownForA).not.toContain(b[0]);
    expect(shownForA).not.toContain(c[0]);
  });

  it('les cinq concurrents du dossier de Mougins ont cinq photos principales différentes', () => {
    const signed = demoSeedPlan('signed', NOW);
    const mains = signed.competitors.map((competitor) => competitor.listing.photos[0]);
    expect(new Set(mains).size).toBe(mains.length);
  });

  it('les annonces portent leur type de bien : aucun « ? Type de bien »', () => {
    expect(plan[1]!.snapshot?.propertyType).toBe('house');
    expect(plan[2]!.snapshot?.propertyType).toBe('house');
  });

  it('le bien à vérifier : sa piscine n’est pas indiquée', () => {
    expect(poolFromLabels(plan[2]!.imported!.listingFeatures)).toBeNull();
    expect(plan[2]!.gaps).toEqual(['Piscine : à vérifier']);
    // Le compromis, lui, a sa piscine.
    expect(poolFromLabels(plan[1]!.imported!.listingFeatures)).toBe(true);
  });
});

// Mission 131 — le dossier en présentation directe : prêt comme celui de Vence, sans Live, avec
// son propre vendeur pour ne pas se confondre avec lui.
describe('« Prêt, en présentation directe »', () => {
  it('cinq concurrents, une fourchette, pas de Live ; un autre vendeur que le Live interactif', () => {
    const plan = demoSeedPlan('direct', NOW);
    const ready = demoSeedPlan('ready', NOW);
    expect(plan.scenario.id).toBe('vence');
    expect(plan.competitors).toHaveLength(5);
    expect(plan.live).toBeNull();
    expect(plan.conclusion).toBeNull();
    expect(plan.sellerName).not.toBe(ready.sellerName);
    expect(plan.sellerName).not.toMatch(UNSPOKEN);
  });

  // Mission 140 — les Bernard préfèrent l'anglais ; tous les autres vendeurs, le français.
  it('« Mr and Mrs Bernard », en anglais ; les autres dossiers en français', () => {
    expect(demoSeedPlan('direct', NOW).sellerName).toBe('Mr and Mrs Bernard');
    expect(demoSeedPlan('direct', NOW).language).toBe('en');
    for (const key of DEMO_SEEDS.filter((each) => each !== 'direct')) {
      expect(demoSeedPlan(key, NOW).language).toBe('fr');
    }
  });
});

// Finitions du 06/11 — cinq vendeurs, cinq foyers : le vendeur à relancer n'est plus un second
// « M. et Mme Martin » (le dossier à préparer, même scénario d'Antibes), ni le nom d'un acquéreur.
describe('les vendeurs de la démo', () => {
  it('douze noms différents, aucun pris à un acquéreur de la démo', () => {
    const names = DEMO_SEEDS.map((key) => demoSeedPlan(key, NOW).sellerName);
    expect(new Set(names).size).toBe(DEMO_SEEDS.length);
    expect(demoSeedPlan('follow_up', NOW).sellerName).toBe('M. et Mme Lambert-Duval');
    for (const buyer of DEMO_BUYERS) expect(names).not.toContain(buyer.name);
  });
});

// Mission 145 (partie A) — le sixième dossier : un mandat signé à Vence, chez M. et Mme Lopez, que
// la boucle propose à ses acquéreurs prêts. Il porte la marque « signed », comme Mougins : le mandat
// des Keller se retrouve par sa marque ET son scénario, jamais par la marque seule.
describe('le mandat signé de Vence (M. et Mme Lopez)', () => {
  it('signé il y a 3 jours, exclusif, sans adresse « Ne plus solliciter » ni piscine', () => {
    const plan = demoSeedPlan('signed_vence', NOW);
    expect(plan.stage).toBe('signed');
    expect(plan.scenario.id).toBe('vence');
    expect(plan.sellerName).toBe('M. et Mme Lopez');
    expect(plan.signedDaysAgo).toBe(3);
    expect(plan.conclusion).toEqual({ outcome: 'signed', mandateType: 'exclusive' });
    expect(plan.live).not.toBeNull();
    expect(plan.opposedAddress).toBeNull();
    expect(plan.property!.has_pool).toBe(false);
    expect(plan.competitors).toHaveLength(DEMO_SEED_COMPETITORS);
    // Le mandat de Mougins garde son mois et son adresse « Ne plus solliciter ».
    expect(demoSeedPlan('signed', NOW).signedDaysAgo).toBeNull();
    expect(demoSeedPlan('signed', NOW).opposedAddress).toMatch(/Mougins$/);
  });

  it('l’offre des Keller reste sur Mougins, quel que soit l’ordre de création', () => {
    const ids: Record<DemoSeedKey, string> = {
      to_prepare: 'p-antibes',
      ready: 'p-garcia',
      direct: 'p-bernard',
      signed: 'p-mougins',
      signed_vence: 'p-lopez',
      signed_antibes: 'p-ferrand',
      signed_juan: 'p-delmas',
      signed_villeneuve: 'p-perrin',
      signed_la_colle: 'p-garnier',
      signed_saint_paul: 'p-navarro',
      signed_valbonne: 'p-castel',
      follow_up: 'p-lambert-duval',
    };
    const inOrder = DEMO_SEEDS.map((key) => ({ key, id: ids[key] }));
    expect(mouginsMandateId(inOrder)).toBe('p-mougins');
    expect(mouginsMandateId([...inOrder].reverse())).toBe('p-mougins');
    const lopezFirst = [
      { key: 'signed_vence' as const, id: 'p-lopez' },
      { key: 'signed' as const, id: 'p-mougins' },
    ];
    expect(mouginsMandateId(lopezFirst)).toBe('p-mougins');
    // Sans Mougins, rien : jamais le mandat de Vence à sa place.
    expect(mouginsMandateId([{ key: 'signed_vence', id: 'p-lopez' }])).toBeNull();
    // Ni la villa de Valbonne, du même marché que Mougins (M155).
    expect(mouginsMandateId([{ key: 'signed_valbonne', id: 'p-castel' }])).toBeNull();
  });
});

// Mission 155 — huit mandats signés, un portefeuille varié, et un bien par dossier (décision de
// Jean-Guy, 13/11 : aucune photo partagée entre deux biens).
describe('le portefeuille de la démo', () => {
  const signed = DEMO_SEEDS.filter((key) => DEMO_SEED_STAGE[key] === 'signed');
  const plans = signed.map((key) => demoSeedPlan(key, NOW));

  it('huit mandats : trois appartements, trois maisons, deux villas, dans sept communes', () => {
    expect(signed).toHaveLength(8);
    const apartments = plans.filter((plan) => plan.scenario.subject.propertyType === 'apartment');
    expect(apartments).toHaveLength(3);
    const withPool = plans.filter((plan) => plan.scenario.subject.hasPool === true);
    expect(withPool.map((plan) => plan.key).sort()).toEqual([
      'signed',
      'signed_la_colle',
      'signed_valbonne',
    ]);
    const cities = new Set(plans.map((plan) => plan.property!.city));
    expect(cities.size).toBe(7);
  });

  it('chaque dossier a son bien : sa propre adresse et son propre dossier de photos', () => {
    const subjects = DEMO_SEEDS.filter((key) => key !== 'to_prepare').map(
      (key) => demoSeedPlan(key, NOW).scenario.subject,
    );
    const addresses = subjects.map(
      (subject) => `${subject.address.number} ${subject.address.street}`,
    );
    expect(new Set(addresses).size).toBe(subjects.length);
    const sets = subjects.map((subject) => subject.photoSet);
    expect(sets.every(Boolean)).toBe(true);
    expect(new Set(sets).size).toBe(subjects.length);
  });

  it('signés de 3 jours à un mois : un seul Point marché dû, celui de Mougins', () => {
    for (const plan of plans) {
      if (plan.key === 'signed') expect(plan.signedDaysAgo).toBeNull();
      else expect(plan.signedDaysAgo).toBeLessThan(28);
    }
    expect(
      plans.filter(
        (plan) => plan.conclusion?.outcome === 'signed' && plan.conclusion.mandateType === 'simple',
      ),
    ).toHaveLength(2);
  });

  it('le prix convenu au Live est celui de la fiche photo', () => {
    expect(demoSeedPlan('signed_antibes', NOW).live?.agreedPrice).toBe(439_000);
    expect(demoSeedPlan('signed_la_colle', NOW).live?.agreedPrice).toBe(785_000);
    expect(demoSeedPlan('signed_juan', NOW).live?.agreedPrice).toBe(395_000);
  });
});

// Mission 151 — la copropriété dans la démo : posée sur la fiche des biens vendeurs comme le
// conseiller le ferait, et un acquéreur qui n'en veut pas, sans ★ (aucun compte ne change).
describe('la copropriété de la démo', () => {
  it('l’appartement d’Antibes en copropriété, les maisons hors copropriété, rien à préparer', () => {
    for (const key of DEMO_SEEDS) {
      const plan = demoSeedPlan(key, NOW);
      expect(plan.isCondominium, key).toBe(
        plan.property == null ? null : plan.scenario.subject.propertyType === 'apartment',
      );
    }
  });

  it('les Lambert ne veulent pas de copropriété, sans en faire un indispensable', () => {
    const lambert = DEMO_BUYERS.find((buyer) => buyer.name === 'M. et Mme Lambert');
    expect(lambert?.condominiumAccepted).toBe(false);
    expect(lambert?.condominiumMustHave ?? false).toBe(false);
  });
});

// Mission 155 — le parcours des acquéreurs : une sélection de trois biens au plus, cohérente avec
// le budget et les communes de la fiche, le mandat de l'agence en tête ; des stades différents.
describe('le parcours des acquéreurs de la démo', () => {
  it('chaque sélection : trois biens au plus, le mandat dans le budget (+5 %) et les communes', () => {
    for (const journey of DEMO_JOURNEYS) {
      const buyer = DEMO_BUYERS.find((entry) => entry.name === journey.buyer)!;
      expect(buyer, journey.buyer).toBeDefined();
      const plan = demoJourneyPlan(journey, NOW);
      expect(plan.length, journey.buyer).toBeLessThanOrEqual(3);
      expect(plan[0]!.mandateKey).toBe(journey.mandate);
      expect(plan[0]!.listedPrice!, journey.buyer).toBeLessThanOrEqual(
        (buyer.budgetMax ?? 0) * 1.05,
      );
      const city = demoSeedPlan(journey.mandate, NOW).property!.city as string;
      expect(buyer.cities.includes(city), `${journey.buyer} : ${city}`).toBe(true);
      for (const visit of journey.visits ?? []) expect(visit.item).toBeLessThan(plan.length);
    }
  });

  it('des stades différents : envoyée sans réponse, présentée, visitée, nouveaux, à recontacter', () => {
    const of = (name: string) => DEMO_JOURNEYS.find((journey) => journey.buyer === name);
    expect(of('M. et Mme Lambert')?.shared).toBe(true);
    expect(of('Mme Faure')?.shared).toBe(true);
    expect(of('Famille Moreau')?.visits?.some((visit) => visit.confirmedTomorrow)).toBe(true);
    expect(of('M. et Mme Rossi')?.visits?.some((visit) => visit.report)).toBe(true);
    for (const name of ['M. Girard et Mme Chevalier', 'M. et Mme Roux', 'M. Fontaine']) {
      expect(of(name), name).toBeUndefined();
    }
    const fontaine = DEMO_BUYERS.find((buyer) => buyer.name === 'M. Fontaine')!;
    expect(fontaine.contactedDaysAgo).toBeGreaterThan(30);
  });
});
