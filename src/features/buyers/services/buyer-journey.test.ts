import { describe, expect, it } from 'vitest';

import {
  budgetGap,
  buyerJourney,
  buyerNextAction,
  buyerTimeline,
  lastExchangeLabel,
  saleInProgress,
} from '@/features/buyers/services/buyer-journey';
import { NO_PROGRESS, type BuyerProgressFacts } from '@/features/buyers/services/buyer-progress';

// Mission 130 B — la fiche acquéreur : quatre étapes, UNE prochaine étape selon où il en est, et ce
// qui s'est passé, daté.
const buyer = { id: 'b1', createdAt: '2026-11-01T09:00:00Z', phone: '06 39 98 11 22' };
const facts = (over: Partial<BuyerProgressFacts>): BuyerProgressFacts => ({
  ...NO_PROGRESS,
  ...over,
});

describe('la prochaine étape d’un acquéreur', () => {
  it('sans sélection : trouver ses biens idéaux', () => {
    const next = buyerNextAction(buyer, NO_PROGRESS);
    expect(next.title).toBe('Trouver ses biens idéaux');
    expect(next.primary).toEqual({
      label: 'Trouver les biens idéaux',
      href: '/acquereurs/b1/biens-ideaux',
    });
    expect(next.since).toBe(buyer.createdAt);
  });

  it('une sélection : la présenter, ou envoyer le lien à la place', () => {
    const next = buyerNextAction(
      buyer,
      facts({ selectionCount: 3, selectionAt: '2026-11-03T09:00:00Z' }),
    );
    expect(next.title).toBe('Lui présenter sa sélection');
    expect(next.primary).toEqual({ label: 'Présenter maintenant', href: '/presentation/b1' });
    expect(next.secondary).toEqual({
      label: 'Envoyer le lien à la place',
      href: '/acquereurs/b1/dossier',
    });
    expect(next.since).toBe('2026-11-03T09:00:00Z');
  });

  it('le lien envoyé, sans réponse : le relancer — l’appeler s’il a un téléphone', () => {
    const sent = facts({ selectionCount: 3, linkCreated: true, linkAt: '2026-11-04T09:00:00Z' });
    expect(buyerNextAction(buyer, sent)).toMatchObject({
      title: 'Relancer sa réponse',
      primary: { label: 'L’appeler', href: 'tel:0639981122' },
    });
    expect(buyerNextAction({ ...buyer, phone: null }, sent).primary).toEqual({
      label: 'Revoir le lien',
      href: '/acquereurs/b1/dossier',
    });
  });

  it('sa réponse et des visites demandées : les organiser', () => {
    const next = buyerNextAction(
      buyer,
      facts({ selectionCount: 3, answeredOnLink: true, visitsToOrganize: 2 }),
    );
    expect(next.title).toBe('Organiser la visite');
    expect(next.primary.href).toBe('/visites');
  });

  it('présentée, rien à visiter : lui proposer d’autres biens', () => {
    const next = buyerNextAction(
      buyer,
      facts({ selectionCount: 3, presentedAt: '2026-11-04T09:00:00Z' }),
    );
    expect(next.title).toBe('Lui proposer d’autres biens');
    expect(next.primary.href).toBe('/acquereurs/b1/biens-ideaux');
  });
});

// Mission 143 (B1) — cinq étapes, lues à leur état le plus avancé.
const OFFER = {
  documentId: 'o1',
  signedAt: '2026-11-07T10:00:00Z',
  validUntil: '2026-11-10',
  price: 1_600_000,
  projectId: 'p1',
  visitId: 'v1',
  decision: null,
  decidedAt: null,
  buyerNotified: false,
  notaryLinked: false,
} as const;
const accepted = { ...OFFER, decision: 'accepted' as const, decidedAt: '2026-11-07T12:00:00Z' };

