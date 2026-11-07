import { describe, expect, it } from 'vitest';

import {
  mandateUnderOffer,
  projectsUnderOffer,
  proposableMandate,
} from '@/features/buyers/services/proposable';

// Mission 145 (partie A) — seul un bien sous mandat signé, sans offre acceptée, se propose à un
// acquéreur (décision de Jean-Guy, 07/11). Une offre acceptée tient tant que son acquéreur est
// « Sous offre » ou « A acheté » ; « L'offre est tombée » (M138) la défait.
describe('ce qui se propose à un acquéreur', () => {
  const accepted = (buyerStatus: string | null) => ({ decision: 'accepted' as const, buyerStatus });

  it('un mandat signé sans offre : oui ; un vendeur à relancer, un dossier sans issue : non', () => {
    expect(proposableMandate('signed', [])).toBe(true);
    for (const outcome of ['follow_up', 'sold_elsewhere', 'withdrawn', null, undefined]) {
      expect(proposableMandate(outcome, [])).toBe(false);
    }
  });

  it('une offre acceptée tient le mandat tant que l’acquéreur est sous offre ou a acheté', () => {
    expect(mandateUnderOffer([accepted('under_offer')])).toBe(true);
    expect(mandateUnderOffer([accepted('purchased')])).toBe(true);
    expect(proposableMandate('signed', [accepted('under_offer')])).toBe(false);
    // L'offre tombée : l'acquéreur revenu en visite, en recherche, ou abandonné.
    for (const status of ['visiting', 'searching', 'abandoned', null]) {
      expect(mandateUnderOffer([accepted(status)])).toBe(false);
    }
    expect(mandateUnderOffer([{ decision: 'refused', buyerStatus: 'under_offer' }])).toBe(false);
  });

  it('les dossiers tenus, parmi plusieurs', () => {
    expect([
      ...projectsUnderOffer([
        { projectId: 'p-mougins', ...accepted('under_offer') },
        { projectId: 'p-lopez', decision: 'refused', buyerStatus: 'visiting' },
      ]),
    ]).toEqual(['p-mougins']);
  });
});
