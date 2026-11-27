import { describe, expect, it } from 'vitest';

import { NO_PROGRESS } from '@/features/buyers/services/buyer-progress';
import { buyerReadiness } from '@/features/buyers/services/buyer-readiness';
import { buyerStatusActions, nextBuyerStatus } from '@/features/buyers/services/buyer-status';
import { taskLine } from '@/features/meeting-conclusion/services/suivi-step-labels';
import { buildSuiviTaskList } from '@/features/meeting-conclusion/services/suivi-tasks';
import {
  newOfferHref,
  offerAnswerBadge,
  offerAnswerBuyerMessage,
  offerAnswerTasks,
  offerNotaryMessage,
  offerOwner,
  type AnsweredOffer,
} from '@/features/purchase-offer/services/offer-answer';
import { offerExpiryTasks } from '@/features/purchase-offer/services/offer-tasks';

// Mission 138 — l'offre acceptée (ou refusée) : sa tâche en tête jusqu'au « Fait », ses messages,
// son badge daté ; l'acquéreur « Sous offre » ne compte plus comme prêt à visiter.
const NOW = new Date('2026-11-06T10:00:00Z');
const CONTEXT = { motiveLabel: null, lastContactDays: null, signedOn: null, propertyLabel: null };

const answered = (over: Partial<AnsweredOffer> = {}): AnsweredOffer => ({
  offerId: 'o1',
  buyerId: 'keller',
  buyerName: 'Famille Keller',
  visitId: 'v1',
  decision: 'accepted',
  decidedAt: '2026-11-05T23:30:00Z',
  done: false,
  ...over,
});

describe('la tâche de la réponse du vendeur', () => {
  it('née de la réponse, due le jour de la réponse à Paris ; « Fait » : plus rien', () => {
    const [task] = offerAnswerTasks([answered()]);
    // 23 h 30 UTC le 05/11 = le 06/11 à Paris.
    expect(task!.dueOn).toBe('2026-11-06');
    expect(task!.kind).toBe('offer_answer');
    expect(task!.visitId).toBe('v1');
    expect(offerAnswerTasks([answered({ done: true })])).toEqual([]);
  });

  it('en tête de « À faire aujourd’hui », avant l’échéance d’une offre, jamais en retard', () => {
    const list = buildSuiviTaskList([], NOW, [
      ...offerExpiryTasks(
        [
          {
            offerId: 'o2',
            buyerId: 'lambert',
            buyerName: 'M. et Mme Lambert',
            validUntil: '2026-11-07',
            answered: false,
          },
        ],
        NOW,
      ),
      ...offerAnswerTasks([answered({ decidedAt: '2026-10-20T10:00:00Z' })]),
    ]);
    expect(list.dues.map((task) => task.kind)).toEqual(['offer_answer', 'offer_expiry']);
    const line = taskLine(list.dues[0]!, CONTEXT, '2026-11-06');
    expect(line.title).toBe('Le vendeur a accepté l’offre de la famille Keller');
    expect(line.detail).toBe('acceptée le 20/10 · prévenir l’acquéreur, transmettre au notaire');
    expect(line.late).toBeNull();
    expect(line.href).toBe('/acquereurs/keller/offre/o1');
  });

  it('refusée : « L’offre des Keller est refusée »', () => {
    const [task] = offerAnswerTasks([answered({ decision: 'refused' })]);
    const line = taskLine(task!, CONTEXT, '2026-11-06');
    expect(line.title).toBe('L’offre des Keller est refusée');
    expect(line.detail).toBe('refusée le 06/11 · prévenir l’acquéreur');
    expect(offerOwner('M. et Mme Lambert')).toBe('de M. et Mme Lambert');
    expect(offerOwner(null)).toBe('de l’acquéreur');
  });

  it('« Faire une nouvelle offre » repart de la visite', () => {
    expect(newOfferHref('keller', 'v1')).toBe('/acquereurs/keller/offre?visite=v1');
    expect(newOfferHref('keller', null)).toBe('/acquereurs/keller/offre');
  });
});