describe('ses cinq étapes (mission 143)', () => {
  it('l’étape du jour est la première qui n’est pas faite', () => {
    const steps = buyerJourney(facts({ selectionCount: 3 }));
    expect(steps.map((step) => [step.key, step.status, step.state])).toEqual([
      ['selection', 'done', '3 biens'],
      ['present', 'current', 'à faire'],
      ['visit', 'later', 'à faire'],
      ['offer', 'later', 'à faire'],
      ['compromise', 'later', 'après l’offre acceptée'],
    ]);
  });

  it('présentée, visites demandées puis faites, avec le bon signé', () => {
    const asked = buyerJourney(
      facts({ selectionCount: 3, presentedAt: '2026-11-04T09:00:00Z', visitsToOrganize: 1 }),
    );
    expect(asked[1]).toMatchObject({ status: 'done', state: 'le 04/11' });
    expect(asked[2]).toMatchObject({ status: 'current', state: '1 demandée, à organiser' });
    const visited = buyerJourney(
      facts({
        selectionCount: 3,
        presentedAt: '2026-11-04T09:00:00Z',
        visitsDone: 1,
        lastVisitDoneAt: '2026-11-07T09:00:00Z',
        voucherSigned: true,
      }),
    );
    expect(visited[2]).toMatchObject({ status: 'done', state: 'le 07/11 · bon signé' });
    expect(visited[3].status).toBe('current');
  });

  it('une offre acceptée coche tout ce qui la précède, même sans présentation notée', () => {
    const steps = buyerJourney(facts({ selectionCount: 3, offer: accepted }), 'under_offer');
    expect(steps.map((step) => step.status)).toEqual(['done', 'done', 'done', 'done', 'current']);
    expect(steps[3].state).toBe('acceptée le 07/11');
    expect(steps[4].state).toBe('à lancer');
  });

  it('une offre signée attend ; refusée, elle le dit ; l’offre tombée défait la vente', () => {
    expect(buyerJourney(facts({ offer: OFFER }), 'visiting')[3]).toMatchObject({
      status: 'current',
      state: 'signée le 07/11',
    });
    expect(
      buyerJourney(
        facts({ offer: { ...OFFER, decision: 'refused', decidedAt: '2026-11-08T09:00:00Z' } }),
        'visiting',
      )[3],
    ).toMatchObject({ status: 'current', state: 'refusée le 08/11' });
    // « L'offre est tombée : revenir en visite » : l'acceptation reste en base, la vente non.
    expect(buyerJourney(facts({ offer: accepted }), 'visiting')[3].status).toBe('current');
  });

  it('« A acheté » coche le compromis', () => {
    const steps = buyerJourney(facts({ offer: accepted }), 'purchased');
    expect(steps.every((step) => step.status === 'done')).toBe(true);
    expect(steps[4].state).toBe('signé');
  });
});

