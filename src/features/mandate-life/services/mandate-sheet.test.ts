import { describe, expect, it } from 'vitest';

import {
  mandateFormOf,
  mandateSheet,
  type MandateSheetInput,
} from '@/features/mandate-life/services/mandate-sheet';
import { NO_MANDATE_LIFE, type MandateOffer } from '@/features/mandate-life/types';

// Lot C (maquette C0, validée par Jean-Guy le 28/11) — « Son mandat » sur la fiche du dossier :
// « Le mandat » (sa fin, son prix et ses avenants, l'offre acceptée, le compromis, la vente), ses
// sorties, et la prochaine étape qu'il donne au dossier. Pur.

const P = '11111111-1111-4111-8111-111111111111';
const KELLER: MandateOffer = {
  acceptedAt: '2026-11-28T10:00:00Z',
  buyerId: 'b1',
  buyerName: 'Famille Keller',
  price: 1_560_000,
  documentId: 'doc-1',
};
const AMENDMENT = {
  id: 'a1',
  amendedOn: '2026-11-14',
  price: 1_590_000,
  createdAt: '2026-11-14T09:00:00Z',
};
const COMPROMISE = {
  compromiseSignedOn: '2026-11-25',
  deedPlannedOn: '2027-01-15',
  buyerOrigin: 'agency' as const,
  compromiseBuyerId: 'b1',
};

const sheet = (over: Partial<MandateSheetInput> = {}) =>
  mandateSheet({
    projectId: P,
    stage: 'offer_accepted',
    mandateType: 'exclusive',
    signedAt: '2026-10-28T10:00:00Z',
    signedPrice: 1_639_500,
    amendments: [AMENDMENT],
    offer: KELLER,
    life: { ...NO_MANDATE_LIFE, endsOn: '2027-01-28' },
    compromiseBuyerName: null,
    now: new Date('2026-11-28T17:00:00Z'),
    ...over,
  });

const rowsOf = (result: ReturnType<typeof mandateSheet>) =>
  result.rows.map((row) => [row.label, row.value]);

describe('« Son mandat » à l’offre acceptée (la maquette)', () => {
  const result = sheet();

  it('la ligne du mandat, sous le nom', () => {
    expect(result.line).toBe('Mandat exclusif signé le 28/10 · jusqu’au 28/01/2027');
  });

  it('sa fin, son prix et son avenant, l’offre, le Point marché arrêté', () => {
    expect(rowsOf(result)).toEqual([
      ['Fin du mandat', 'le 28/01/2027, 3 mois après la signature'],
      ['Prix du mandat', '1 590 000 € depuis l’avenant du 14/11'],
      ['Offre acceptée', '1 560 000 € · Famille Keller · aujourd’hui'],
      ['Point marché', 'arrêté à l’offre acceptée, aujourd’hui · il reprend si l’offre tombe'],
    ]);
    expect(result.rows[1].history).toBe('1 639 500 € à la signature, le 28/10');
    // Pour l'avenant : tous les prix gardés, et le prix d'aujourd'hui.
    expect(result.priceChain).toBe(
      '1\u202f639\u202f500\u00a0€ le 28/10 → 1\u202f590\u202f000\u00a0€ le 14/11',
    );
    expect(result.currentPrice).toBe(1_590_000);
  });

  it('les gestes : modifier la fin, un avenant (et retirer le dernier), voir l’offre', () => {
    expect(result.rows[0].actions).toEqual([{ kind: 'form', form: 'fin', label: 'Modifier' }]);
    expect(result.rows[1].actions).toEqual([
      { kind: 'form', form: 'avenant', label: 'Ajouter un avenant de baisse' },
      { kind: 'confirm', confirm: 'retirer-avenant', label: 'Retirer le dernier avenant' },
    ]);
    expect(result.rows[2].actions).toEqual([
      { kind: 'link', href: '/acquereurs/b1/offre/doc-1', label: 'Voir l’offre' },
    ]);
  });

  it('la sortie : vendu à un acquéreur venu d’ailleurs ; jamais « terminé sans vente » sous offre', () => {
    expect(result.exits).toEqual([
      { kind: 'form', form: 'ailleurs', label: 'Vendu à un acquéreur venu d’ailleurs' },
    ]);
  });

  it('la prochaine étape : noter le compromis, le seul bouton plein', () => {
    expect(result.next).toEqual({
      title: 'Noter le compromis',
      late: null,
      phrase:
        'L’offre de la famille Keller est acceptée depuis aujourd’hui, à 1 560 000 €. Notez la date du compromis et la date prévue de l’acte : le dossier passera « Sous compromis ».',
      action: {
        label: 'Noter le compromis',
        href: `/builder/${P}?mandat=compromis#son-mandat`,
        filled: true,
      },
    });
  });
});

