import { describe, expect, it } from 'vitest';

import {
  advisorAddressPatch,
  canAcceptProposedAddress,
  canAdvisorSetAddress,
  confirmedByAdvisor,
} from '@/features/competitor-locator/services/advisor-address';
import { needsLocatorQuery } from '@/features/competitor-locator/services/location-action';

const row = (
  address: string | null,
  confirmed: boolean | null = null,
  source: string | null = null,
) => ({ locator_address: address, locator_confirmed: confirmed, locator_source: source });

describe('« C’est la bonne adresse »', () => {
  it('confirme l’adresse proposée, provenance « vous », position gardée', () => {
    const result = advisorAddressPatch(
      row(' 14 chemin des Oliviers, 06800 Cagnes-sur-Mer ', false, 'dpe'),
      {
        mode: 'accept',
      },
    );
    expect(result).toEqual({
      ok: true,
      patch: {
        locator_address: '14 chemin des Oliviers, 06800 Cagnes-sur-Mer',
        locator_confirmed: true,
        locator_source: 'vous',
        locator_label_key: 'vous',
        locator_label: 'Adresse confirmée par vous',
        locator_state: 'pret',
      },
    });
  });

  it('rien à confirmer sans adresse proposée, ou si elle est déjà confirmée', () => {
    expect(canAcceptProposedAddress(row(null))).toBe(false);
    expect(canAcceptProposedAddress(row('  '))).toBe(false);
    expect(canAcceptProposedAddress(row('1 rue A', true, 'dpe'))).toBe(false);
    expect(advisorAddressPatch(row(null), { mode: 'accept' }).ok).toBe(false);
  });
});

describe('« Saisir l’adresse »', () => {
  it('l’adresse saisie est confirmée par le conseiller, sans position', () => {
    const result = advisorAddressPatch(row(null), {
      mode: 'typed',
      address: '  3 rue  des Lilas,\n06800 Cagnes-sur-Mer ',
    });
    expect(result).toEqual({
      ok: true,
      patch: {
        locator_address: '3 rue des Lilas, 06800 Cagnes-sur-Mer',
        locator_confirmed: true,
        locator_source: 'vous',
        locator_label_key: 'vous',
        locator_label: 'Adresse saisie par vous',
        locator_state: 'pret',
        locator_latitude: null,
        locator_longitude: null,
      },
    });
  });

  it('refuse une adresse vide, trop courte, trop longue ou qui n’est pas un texte', () => {
    for (const address of ['', '  ', 'rue', 'x'.repeat(201), 42, null]) {
      expect(advisorAddressPatch(row(null), { mode: 'typed', address }).ok).toBe(false);
    }
  });

  it('le conseiller corrige sa propre adresse, jamais celle confirmée par le Localisateur', () => {
    expect(canAdvisorSetAddress(row('1 rue A', true, 'vous'))).toBe(true);
    expect(canAdvisorSetAddress(row('1 rue A', true, 'dpe'))).toBe(false);
    expect(
      advisorAddressPatch(row('1 rue A', true, 'dpe'), { mode: 'typed', address: '2 rue B, Nice' })
        .ok,
    ).toBe(false);
    expect(confirmedByAdvisor(row('1 rue A', true, 'vous'))).toBe(true);
    expect(confirmedByAdvisor(row('1 rue A', true, 'dpe'))).toBe(false);
  });
});

describe('une adresse confirmée ou saisie par le conseiller n’est jamais écrasée', () => {
  it('elle ne se redemande plus au Localisateur, donc aucune relecture ne la réécrit', () => {
    for (const input of [
      { mode: 'accept' as const },
      { mode: 'typed' as const, address: '3 rue des Lilas, 06800 Cagnes-sur-Mer' },
    ]) {
      const result = advisorAddressPatch(row('14 chemin des Oliviers', false, 'dpe'), input);
      if (!result.ok) throw new Error('adresse refusée');
      expect(
        needsLocatorQuery({
          listing_url: 'https://www.bienici.com/annonce/apimo-87251688',
          locator_state: result.patch.locator_state,
          locator_confirmed: result.patch.locator_confirmed,
        }),
      ).toBe(false);
    }
  });
});