describe('la prochaine étape suit l’offre (mission 143)', () => {
  const keller = { ...buyer, name: 'Famille Keller', status: 'under_offer' };
  const NOW = new Date('2026-11-07T15:00:00Z');

  it('offre acceptée : lancer le compromis, prévenir la famille, puis le notaire', () => {
    const next = buyerNextAction(keller, facts({ selectionCount: 3, offer: accepted }), NOW);
    expect(next).toMatchObject({
      title: 'Lancer le compromis',
      phrase: 'Prévenez la famille Keller, puis envoyez le dossier au notaire.',
      primary: { label: 'Prévenir la famille Keller' },
      secondary: { label: 'Transmettre au notaire' },
      compromiseOfferId: 'o1',
      since: accepted.decidedAt,
    });
  });

  it('offre signée sans réponse : attendre le vendeur jusqu’à la fin de validité', () => {
    const next = buyerNextAction(
      { ...keller, status: 'visiting' },
      facts({ selectionCount: 3, offer: OFFER }),
      NOW,
    );
    expect(next.title).toBe('Attendre la réponse du vendeur');
    expect(next.phrase).toContain('jusqu’au 10/11/2026');
    expect(next.primary.href).toBe('/acquereurs/b1/offre/o1');
  });

  it('l’offre tombée, une nouvelle offre signée attend sa réponse', () => {
    const fresh = { ...OFFER, documentId: 'o2', signedAt: '2026-11-07T14:00:00Z' };
    const after = facts({ selectionCount: 3, offer: accepted, latestOffer: fresh });
    const next = buyerNextAction({ ...keller, status: 'visiting' }, after, NOW);
    expect(next.title).toBe('Attendre la réponse du vendeur');
    expect(next.primary.href).toBe('/acquereurs/b1/offre/o2');
    expect(buyerJourney(after, 'visiting')[3]).toMatchObject({
      status: 'current',
      state: 'signée le 07/11',
    });
    // Sous offre, l'acceptée reste l'offre qui compte.
    expect(buyerNextAction(keller, after, NOW).title).toBe('Lancer le compromis');
  });

  it('« A acheté » n’est plus une vente en cours', () => {
    expect(saleInProgress(facts({ offer: accepted }), 'purchased')).toBe(false);
    expect(saleInProgress(facts({ offer: accepted }), 'under_offer')).toBe(true);
  });

  it('refusée, expirée, ou l’offre tombée : la prochaine étape d’avant l’offre', () => {
    const base = { selectionCount: 3, presentedAt: '2026-11-04T09:00:00Z' };
    const visiting = { ...keller, status: 'visiting' };
    const refused = { ...OFFER, decision: 'refused' as const, decidedAt: '2026-11-07T12:00:00Z' };
    expect(buyerNextAction(visiting, facts({ ...base, offer: refused }), NOW).title).toBe(
      'Lui proposer d’autres biens',
    );
    expect(
      buyerNextAction(
        visiting,
        facts({ ...base, offer: { ...OFFER, validUntil: '2026-11-06' } }),
        NOW,
      ).title,
    ).toBe('Lui proposer d’autres biens');
    expect(buyerNextAction(visiting, facts({ ...base, offer: accepted }), NOW).title).toBe(
      'Lui proposer d’autres biens',
    );
  });
});

describe('ce qui s’est passé', () => {
  it('un fil daté, du plus récent au plus ancien', () => {
    const entries = buyerTimeline({
      createdAt: '2026-11-01T09:00:00Z',
      selections: [{ createdAt: '2026-11-02T09:00:00Z', agencyCount: 1, marketCount: 2 }],
      presentedAt: '2026-11-03T09:00:00Z',
      linkAt: null,
      answeredAt: null,
      letters: [{ at: '2026-11-04T09:00:00Z', label: 'Maison · 7 p. · 210 m² · Mougins' }],
      visits: [
        {
          requestedAt: '2026-11-03T10:00:00Z',
          visitedAt: '2026-11-05T10:00:00Z',
          label: 'Maison · 7 p. · 210 m² · Mougins',
          during: 'meeting',
          outcomeLabel: 'Offre envisagée',
        },
      ],
    });
    expect(entries.map((entry) => entry.text)).toEqual([
      'Visite faite : Maison · 7 p. · 210 m² · Mougins · Offre envisagée',
      'Courrier préparé : Maison · 7 p. · 210 m² · Mougins',
      'Visite demandée : Maison · 7 p. · 210 m² · Mougins',
      'Sélection présentée',
      '3 biens sélectionnés : 1 de l’agence, 2 du marché',
      'Fiche créée',
    ]);
  });

  it('le dernier échange, ou rien', () => {
    const now = new Date('2026-11-05T12:00:00Z');
    expect(lastExchangeLabel(['2026-11-03T09:00:00Z', null], now)).toBe(
      'dernier échange il y a 2 j',
    );
    expect(lastExchangeLabel([null, undefined], now)).toBeNull();
    // Le statut daté à la création n'est pas un échange.
    expect(lastExchangeLabel(['2026-11-05T09:00:00Z'], now, '2026-11-05T09:00:00Z')).toBeNull();
  });
});

describe('le prix face au budget', () => {
  it('vert dans le budget, orange au-dessus, rien sans prix ou sans budget', () => {
    expect(budgetGap(1_639_500, 1_650_000)).toEqual({ over: 0, tone: 'green', negotiable: false });
    // +4,2 % : à négocier (M118) ; +12 % : au-dessus du budget, toujours orange.
    expect(budgetGap(1_720_000, 1_650_000)).toEqual({
      over: 70_000,
      tone: 'orange',
      negotiable: true,
    });
    expect(budgetGap(1_850_000, 1_650_000)).toMatchObject({ tone: 'orange', negotiable: false });
    expect(budgetGap(null, 1_650_000)).toBeNull();
    expect(budgetGap(1_000, null)).toBeNull();
  });
});