describe('les messages', () => {
  const FORBIDDEN = /€|\d{3} \d{3}|vente conclue|définiti|estimation|disponible|Lefebvre|budget/i;

  it('à l’acquéreur, acceptée : la date, le lien de sa copie, la suite chez le notaire', () => {
    const message = offerAnswerBuyerMessage({
      decision: 'accepted',
      buyerName: 'Famille Keller',
      property: 'la maison de Mougins',
      decidedAt: '2026-11-06T09:00:00Z',
      url: 'https://acm.example/offre/abc',
      advisorFirstName: 'Natacha',
    });
    expect(message).toBe(
      [
        'Bonjour Famille Keller,',
        'Bonne nouvelle\u00a0: le vendeur a accepté votre offre d’achat pour la maison de Mougins, le 06/11.',
        'Votre offre, signée par vous et par le vendeur\u00a0: https://acm.example/offre/abc',
        'Je vous appelle pour la suite chez le notaire.',
        'Natacha',
      ].join('\n'),
    );
    expect(message).not.toMatch(FORBIDDEN);
  });

  it('à l’acquéreur, refusée : le fait, sans lien, sans motif ni prix', () => {
    const message = offerAnswerBuyerMessage({
      decision: 'refused',
      buyerName: 'Famille Keller',
      property: 'la maison de Mougins',
      decidedAt: '2026-11-06T09:00:00Z',
      url: null,
      advisorFirstName: null,
    });
    expect(message).toBe(
      [
        'Bonjour Famille Keller,',
        'Le vendeur n’a pas retenu votre offre d’achat pour la maison de Mougins.',
        'Je vous appelle pour en parler et voir ensemble la suite.',
      ].join('\n'),
    );
    expect(message).not.toMatch(FORBIDDEN);
    expect(message).not.toMatch(/https?:/);
  });

  it('au notaire : l’adresse exacte, le mandat, le lien, le conseiller ; jamais un budget', () => {
    const message = offerNotaryMessage({
      propertyAddress: '12 chemin des Pins, 06250 Mougins',
      mandateNumber: 'M-2026-041',
      url: 'https://acm.example/offre/xyz',
      advisor: { name: 'Natacha Durand', phone: '06 39 98 41 27' },
      agencyName: 'Agence Horizon Côte d’Azur',
    });
    expect(message).toContain('Maître,');
    expect(message).toContain(
      'pour le bien situé 12 chemin des Pins, 06250 Mougins, mandat n° M-2026-041\u00a0: https://acm.example/offre/xyz',
    );
    expect(message).toContain('Natacha Durand · Agence Horizon Côte d’Azur · 06 39 98 41 27');
    expect(message).not.toMatch(/budget|estimation|disponible|€/i);
  });
});

describe('le badge daté', () => {
  it('« Offre acceptée le … » / « Offre refusée le … », jour de Paris', () => {
    expect(offerAnswerBadge('accepted', '2026-11-05T23:30:00Z')).toBe('Offre acceptée le 06/11');
    expect(offerAnswerBadge('refused', '2026-11-04T10:00:00Z')).toBe('Offre refusée le 04/11');
  });
});

describe('« Sous offre »', () => {
  const buyer = {
    status: 'under_offer' as const,
    financing: 'validated' as const,
    budgetMax: 1_650_000,
    createdAt: '2026-10-01T10:00:00Z',
    statusChangedAt: '2026-11-06T09:00:00Z',
    contactedAt: '2026-11-05T09:00:00Z',
  };

  it('ne compte plus comme prêt à visiter, et y revient quand le statut est remis', () => {
    expect(buyerReadiness(buyer, NO_PROGRESS, NOW).state).toBeNull();
    expect(buyerReadiness({ ...buyer, status: 'visiting' }, NO_PROGRESS, NOW).state).toBe('ready');
  });

  it('de là : a acheté, abandonné, ou « L’offre est tombée : revenir en visite »', () => {
    expect(nextBuyerStatus('under_offer', 'forward')).toBe('bought');
    expect(nextBuyerStatus('under_offer', 'back')).toBe('visiting');
    expect(nextBuyerStatus('under_offer', 'abandon')).toBe('abandoned');
    expect(buyerStatusActions('under_offer').map((action) => action.label)).toEqual([
      'A acheté',
      'L’offre est tombée\u00a0: revenir en visite',
      'Abandonné',
    ]);
    // Le conseiller n'y fait jamais passer à la main : c'est l'acceptation du vendeur.
    expect(nextBuyerStatus('visiting', 'forward')).toBe('bought');
  });
});
