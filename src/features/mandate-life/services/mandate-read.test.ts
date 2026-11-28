import { describe, expect, it } from 'vitest';

import { mandateOfferOf } from '@/features/mandate-life/services/mandate-offer';
import { toMandateLife } from '@/features/mandate-life/services/mandate-row';
import { NO_MANDATE_LIFE } from '@/features/mandate-life/types';

// Lot C — ce qui se lit en base, relu avant toute règle : les faits du mandat par liste
// d'autorisation (un jour mal formé, une origine hors liste, un prix nul valent « rien ») ; l'offre
// qui tient le mandat, jamais « aucune » quand les offres n'ont pas pu être lues (M98).

describe('les faits du mandat, relus', () => {
  it('une conclusion d’avant le lot C : rien', () => {
    expect(toMandateLife({})).toEqual(NO_MANDATE_LIFE);
  });

  it('les jours, l’origine, la fiche, le prix (en texte, comme l’API rend un numeric)', () => {
    expect(
      toMandateLife({
        mandate_ends_on: '2027-01-28',
        mandate_tacit_renewal: true,
        compromise_signed_on: '2026-12-05',
        deed_planned_on: '2027-01-15',
        sale_buyer_origin: 'agency',
        compromise_buyer_id: 'b1',
        deed_signed_on: '2027-01-15',
        sale_price: '1560000',
        mandate_ended_on: null,
      }),
    ).toEqual({
      endsOn: '2027-01-28',
      tacitRenewal: true,
      compromiseSignedOn: '2026-12-05',
      deedPlannedOn: '2027-01-15',
      buyerOrigin: 'agency',
      compromiseBuyerId: 'b1',
      deedSignedOn: '2027-01-15',
      salePrice: 1_560_000,
      endedOn: null,
    });
  });

  it('une valeur hors liste ou mal formée vaut « rien »', () => {
    const life = toMandateLife({
      mandate_ends_on: '28/01/2027',
      mandate_tacit_renewal: 'oui',
      sale_buyer_origin: 'friend',
      sale_price: 0,
      compromise_buyer_id: 42,
    });
    expect(life).toEqual(NO_MANDATE_LIFE);
  });
});

describe('l’offre qui tient le mandat', () => {
  const answer = (over = {}) => ({
    projectId: 'p-mougins',
    buyerId: 'b-keller',
    buyerName: 'Famille Keller',
    decision: 'accepted' as const,
    decidedAt: '2026-11-28T10:00:00Z',
    buyerStatus: 'under_offer',
    price: 1_560_000,
    ...over,
  });

  it('les offres illisibles : inconnue, jamais « aucune »', () => {
    expect(mandateOfferOf(null, 'p-mougins')).toBe('unknown');
  });

  it('l’offre acceptée encore tenue : le jour, l’acquéreur, le montant', () => {
    expect(mandateOfferOf([answer()], 'p-mougins')).toEqual({
      acceptedAt: '2026-11-28T10:00:00Z',
      buyerId: 'b-keller',
      buyerName: 'Famille Keller',
      price: 1_560_000,
      documentId: null,
    });
    // L'offre signée, pour « Voir l'offre ».
    expect(
      (mandateOfferOf([answer({ documentId: 'doc-1' })], 'p-mougins') as { documentId: string })
        .documentId,
    ).toBe('doc-1');
    // « A acheté » tient encore l'offre (la valeur de la base, `bought`).
    expect(mandateOfferOf([answer({ buyerStatus: 'bought' })], 'p-mougins')).not.toBeNull();
  });

  it('l’offre tombée, refusée, ou d’un autre bien : aucune', () => {
    expect(mandateOfferOf([answer({ buyerStatus: 'visiting' })], 'p-mougins')).toBeNull();
    expect(mandateOfferOf([answer({ decision: 'refused' })], 'p-mougins')).toBeNull();
    expect(mandateOfferOf([answer({ projectId: 'p-autre' })], 'p-mougins')).toBeNull();
    expect(mandateOfferOf([], 'p-mougins')).toBeNull();
  });
});
