import { describe, expect, it } from 'vitest';

import { suiviSale } from '@/features/mandate-life/services/suivi-sale';
import { NO_MANDATE_LIFE, type MandateOffer } from '@/features/mandate-life/types';

// Lot C (maquette C0, choix 2) — la carte du Suivi suit la vente dès l'offre acceptée.
const KELLER: MandateOffer = {
  acceptedAt: '2026-11-28T10:00:00Z',
  buyerId: 'b1',
  buyerName: 'Famille Keller',
  price: 1_560_000,
};
const base = {
  projectId: 'p1',
  life: NO_MANDATE_LIFE,
  offer: KELLER,
  signedPrice: 1_639_500,
  sellerPrice: 1_700_000,
  amendments: [
    { id: 'a1', amendedOn: '2026-11-14', price: 1_590_000, createdAt: '2026-11-14T09:00:00Z' },
  ],
  signedOn: '2026-10-28',
};

describe('la carte du Suivi, mandat après mandat', () => {
  it('mandat signé, sans offre : la carte d’aujourd’hui (aucune vente)', () => {
    expect(suiviSale({ ...base, stage: 'signed', offer: null })).toBeNull();
    expect(suiviSale({ ...base, stage: 'unknown' })).toBeNull();
  });

  it('offre acceptée : la pastille, le chemin du prix, la frise, « Noter le compromis »', () => {
    const sale = suiviSale({ ...base, stage: 'offer_accepted' })!;
    expect(sale.badge).toBe('Offre acceptée · famille Keller');
    expect(sale.prices.map((price) => price.label)).toEqual([
      'Prix signé',
      'Avenant du 14/11',
      'Offre acceptée',
    ]);
    expect(sale.segments.map((segment) => [segment.label, segment.tone])).toEqual([
      ['Mandat signé ✓', 'done'],
      ['Offre acceptée ✓', 'done'],
      ['Compromis · à noter', 'today'],
      ['Vente', 'later'],
    ]);
    expect(sale.step).toMatchObject({
      title: 'Noter le compromis',
      phrase:
        'Offre de la famille Keller acceptée le 28/11 · Point marché arrêté à l’offre acceptée',
      button: {
        label: 'Noter le compromis',
        action: { kind: 'link', href: '/builder/p1?mandat=compromis#son-mandat' },
        primary: true,
      },
    });
  });

  it('sous compromis : l’acte prévu ; la prochaine étape vient des tâches', () => {
    const sale = suiviSale({
      ...base,
      stage: 'under_compromise',
      life: {
        ...NO_MANDATE_LIFE,
        compromiseSignedOn: '2026-12-05',
        deedPlannedOn: '2027-01-15',
        buyerOrigin: 'outside',
      },
      offer: null,
    })!;
    expect(sale.badge).toBe('Sous compromis · acte prévu le 15/01');
    expect(sale.segments.map((segment) => segment.label)).toEqual([
      'Mandat signé ✓',
      'Acquéreur venu d’ailleurs ✓',
      'Compromis le 05/12 ✓',
      'Acte le 15/01',
    ]);
    expect(sale.step).toBeNull();
  });

  it('vendu : il voulait, le prix signé, vendu ; l’écart et le délai ; plus rien à faire', () => {
    const sale = suiviSale({
      ...base,
      stage: 'sold',
      life: {
        ...NO_MANDATE_LIFE,
        compromiseSignedOn: '2026-11-21',
        deedPlannedOn: '2027-01-15',
        buyerOrigin: 'agency',
        compromiseBuyerId: 'b1',
        deedSignedOn: '2027-01-15',
        salePrice: 1_560_000,
      },
    })!;
    expect(sale.badge).toBe('Vendu par l’agence · le 15/01');
    expect(sale.prices.map((price) => [price.label, price.value])).toEqual([
      ['Il voulait', 1_700_000],
      ['Prix signé', 1_639_500],
      ['Vendu', 1_560_000],
    ]);
    expect(sale.note).toBe('−1,9 % sur le prix du mandat · 24 jours du mandat au compromis');
    expect(sale.step).toMatchObject({ title: 'Plus rien à faire', button: null });
  });

  it('terminé sans vente : la pastille, rien à faire', () => {
    const sale = suiviSale({
      ...base,
      stage: 'ended',
      offer: null,
      life: { ...NO_MANDATE_LIFE, endedOn: '2027-01-28' },
    })!;
    expect(sale.badge).toBe('Mandat terminé sans vente · le 28/01');
    expect(sale.segments).toEqual([]);
    expect(sale.step).toMatchObject({ title: 'Aucune', button: null });
  });
});