describe('« Son mandat » au mandat signé', () => {
  const signed = (over: Partial<MandateSheetInput> = {}) =>
    sheet({
      stage: 'signed',
      offer: null,
      amendments: [],
      life: NO_MANDATE_LIFE,
      ...over,
    });

  it('sans fin ni avenant : à renseigner ; les deux sorties', () => {
    const result = signed();
    expect(rowsOf(result)).toEqual([
      ['Fin du mandat', 'à renseigner'],
      ['Prix du mandat', '1 639 500 € à la signature'],
    ]);
    expect(result.rows[0].actions).toEqual([{ kind: 'form', form: 'fin', label: 'Renseigner' }]);
    expect(result.rows[1].actions).toEqual([
      { kind: 'form', form: 'avenant', label: 'Ajouter un avenant de baisse' },
    ]);
    expect(result.exits.map((exit) => exit.label)).toEqual([
      'Vendu à un acquéreur venu d’ailleurs',
      'Mandat terminé sans vente',
    ]);
    expect(result.next).toBeNull();
    // La pastille dit déjà « Mandat signé · exclusif » : la ligne, la seule date.
    expect(result.line).toBe('Signé le 28/10');
  });

  it('plusieurs avenants : le dernier fait le prix, les autres l’historique', () => {
    const result = signed({
      amendments: [
        AMENDMENT,
        { id: 'a2', amendedOn: '2026-11-20', price: 1_550_000, createdAt: '2026-11-20T09:00:00Z' },
      ],
    });
    expect(result.rows[1].value).toBe('1 550 000 € depuis l’avenant du 20/11');
    expect(result.rows[1].history).toBe(
      '1 639 500 € à la signature, le 28/10 → 1 590 000 € le 14/11',
    );
  });

  it('30 jours avant la fin : préparer le renouvellement, la fin en orange', () => {
    const result = signed({ life: { ...NO_MANDATE_LIFE, endsOn: '2026-12-20' } });
    expect(result.rows[0]).toMatchObject({ value: 'le 20/12 · dans 22 jours', watch: true });
    expect(result.next).toEqual({
      title: 'Préparer le renouvellement',
      late: null,
      phrase:
        'Le mandat se termine le 20/12, dans 22 jours. Préparez son renouvellement avec le vendeur, puis notez sa nouvelle fin.',
      action: {
        label: 'Préparer le renouvellement',
        href: `/builder/${P}?mandat=fin#son-mandat`,
        filled: true,
      },
    });
    // Plus de 30 jours avant : rien ne presse.
    const calm = signed({ life: { ...NO_MANDATE_LIFE, endsOn: '2027-01-28' } });
    expect(calm.next).toBeNull();
    expect(calm.rows[0].watch).toBe(false);
  });

  it('retouche 4 — la reconduction tacite : faire le point avant la reconduction', () => {
    const result = signed({
      life: { ...NO_MANDATE_LIFE, endsOn: '2026-12-20', tacitRenewal: true },
    });
    expect(result.rows[0].value).toBe('le 20/12 · reconduction tacite · dans 22 jours');
    expect(result.next).toMatchObject({
      title: 'Faire le point avant la reconduction',
      phrase:
        'Le mandat se reconduit tacitement le 20/12, dans 22 jours. Faites le point avec le vendeur avant cette date.',
      action: { label: 'Faire le point', filled: true },
    });
  });

  it('la fin passée : en retard, jusqu’à une nouvelle fin ou la fin notée (question 19)', () => {
    const result = signed({
      life: { ...NO_MANDATE_LIFE, endsOn: '2026-11-25' },
    });
    expect(result.next).toMatchObject({
      title: 'Préparer le renouvellement',
      late: 'en retard de 3 jours',
      phrase: 'Le mandat s’est terminé il y a 3 jours : renouvelez-le, ou notez sa fin sans vente.',
    });
    const tacit = signed({
      life: { ...NO_MANDATE_LIFE, endsOn: '2026-11-25', tacitRenewal: true },
    });
    expect(tacit.next).toMatchObject({
      title: 'Faire le point avant la reconduction',
      late: 'en retard de 3 jours',
      phrase:
        'La date de reconduction tacite est passée (il y a 3 jours) : notez la nouvelle fin du mandat.',
    });
  });
});

