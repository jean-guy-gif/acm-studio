import { describe, expect, it } from 'vitest';

import {
  addMonths,
  mandateEndFrom,
  MANDATE_MONTHS_MAX,
} from '@/features/mandate-life/services/mandate-dates';
import { amendmentRefusal, mandatePrice } from '@/features/mandate-life/services/mandate-price';
import { mandateStage, marketUpdateRuns } from '@/features/mandate-life/services/mandate-stage';
import { mandateSteps } from '@/features/mandate-life/services/mandate-steps';
import {
  NO_MANDATE_LIFE,
  type MandateLife,
  type MandateOffer,
} from '@/features/mandate-life/types';

// Lot C (Jean-Guy, 27/11 et 28/11) — la vie du mandat : l'étape se lit dans des faits datés, jamais
// dans `projects.status` ; le prix du mandat est celui du dernier avenant ; la fin du mandat se
// saisit en mois ou en date ; « Son mandat », quatre cartes.

const life = (over: Partial<MandateLife> = {}): MandateLife => ({ ...NO_MANDATE_LIFE, ...over });
const KELLER: MandateOffer = {
  acceptedAt: '2026-11-28T10:00:00Z',
  buyerId: 'b1',
  buyerName: 'Famille Keller',
  price: 1_560_000,
};
const COMPROMISE = {
  compromiseSignedOn: '2026-12-05',
  deedPlannedOn: '2027-01-15',
  buyerOrigin: 'agency' as const,
  compromiseBuyerId: 'b1',
};

describe('l’étape du mandat', () => {
  it('hors d’un mandat signé : aucune vie du mandat', () => {
    for (const outcome of ['follow_up', 'sold_elsewhere', 'withdrawn', null] as const) {
      expect(
        mandateStage({ outcome, life: life({ deedSignedOn: '2027-01-15' }), offer: KELLER }),
      ).toBe(null);
    }
  });

  it('signé, puis l’offre acceptée, le compromis, la vente', () => {
    expect(mandateStage({ outcome: 'signed', life: life(), offer: null })).toBe('signed');
    expect(mandateStage({ outcome: 'signed', life: life(), offer: KELLER })).toBe('offer_accepted');
    expect(mandateStage({ outcome: 'signed', life: life(COMPROMISE), offer: KELLER })).toBe(
      'under_compromise',
    );
    expect(
      mandateStage({
        outcome: 'signed',
        life: life({ ...COMPROMISE, deedSignedOn: '2027-01-15', salePrice: 1_560_000 }),
        offer: KELLER,
      }),
    ).toBe('sold');
  });

  it('la fin sans vente ; l’offre tombée ramène « Mandat signé », sans rien écrire', () => {
    expect(
      mandateStage({ outcome: 'signed', life: life({ endedOn: '2027-01-28' }), offer: null }),
    ).toBe('ended');
    expect(mandateStage({ outcome: 'signed', life: life(), offer: null })).toBe('signed');
  });

  it('un compromis venu d’ailleurs n’attend pas d’offre dans ACM', () => {
    expect(
      mandateStage({
        outcome: 'signed',
        life: life({ ...COMPROMISE, buyerOrigin: 'outside', compromiseBuyerId: null }),
        offer: null,
      }),
    ).toBe('under_compromise');
  });

  it('les offres illisibles : l’étape est inconnue, jamais « Mandat signé » (M98)', () => {
    expect(mandateStage({ outcome: 'signed', life: life(), offer: 'unknown' })).toBe('unknown');
    // Ce que la conclusion dit seule reste sûr.
    expect(mandateStage({ outcome: 'signed', life: life(COMPROMISE), offer: 'unknown' })).toBe(
      'under_compromise',
    );
  });

  it('retouche 3 : le Point marché ne court qu’au stade « Mandat signé »', () => {
    expect(marketUpdateRuns('signed')).toBe(true);
    for (const stage of [
      'offer_accepted',
      'under_compromise',
      'sold',
      'ended',
      'unknown',
      null,
    ] as const) {
      expect(marketUpdateRuns(stage)).toBe(false);
    }
  });
});