// Mission 145 (partie A, I2) — un mandat signé à lui proposer : sa fiche et sa ligne le disent, à la
// place de « Trouver ses biens idéaux » et de « Lui proposer d'autres biens » seulement.
describe('la boucle côté acquéreur : « Lui proposer la maison de … »', () => {
  const lopez = {
    key: 'project:p-lopez',
    sellerName: 'M. et Mme Lopez',
    property: {
      propertyType: 'house',
      roomsCount: 5,
      surfaceArea: 135,
      city: 'Vence',
      bedroomsCount: 4,
      floor: null,
      hasElevator: null,
      hasPool: false,
      outdoorSpaces: ['garden'],
      parkingTypes: [],
      energyRating: null,
      generalCondition: null,
    },
    price: 713_000,
    bornAt: '2026-11-04T10:00:00Z',
  };
  const moreau = { ...buyer, budgetMax: 800_000 };

  it('sans sélection : lui proposer le mandat, « Proposer ce bien »', () => {
    const next = buyerNextAction(moreau, NO_PROGRESS, new Date(), [lopez]);
    expect(next.title).toBe('Lui proposer la maison de M. et Mme Lopez');
    // Le formateur lie les nombres par des espaces insécables (M74).
    expect(next.phrase.replace(/\s/g, ' ')).toBe(
      'Maison · 5 pièces · 135 m² · Vence · 713 000 €, 87 000 € sous le budget. Mandat signé le 04/11.',
    );
    expect(next.primary).toEqual({
      label: 'Proposer ce bien',
      href: '/acquereurs/proposer?bien=project%3Ap-lopez',
    });
    expect(next.secondary?.href).toBe('/acquereurs/b1/biens-ideaux');
    expect(next.since).toBe(lopez.bornAt);
  });

  it('après une présentation sans visite : le mandat avant « d’autres biens » ; « + 1 autre bien »', () => {
    const other = {
      ...lopez,
      key: 'project:p-2',
      sellerName: 'Anne Martin',
      bornAt: '2026-11-01T10:00:00Z',
    };
    const next = buyerNextAction(
      moreau,
      facts({ selectionCount: 3, presentedAt: '2026-11-04T09:00:00Z' }),
      new Date(),
      [lopez, other],
    );
    expect(next.title).toBe('Lui proposer la maison de M. et Mme Lopez');
    expect(next.phrase).toMatch(/\+ 1 autre bien à lui proposer\.$/);
  });

  it('une sélection à présenter, une relance ou une visite à organiser passent avant', () => {
    for (const progress of [
      facts({ selectionCount: 3 }),
      facts({ selectionCount: 3, linkCreated: true, linkAt: '2026-11-04T09:00:00Z' }),
      facts({ selectionCount: 3, answeredOnLink: true, visitsToOrganize: 1 }),
    ]) {
      expect(buyerNextAction(moreau, progress, new Date(), [lopez]).title).not.toMatch(
        /^Lui proposer la maison/,
      );
    }
  });

  it('l’appartement d’Anne, le bien de M. Lefebvre : le genre et l’élision', () => {
    const flat = {
      ...lopez,
      sellerName: 'Anne Martin',
      property: { ...lopez.property, propertyType: 'apartment' },
    };
    expect(buyerNextAction(moreau, NO_PROGRESS, new Date(), [flat]).title).toBe(
      'Lui proposer l’appartement d’Anne Martin',
    );
    const other = {
      ...lopez,
      sellerName: 'M. Lefebvre',
      property: { ...lopez.property, propertyType: null },
    };
    expect(buyerNextAction(moreau, NO_PROGRESS, new Date(), [other]).title).toBe(
      'Lui proposer le bien de M. Lefebvre',
    );
  });
});