describe('« Son mandat » sous compromis', () => {
  const under = (now: string, over: Partial<MandateSheetInput> = {}) =>
    sheet({
      stage: 'under_compromise',
      life: { ...NO_MANDATE_LIFE, endsOn: '2027-01-28', ...COMPROMISE },
      now: new Date(now),
      ...over,
    });

  it('le compromis et ses gestes ; plus d’avenant, plus de sortie', () => {
    const result = under('2026-11-28T17:00:00Z');
    expect(rowsOf(result)).toEqual([
      ['Fin du mandat', 'le 28/01/2027, 3 mois après la signature'],
      ['Prix du mandat', '1 590 000 € depuis l’avenant du 14/11'],
      ['Offre acceptée', '1 560 000 € · Famille Keller · aujourd’hui'],
      ['Compromis', 'signé il y a 3 jours · acte prévu le 15/01/2027 · Famille Keller'],
      ['Point marché', 'arrêté à l’offre acceptée, aujourd’hui'],
    ]);
    expect(result.rows[1].actions).toEqual([]);
    expect(result.rows[3].actions).toEqual([
      { kind: 'form', form: 'compromis', label: 'Modifier' },
      { kind: 'form', form: 'vente', label: 'Noter la vente' },
      { kind: 'confirm', confirm: 'tombe', label: 'Le compromis est tombé' },
    ]);
    expect(result.exits).toEqual([]);
  });

  it('l’acte : annoncé, puis à préparer 15 jours avant, puis la vente à noter', () => {
    expect(under('2026-11-28T17:00:00Z').next).toEqual({
      title: 'Préparer l’acte · le 31/12',
      late: null,
      phrase:
        'L’acte est prévu le 15/01/2027 chez le notaire. Quinze jours avant, la préparation de l’acte arrive dans « Aujourd’hui ».',
      action: null,
    });
    expect(under('2027-01-05T10:00:00Z').next).toEqual({
      title: 'Préparer l’acte',
      late: null,
      phrase:
        'L’acte est prévu le 15/01 chez le notaire, dans 10 jours. Une fois signé, notez sa date et le prix de vente.',
      action: null,
    });
    expect(under('2027-01-15T10:00:00Z').next).toEqual({
      title: 'Noter la vente',
      late: null,
      phrase: 'L’acte est prévu aujourd’hui : une fois signé, notez sa date et le prix de vente.',
      action: {
        label: 'Noter la vente',
        href: `/builder/${P}?mandat=vente#son-mandat`,
        filled: true,
      },
    });
    expect(under('2027-01-18T10:00:00Z').next).toMatchObject({
      title: 'Noter la vente',
      late: 'en retard de 3 jours',
      phrase: 'L’acte était prévu le 15/01 : notez sa date et le prix de vente.',
    });
  });

  it('un acquéreur venu d’ailleurs : le Point marché s’est arrêté au compromis', () => {
    const result = under('2026-11-28T17:00:00Z', {
      offer: null,
      life: {
        ...NO_MANDATE_LIFE,
        ...COMPROMISE,
        buyerOrigin: 'outside',
        compromiseBuyerId: null,
      },
    });
    expect(rowsOf(result).slice(2)).toEqual([
      ['Compromis', 'signé il y a 3 jours · acte prévu le 15/01/2027 · acquéreur venu d’ailleurs'],
      ['Point marché', 'arrêté au compromis, il y a 3 jours · il reprend si le compromis tombe'],
    ]);
  });

  it('un autre acquéreur de l’agence : son nom, relu en base', () => {
    const result = under('2026-11-28T17:00:00Z', {
      offer: null,
      compromiseBuyerName: 'M. et Mme Rossi',
      life: { ...NO_MANDATE_LIFE, ...COMPROMISE, compromiseBuyerId: 'b2' },
    });
    expect(result.rows.find((row) => row.key === 'compromise')?.value).toBe(
      'signé il y a 3 jours · acte prévu le 15/01/2027 · M. et Mme Rossi',
    );
  });
});