describe('le prix du mandat et ses avenants', () => {
  const amendment = (amendedOn: string, price: number, createdAt = `${amendedOn}T09:00:00Z`) => ({
    id: `${amendedOn}-${price}`,
    amendedOn,
    price,
    createdAt,
  });

  it('sans avenant : le prix à la signature', () => {
    expect(mandatePrice(1_639_500, [])).toEqual({
      current: 1_639_500,
      signed: 1_639_500,
      history: [],
      lastAmendment: null,
    });
  });

  it('le dernier avenant, par sa date puis par son heure de saisie ; l’historique gardé', () => {
    const price = mandatePrice(1_639_500, [
      amendment('2026-12-01', 1_550_000),
      amendment('2026-11-14', 1_590_000),
    ]);
    expect(price.current).toBe(1_550_000);
    expect(price.history).toEqual([
      { on: '2026-11-14', price: 1_590_000 },
      { on: '2026-12-01', price: 1_550_000 },
    ]);
    expect(price.lastAmendment?.price).toBe(1_550_000);
  });

  it('un avenant de baisse : sous le prix du mandat, en euros entiers, positif (question 22)', () => {
    expect(amendmentRefusal(1_590_000, 1_639_500)).toBeNull();
    expect(amendmentRefusal(1_639_500, 1_639_500)).toMatch(/sous le prix du mandat/);
    expect(amendmentRefusal(1_700_000, 1_639_500)).toMatch(/sous le prix du mandat/);
    expect(amendmentRefusal(0, 1_639_500)).toMatch(/montant valable/);
    expect(amendmentRefusal(1_590_000.5, 1_639_500)).toMatch(/montant valable/);
    // Sans prix connu, la baisse ne se compare à rien : le montant seul est relu.
    expect(amendmentRefusal(1_590_000, null)).toBeNull();
  });
});

describe('la fin du mandat', () => {
  it('en mois : le même jour, le dernier du mois quand il n’existe pas', () => {
    expect(addMonths('2026-10-28', 3)).toBe('2027-01-28');
    expect(addMonths('2026-11-30', 3)).toBe('2027-02-28');
    expect(addMonths('2027-11-30', 3)).toBe('2028-02-29');
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
  });

  it('la durée devient une date depuis la signature, de 1 à 36 mois', () => {
    expect(mandateEndFrom('2026-10-28', 3)).toBe('2027-01-28');
    expect(mandateEndFrom('2026-10-28', 0)).toBeNull();
    expect(mandateEndFrom('2026-10-28', MANDATE_MONTHS_MAX + 1)).toBeNull();
    expect(mandateEndFrom('2026-10-28', 2.5)).toBeNull();
  });
});

describe('« Son mandat » : quatre cartes', () => {
  const NOW = new Date('2026-11-28T17:00:00Z');
  const cards = (stage: Parameters<typeof mandateSteps>[0]['stage'], over = {}) =>
    mandateSteps({
      stage,
      signedAt: '2026-10-28T10:00:00Z',
      mandateType: 'exclusive',
      offer: KELLER,
      life: life(),
      now: NOW,
      ...over,
    });

  it('offre acceptée : la signature faite, l’offre maintenant, le compromis à noter', () => {
    const steps = cards('offer_accepted');
    expect(steps.map((step) => [step.title, step.status, step.fact])).toEqual([
      ['Mandat signé', 'done', 'le 28/10 · exclusif'],
      ['Offre acceptée', 'current', 'aujourd’hui · Famille Keller'],
      ['Sous compromis', 'later', 'à noter'],
      ['Vendu par l’agence', 'later', 'l’acte et son prix'],
    ]);
  });

  it('mandat signé : l’offre à venir', () => {
    const steps = cards('signed', { offer: null });
    expect(steps.map((step) => step.status)).toEqual(['current', 'later', 'later', 'later']);
    expect(steps[1].fact).toBe('à venir');
  });

  it('sous compromis, puis vendu : les dates et le prix de vente', () => {
    const under = cards('under_compromise', { life: life(COMPROMISE) });
    expect(under[2]).toMatchObject({
      status: 'current',
      fact: 'le 05/12 · acte prévu le 15/01/2027',
    });
    const sold = cards('sold', {
      life: life({ ...COMPROMISE, deedSignedOn: '2027-01-15', salePrice: 1_560_000 }),
      now: new Date('2027-01-30T10:00:00Z'),
    });
    expect(sold.map((step) => step.status)).toEqual(['done', 'done', 'done', 'current']);
    expect(sold[3].fact).toMatch(/^le 15\/01 · 1\s560\s000\s€$/);
  });

  it('un compromis sans offre dans ACM : l’offre passée, dite comme telle', () => {
    const outside = cards('under_compromise', {
      offer: null,
      life: life({ ...COMPROMISE, buyerOrigin: 'outside', compromiseBuyerId: null }),
    });
    expect(outside[1]).toMatchObject({ status: 'done', fact: 'acquéreur venu d’ailleurs' });
    const agency = cards('under_compromise', { offer: null, life: life(COMPROMISE) });
    expect(agency[1]).toMatchObject({ status: 'done', fact: 'offre faite hors d’ACM' });
  });

  it('la fin sans vente : la signature seule, le reste sans objet', () => {
    const steps = cards('ended', { offer: null, life: life({ endedOn: '2027-01-28' }) });
    expect(steps.map((step) => [step.status, step.fact])).toEqual([
      ['done', 'le 28/10 · exclusif'],
      ['later', '—'],
      ['later', '—'],
      ['later', '—'],
    ]);
  });
});
