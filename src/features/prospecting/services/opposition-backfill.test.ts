import { describe, expect, it } from 'vitest';

import { listingIdentityKey } from '@/features/comparable-import/utils/extract-listing-key';
import { missingOppositionAddresses } from '@/features/prospecting/services/opposition-backfill';

// Mission 109 — la nuit, l'adresse confirmée d'une annonce opposée, absente de la liste, y entre.
const URL = 'https://www.seloger.com/annonces/achat/maison/antibes-06/26ZEJMLWB13Y.htm';
const LISTING = listingIdentityKey(URL) as string;
const opposition = (agency: string, listing: string | null, address: string | null = null) => ({
  agency_id: agency,
  listing_key: listing,
  address_key: address,
  requested_at: '2026-10-19T08:00:00.000Z',
});
const competitor = (
  agency: string,
  confirmed: boolean,
  address = '8 avenue Hochet, 06160 Antibes',
) => ({
  agency_id: agency,
  listing_url: URL,
  locator_address: address,
  locator_confirmed: confirmed,
});

describe('le rattrapage de la nuit', () => {
  it('ajoute l’adresse confirmée d’une annonce opposée qui manque à la liste', () => {
    expect(missingOppositionAddresses([opposition('a', LISTING)], [competitor('a', true)])).toEqual(
      [{ agencyId: 'a', addressKey: '8 avenue hochet antibes' }],
    );
  });

  it('rien quand l’adresse y est déjà, ou n’est pas confirmée, ou dans une autre agence', () => {
    expect(
      missingOppositionAddresses(
        [opposition('a', LISTING), opposition('a', null, '8 avenue hochet antibes')],
        [competitor('a', true)],
      ),
    ).toEqual([]);
    expect(
      missingOppositionAddresses([opposition('a', LISTING)], [competitor('a', false)]),
    ).toEqual([]);
    expect(missingOppositionAddresses([opposition('a', LISTING)], [competitor('b', true)])).toEqual(
      [],
    );
  });
});