describe('« Son mandat » vendu, ou terminé sans vente', () => {
  it('vendu : la vente, l’écart au prix du mandat, le délai du mandat au compromis', () => {
    const result = sheet({
      stage: 'sold',
      life: {
        ...NO_MANDATE_LIFE,
        ...COMPROMISE,
        deedSignedOn: '2027-01-15',
        salePrice: 1_560_000,
      },
      now: new Date('2027-01-30T10:00:00Z'),
    });
    expect(rowsOf(result)).toEqual([
      ['Vente', '1 560 000 € · acte du 15/01 · Famille Keller'],
      ['Écart', '−1,9 % sur le prix du mandat (1 590 000 €)'],
      ['Du mandat au compromis', '28 jours'],
    ]);
    expect(result.rows[0].actions).toEqual([{ kind: 'form', form: 'vente', label: 'Modifier' }]);
    expect(result.next).toEqual({
      title: 'Voir le Suivi',
      late: null,
      phrase:
        'Vendu le 15/01 par l’agence : sa suite vit dans le Suivi, sous « Vendus par l’agence ».',
      action: { label: 'Voir le Suivi', href: '/suivi', filled: false },
    });
    expect(result.exits).toEqual([]);
  });

  it('terminé sans vente : la fin, « Annuler » ; le Suivi en contour', () => {
    const result = sheet({
      stage: 'ended',
      offer: null,
      life: { ...NO_MANDATE_LIFE, endedOn: '2027-01-28' },
      now: new Date('2027-01-30T10:00:00Z'),
    });
    expect(rowsOf(result)).toEqual([['Fin', 'Mandat terminé sans vente, il y a 2 jours']]);
    expect(result.rows[0].actions).toEqual([
      { kind: 'confirm', confirm: 'annuler-fin', label: 'Annuler' },
    ]);
    expect(result.next).toMatchObject({
      title: 'Voir le Suivi',
      phrase:
        'Le mandat s’est terminé il y a 2 jours sans vente : le dossier rejoint « Vendus ailleurs · retirés · terminés ».',
      action: { filled: false },
    });
  });
});

describe('la saisie ouverte par l’adresse (`?mandat=…`)', () => {
  it('seulement une saisie de l’étape', () => {
    expect(mandateFormOf('compromis', sheet())).toBe('compromis');
    expect(mandateFormOf('vente', sheet())).toBeNull();
    expect(mandateFormOf('terminer', sheet())).toBeNull();
    expect(mandateFormOf('terminer', sheet({ stage: 'signed', offer: null }))).toBe('terminer');
    expect(mandateFormOf('n’importe quoi', sheet())).toBeNull();
    expect(mandateFormOf(undefined, sheet())).toBeNull();
  });
});
