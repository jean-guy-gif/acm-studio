import { describe, expect, it } from 'vitest';

import {
  applyLearning,
  EMPTY_PREFERENCES,
  learnFromDecisions,
  type CompetitorDecisionRecord,
} from '@/features/competitor-search/services/learn-from-decisions';
import type {
  CandidateFacts,
  CandidateScore,
} from '@/features/competitor-search/services/score-candidate';

const decision = (o: Partial<CompetitorDecisionRecord>): CompetitorDecisionRecord => ({
  listingUrl: 'https://portail.fr/1',
  listingHost: 'portail.fr',
  decision: 'rejected',
  reason: null,
  price: null,
  surfaceArea: null,
  district: null,
  propertyType: null,
  ...o,
});

const BASE: CandidateScore = {
  score: 80,
  facets: [],
  strengths: [],
  weaknesses: [],
  comparedFacets: 5,
};

const facts = (
  o: Partial<CandidateFacts & { listingUrl: string; listingHost: string }> = {},
): CandidateFacts & { listingUrl: string; listingHost: string } => ({
  price: 300_000,
  surfaceArea: 50,
  roomsCount: 3,
  city: 'Antibes',
  district: 'Fontmerle',
  propertyType: 'apartment',
  listingUrl: 'https://portail.fr/9',
  listingHost: 'portail.fr',
  ...o,
});

describe('learnFromDecisions', () => {
  // Un clic isolé ne doit pas déformer les recherches suivantes.
  it('n’apprend rien d’une seule décision', () => {
    const prefs = learnFromDecisions([
      decision({ reason: 'price_too_high', price: 500_000, listingUrl: 'a' }),
    ]);
    expect(prefs.priceCeiling).toBeNull();
    expect(prefs.notes).toEqual([]);
  });

  it('retient le prix le plus bas parmi ceux jugés trop chers', () => {
    const prefs = learnFromDecisions([
      decision({ reason: 'price_too_high', price: 500_000, listingUrl: 'a' }),
      decision({ reason: 'price_too_high', price: 420_000, listingUrl: 'b' }),
    ]);
    expect(prefs.priceCeiling).toBe(420_000);
    expect(prefs.notes[0]).toMatch(/420\s?000/u);
  });

  // Le conseiller doit pouvoir contester : chaque règle produit une phrase.
  it('explique en français tout ce qu’il a retenu', () => {
    const prefs = learnFromDecisions([
      decision({ reason: 'wrong_district', district: 'Juan-les-Pins', listingUrl: 'a' }),
      decision({ reason: 'wrong_district', district: 'Juan-les-Pins', listingUrl: 'b' }),
    ]);
    expect(prefs.demotedDistricts).toEqual(['juan-les-pins']);
    expect(prefs.notes.join(' ')).toContain('juan-les-pins');
  });

  it('ne déclasse pas un quartier où un concurrent a déjà été retenu', () => {
    const prefs = learnFromDecisions([
      decision({ reason: 'wrong_district', district: 'Juan-les-Pins', listingUrl: 'a' }),
      decision({ reason: 'wrong_district', district: 'Juan-les-Pins', listingUrl: 'b' }),
      decision({ decision: 'accepted', district: 'Juan-les-Pins', listingUrl: 'c' }),
    ]);
    expect(prefs.demotedDistricts).toEqual([]);
  });

  it('abandonne les limites de prix quand les décisions se contredisent', () => {
    const prefs = learnFromDecisions([
      decision({ reason: 'price_too_high', price: 200_000, listingUrl: 'a' }),
      decision({ reason: 'price_too_high', price: 210_000, listingUrl: 'b' }),
      decision({ reason: 'price_too_low', price: 400_000, listingUrl: 'c' }),
      decision({ reason: 'price_too_low', price: 390_000, listingUrl: 'd' }),
    ]);
    expect(prefs.priceCeiling).toBeNull();
    expect(prefs.priceFloor).toBeNull();
    expect(prefs.notes.join(' ')).toContain('contredisent');
  });

  it('ne déclasse un portail qu’après trois refus et aucun accord', () => {
    const three = [1, 2, 3].map((n) =>
      decision({ listingUrl: `u${n}`, listingHost: 'portail.fr' }),
    );
    expect(learnFromDecisions(three).demotedHosts).toEqual(['portail.fr']);
    expect(
      learnFromDecisions([...three, decision({ decision: 'accepted', listingUrl: 'u4' })])
        .demotedHosts,
    ).toEqual([]);
  });

  it('se souvient de ce qui a déjà été tranché', () => {
    const prefs = learnFromDecisions([
      decision({ listingUrl: 'https://portail.fr/9', decision: 'accepted' }),
    ]);
    expect(prefs.judged['https://portail.fr/9']).toBe('accepted');
  });
});

describe('applyLearning', () => {
  it('ne change rien sans rien appris', () => {
    const result = applyLearning(BASE, facts(), EMPTY_PREFERENCES);
    expect(result.score).toBe(80);
    expect(result.penalties).toEqual([]);
    expect(result.alreadyJudged).toBeNull();
  });

  it('fait descendre une annonce et dit pourquoi', () => {
    const prefs = learnFromDecisions([
      decision({ reason: 'price_too_high', price: 400_000, listingUrl: 'a' }),
      decision({ reason: 'price_too_high', price: 380_000, listingUrl: 'b' }),
    ]);
    const result = applyLearning(BASE, facts({ price: 450_000 }), prefs);
    expect(result.score).toBe(55);
    expect(result.penalties[0]).toMatch(/380\s?000/u);
  });

  it('signale une annonce déjà jugée au lieu de la re-proposer en silence', () => {
    const prefs = learnFromDecisions([
      decision({ listingUrl: 'https://portail.fr/9', decision: 'rejected' }),
    ]);
    expect(applyLearning(BASE, facts(), prefs).alreadyJudged).toBe('rejected');
  });

  it('ne descend jamais sous zéro ni au-dessus de cent', () => {
    const prefs = learnFromDecisions([
      decision({
        reason: 'wrong_district',
        district: 'Fontmerle',
        listingUrl: 'a',
        listingHost: 'a.fr',
      }),
      decision({
        reason: 'wrong_district',
        district: 'Fontmerle',
        listingUrl: 'b',
        listingHost: 'b.fr',
      }),
      decision({
        reason: 'wrong_property_type',
        propertyType: 'apartment',
        listingUrl: 'c',
        listingHost: 'c.fr',
      }),
      decision({
        reason: 'wrong_property_type',
        propertyType: 'apartment',
        listingUrl: 'd',
        listingHost: 'd.fr',
      }),
    ]);
    const result = applyLearning({ ...BASE, score: 20 }, facts(), prefs);
    expect(result.score).toBe(0);
    expect(result.penalties).toHaveLength(2);
  });
});
