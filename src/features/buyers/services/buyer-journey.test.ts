import { describe, expect, it } from 'vitest';

import {
  budgetGap,
  buyerJourney,
  buyerNextAction,
  buyerTimeline,
  lastExchangeLabel,
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

describe('ses quatre étapes', () => {
  it('l’étape du jour est la première qui n’est pas faite', () => {
    const steps = buyerJourney(facts({ selectionCount: 3 }));
    expect(steps.map((step) => [step.key, step.status, step.state])).toEqual([
      ['ideal', 'done', '3 biens sélectionnés'],
      ['present', 'current', 'à faire'],
      ['answer', 'later', 'lien à envoyer'],
      ['visits', 'later', '0 demandée'],
    ]);
  });

  it('présentée, visites demandées puis faites', () => {
    const asked = buyerJourney(
      facts({ selectionCount: 3, presentedAt: '2026-11-04T09:00:00Z', visitsToOrganize: 1 }),
    );
    expect(asked[3]).toMatchObject({ status: 'current', state: '1 demandée, à organiser' });
    const visited = buyerJourney(
      facts({ selectionCount: 3, presentedAt: '2026-11-04T09:00:00Z', visitsDone: 2 }),
    );
    expect(visited.every((step) => step.status === 'done')).toBe(true);
    expect(visited[3].state).toBe('2 faites');
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
