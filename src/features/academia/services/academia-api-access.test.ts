import { describe, expect, it } from 'vitest';

import {
  ACADEMIA_API_AGENCES_OUVERTES,
  ACADEMIA_DEMO_ADDRESS,
  START_ACADEMY_AGENCY_ID,
  academiaApiAccess,
} from '@/features/academia/services/academia-api-access';

// Mission 157 — l'accès à l'API, décidé au serveur : la démo par la clé d'essai et la seule adresse
// fictive de son dossier ; sans accès, le geste d'aujourd'hui.
// Mission 161 — l'ouverture aux vraies agences en deux temps (Jean-Guy, 18/11) : d'abord une seule
// agence, Start Academy, puis toutes ; l'interrupteur est une liste d'agences, ou « toutes ».
const env = { ACADEMIA_API_KEY: 'msk_vraie', ACADEMIA_API_KEY_DEMO: 'msk_demo' };
const DEMO_ADDRESS = '1 place de la Démonstration, 06000 Nice';
const OTHER = '11111111-2222-4333-8444-555555555555';

describe('academiaApiAccess', () => {
  it('ouvert à Start Academy seulement ; l’adresse du dossier de démonstration donnée par Laurent', () => {
    expect(START_ACADEMY_AGENCY_ID).toBe('93c038d3-e532-408f-bb6a-d8fac760e811');
    expect(ACADEMIA_API_AGENCES_OUVERTES).toEqual([START_ACADEMY_AGENCY_ID]);
    expect(ACADEMIA_DEMO_ADDRESS).toBe('12 Avenue de la Démonstration, 06800 Cagnes-sur-Mer');
    expect(academiaApiAccess({ demo: false, agencyId: START_ACADEMY_AGENCY_ID }, env)).toEqual({
      key: 'msk_vraie',
      demoAddress: null,
    });
    expect(academiaApiAccess({ demo: false, agencyId: OTHER }, env)).toBeNull();
    expect(academiaApiAccess({ demo: true, agencyId: OTHER }, env)).toEqual({
      key: 'msk_demo',
      demoAddress: '12 Avenue de la Démonstration, 06800 Cagnes-sur-Mer',
    });
    // Sans la clé d'essai, la démo garde la carte d'aujourd'hui.
    expect(
      academiaApiAccess({ demo: true, agencyId: OTHER }, { ACADEMIA_API_KEY: 'msk_vraie' }),
    ).toBeNull();
  });

  it('la démo : la clé d’essai et l’adresse fictive de son dossier, jamais la vraie clé', () => {
    expect(academiaApiAccess({ demo: true, agencyId: OTHER }, env, [], DEMO_ADDRESS)).toEqual({
      key: 'msk_demo',
      demoAddress: DEMO_ADDRESS,
    });
    expect(
      academiaApiAccess(
        { demo: true, agencyId: OTHER },
        { ACADEMIA_API_KEY: 'msk_vraie' },
        'toutes',
        DEMO_ADDRESS,
      ),
    ).toBeNull();
  });

  it('une vraie agence ouverte : la vraie clé, jamais celle de la démo ; une liste vide ferme tout', () => {
    expect(academiaApiAccess({ demo: false, agencyId: OTHER }, env, 'toutes')).toEqual({
      key: 'msk_vraie',
      demoAddress: null,
    });
    expect(academiaApiAccess({ demo: false, agencyId: OTHER }, env, [OTHER])).toEqual({
      key: 'msk_vraie',
      demoAddress: null,
    });
    expect(academiaApiAccess({ demo: false, agencyId: OTHER }, env, [])).toBeNull();
    expect(
      academiaApiAccess({ demo: false, agencyId: OTHER }, { ACADEMIA_API_KEY_DEMO: 'msk_demo' }, [
        OTHER,
      ]),
    ).toBeNull();
    expect(
      academiaApiAccess({ demo: false, agencyId: OTHER }, { ACADEMIA_API_KEY: '  ' }, 'toutes'),
    ).toBeNull();
    // Sans agence connue, jamais ouvert.
    expect(academiaApiAccess({ demo: false, agencyId: null }, env, 'toutes')).toBeNull();
  });
});
