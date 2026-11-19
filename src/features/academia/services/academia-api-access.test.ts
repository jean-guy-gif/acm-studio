import { describe, expect, it } from 'vitest';

import {
  ACADEMIA_API_AGENCES_FERMEES,
  ACADEMIA_API_AGENCES_OUVERTES,
  ACADEMIA_DEMO_ADDRESS,
  START_ACADEMY_AGENCY_ID,
  academiaApiAccess,
} from '@/features/academia/services/academia-api-access';

// Mission 157 — l'accès à l'API, décidé au serveur : la démo par la clé d'essai et la seule adresse
// fictive de son dossier ; sans accès, le geste d'aujourd'hui.
// Mission 161 — l'ouverture aux vraies agences en deux temps (Jean-Guy, 18/11) : d'abord une seule
// agence, Start Academy, puis toutes ; l'interrupteur est une liste d'agences, ou « toutes ».
// Toutes depuis le 19/11 (Jean-Guy), avec les textes de `/confidentialite`.
const env = { ACADEMIA_API_KEY: 'msk_vraie', ACADEMIA_API_KEY_DEMO: 'msk_demo' };
const DEMO_ADDRESS = '1 place de la Démonstration, 06000 Nice';
const OTHER = '11111111-2222-4333-8444-555555555555';

describe('academiaApiAccess', () => {
  it('ouvert à toutes les agences (Jean-Guy, 19/11) ; la démo garde sa clé d’essai', () => {
    expect(START_ACADEMY_AGENCY_ID).toBe('93c038d3-e532-408f-bb6a-d8fac760e811');
    expect(ACADEMIA_API_AGENCES_OUVERTES).toBe('toutes');
    expect(ACADEMIA_DEMO_ADDRESS).toBe('12 Avenue de la Démonstration, 06800 Cagnes-sur-Mer');
    for (const agencyId of [START_ACADEMY_AGENCY_ID, OTHER]) {
      expect(academiaApiAccess({ demo: false, agencyId }, env)).toEqual({
        key: 'msk_vraie',
        demoAddress: null,
      });
    }
    // Sans la vraie clé dans Vercel, aucune agence n'est ouverte.
    expect(
      academiaApiAccess({ demo: false, agencyId: OTHER }, { ACADEMIA_API_KEY_DEMO: 'x' }),
    ).toBeNull();
    expect(academiaApiAccess({ demo: true, agencyId: OTHER }, env)).toEqual({
      key: 'msk_demo',
      demoAddress: '12 Avenue de la Démonstration, 06800 Cagnes-sur-Mer',
    });
    // Sans la clé d'essai, la démo garde la carte d'aujourd'hui, jamais la vraie clé.
    expect(
      academiaApiAccess({ demo: true, agencyId: OTHER }, { ACADEMIA_API_KEY: 'msk_vraie' }),
    ).toBeNull();
  });

  it('l’agence des tests automatiques n’appelle jamais l’API réelle, même « toutes » ouvertes', () => {
    const TEST_AGENCY = 'ee9c5ad0-8c1e-45ba-b311-666415cf5db4';
    expect(ACADEMIA_API_AGENCES_FERMEES).toEqual([TEST_AGENCY]);
    expect(academiaApiAccess({ demo: false, agencyId: TEST_AGENCY }, env, 'toutes')).toBeNull();
    expect(
      academiaApiAccess({ demo: false, agencyId: TEST_AGENCY }, env, [TEST_AGENCY]),
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
