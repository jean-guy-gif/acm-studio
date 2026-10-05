import { describe, expect, it } from 'vitest';

import {
  formatFrenchDate,
  redirectedAwayFromListing,
  withdrawnReason,
} from '@/features/competitor-search/services/stream-estate-import';
import type { StreamEstateFacts } from '@/features/competitor-search/types';

const FACTS: StreamEstateFacts = {
  propertyId: '828d2950-aa3c-4c9b-89df-dcd8e0bc8cde',
  originSite: 'SeLoger',
  onlineSince: '2026-09-21T16:53:52+02:00',
  lastSeenAt: '2026-10-02T23:30:00+02:00',
  priceDrops: [],
};

describe('redirectedAwayFromListing', () => {
  const listing = 'https://www.seloger.com/annonce/achat/nice-06000/269HQ7LK3HUY';

  it('la même annonce n’est pas une redirection (barre finale comprise)', () => {
    expect(redirectedAwayFromListing(listing, listing)).toBe(false);
    expect(redirectedAwayFromListing(listing, `${listing}/`)).toBe(false);
  });

  it('renvoyée vers une liste de résultats ou l’accueil : annonce retirée', () => {
    expect(
      redirectedAwayFromListing(listing, 'https://www.seloger.com/immobilier/achat/immo-nice-06/'),
    ).toBe(true);
    expect(redirectedAwayFromListing(listing, 'https://www.seloger.com/')).toBe(true);
  });

  it('renvoyée vers une autre adresse d’ANNONCE (forme longue) : pas retirée', () => {
    expect(
      redirectedAwayFromListing(
        'https://www.seloger.com/annonce/268JZXADRNI4',
        'https://www.seloger.com/annonce/achat/provence-alpes-cote-d-azur/nice-06000/268JZXADRNI4',
      ),
    ).toBe(false);
  });
});

describe('messages', () => {
  it('« annonce retirée depuis » le dernier passage, daté à l’heure de Paris', () => {
    expect(withdrawnReason(FACTS)).toBe(
      'annonce retirée depuis le dernier passage de Stream Estate (vue en ligne le 02/10/2026) : la page d’origine sur SeLoger ne la montre plus — non importée',
    );
  });

  it('sans date de passage, le message ne l’invente pas', () => {
    expect(withdrawnReason({ ...FACTS, lastSeenAt: null })).toMatch(
      /^annonce retirée depuis le dernier passage de Stream Estate : /,
    );
  });

  it('formatFrenchDate : date française, null si illisible', () => {
    expect(formatFrenchDate('2026-09-21T16:53:52+02:00')).toBe('21/09/2026');
    expect(formatFrenchDate('pas une date')).toBeNull();
    expect(formatFrenchDate(null)).toBeNull();
  });
});
