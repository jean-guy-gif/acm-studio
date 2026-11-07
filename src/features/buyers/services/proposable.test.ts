import { describe, expect, it } from 'vitest';

import {
  projectsUnderOffer,
  proposableMandate,
  type OfferHold,
} from '@/features/buyers/services/proposable';

// Mission 145 (partie A) — seul un bien sous mandat signé, sans offre acceptée, se propose à un
// acquéreur (décision de Jean-Guy, 07/11). Une offre acceptée tient son mandat tant que son
// acquéreur est « Sous offre » ou « A acheté », et seulement si c'est SA plus récente offre acceptée.
const offer = (over: Partial<OfferHold>): OfferHold => ({
  projectId: 'p-mougins',
  buyerId: 'b-keller',
  decision: 'accepted',
  decidedAt: '2026-11-06T10:00:00Z',
  buyerStatus: 'under_offer',
  ...over,
});

describe('ce qui se propose à un acquéreur', () => {
  it('un mandat signé sans offre : oui ; un vendeur à relancer, un dossier sans issue : non', () => {
    const none = new Set<string>();
    expect(proposableMandate('signed', 'p-lopez', none)).toBe(true);
    for (const outcome of ['follow_up', 'sold_elsewhere', 'withdrawn', null, undefined]) {
      expect(proposableMandate(outcome, 'p-lopez', none)).toBe(false);
    }
  });

  it('une offre acceptée tient le mandat tant que l’acquéreur est sous offre ou a acheté', () => {
    expect([...projectsUnderOffer([offer({})])]).toEqual(['p-mougins']);
    expect([...projectsUnderOffer([offer({ buyerStatus: 'purchased' })])]).toEqual(['p-mougins']);
    expect(proposableMandate('signed', 'p-mougins', projectsUnderOffer([offer({})]))).toBe(false);
    // L'offre tombée : l'acquéreur revenu en visite, en recherche, ou abandonné.
    for (const buyerStatus of ['visiting', 'searching', 'abandoned', null]) {
      expect(projectsUnderOffer([offer({ buyerStatus })]).size).toBe(0);
    }
    expect(projectsUnderOffer([offer({ decision: 'refused' })]).size).toBe(0);
  });

  it('seule la plus récente offre acceptée d’un acquéreur tient : la précédente est libérée', () => {
    // Son offre sur A est tombée, puis acceptée sur B : il est « Sous offre » pour B seulement.
    const held = projectsUnderOffer([
      offer({ projectId: 'p-a', decidedAt: '2026-10-20T10:00:00Z' }),
      offer({ projectId: 'p-b', decidedAt: '2026-11-05T10:00:00Z' }),
    ]);
    expect([...held]).toEqual(['p-b']);
    // A acheté ailleurs (B) : A n'est pas tenu pour toujours.
    const bought = projectsUnderOffer([
      offer({ projectId: 'p-a', decidedAt: '2026-10-20T10:00:00Z', buyerStatus: 'purchased' }),
      offer({ projectId: 'p-b', decidedAt: '2026-11-05T10:00:00Z', buyerStatus: 'purchased' }),
    ]);
    expect([...bought]).toEqual(['p-b']);
    // Deux acquéreurs, deux mandats tenus.
    const two = projectsUnderOffer([
      offer({ projectId: 'p-a' }),
      offer({ projectId: 'p-b', buyerId: 'b-autre' }),
    ]);
    expect([...two].sort()).toEqual(['p-a', 'p-b']);
  });
});
