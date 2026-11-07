import { describe, expect, it } from 'vitest';

import {
  latestOfferOf,
  offerFactsOf,
  type BuyerDocumentRow,
} from '@/features/buyers/services/buyer-progress';

// Mission 143 (B1) — son offre la plus avancée, et « Avant le compromis » lu dans ses liens.
const row = (over: Partial<BuyerDocumentRow>): BuyerDocumentRow => ({
  id: 'o1',
  kind: 'purchase_offer',
  signed_at: '2026-11-05T10:00:00Z',
  valid_until: '2026-11-08',
  fields: { price: 1_600_000, projectId: 'p1', visitId: 'v1' },
  buyer_document_acceptances: [],
  buyer_document_links: [],
  ...over,
});

describe('son offre d’achat (mission 143)', () => {
  it('sans offre : rien ; un bon de visite n’est jamais une offre', () => {
    expect(offerFactsOf([])).toBeNull();
    expect(offerFactsOf([row({ kind: 'visit_voucher' })])).toBeNull();
  });

  it('l’acceptée l’emporte sur une refusée plus récente', () => {
    const facts = offerFactsOf([
      row({
        id: 'accepted',
        buyer_document_acceptances: [{ decision: 'accepted', decided_at: '2026-11-06T09:00:00Z' }],
      }),
      row({
        id: 'refused',
        signed_at: '2026-11-07T10:00:00Z',
        buyer_document_acceptances: { decision: 'refused', decided_at: '2026-11-07T12:00:00Z' },
      }),
    ]);
    expect(facts).toMatchObject({ documentId: 'accepted', decision: 'accepted', price: 1_600_000 });
    expect(
      latestOfferOf([
        row({ id: 'accepted' }),
        row({ id: 'refused', signed_at: '2026-11-07T10:00:00Z' }),
      ])?.documentId,
    ).toBe('refused');
  });

  it('prévenu : un lien vers sa copie créé APRÈS la réponse ; notaire : son lien existe', () => {
    const decided = [{ decision: 'accepted', decided_at: '2026-11-06T09:00:00Z' }];
    const before = offerFactsOf([
      row({
        buyer_document_acceptances: decided,
        buyer_document_links: [{ audience: 'visitor', created_at: '2026-11-05T10:01:00Z' }],
      }),
    ]);
    expect(before).toMatchObject({ buyerNotified: false, notaryLinked: false });
    const after = offerFactsOf([
      row({
        buyer_document_acceptances: decided,
        buyer_document_links: [
          { audience: 'visitor', created_at: '2026-11-06T10:00:00Z' },
          { audience: 'notary', created_at: '2026-11-06T11:00:00Z' },
        ],
      }),
    ]);
    expect(after).toMatchObject({ buyerNotified: true, notaryLinked: true });
    // « Créer de nouveaux liens » (sa copie et celle du vendeur, ensemble) ne le prévient pas.
    const renewed = offerFactsOf([
      row({
        buyer_document_acceptances: decided,
        buyer_document_links: [
          { audience: 'visitor', created_at: '2026-11-06T10:00:00Z' },
          { audience: 'seller', created_at: '2026-11-06T10:00:00Z' },
        ],
      }),
    ]);
    expect(renewed?.buyerNotified).toBe(false);
  });
});
