import { describe, expect, it } from 'vitest';

import {
  ACADEMIA_API_OUVERT_AGENCES,
  ACADEMIA_DEMO_ADDRESS,
  academiaApiAccess,
} from '@/features/academia/services/academia-api-access';

// Mission 157 — l'accès à l'API, décidé au serveur : la démo par la clé d'essai et la seule adresse
// fictive de son dossier ; une vraie agence fermée tant que l'interrupteur est éteint (la référence
// du bien chez Laurent, le texte de confidentialité) ; sans accès, le geste d'aujourd'hui.
const env = { ACADEMIA_API_KEY: 'msk_vraie', ACADEMIA_API_KEY_DEMO: 'msk_demo' };
const DEMO_ADDRESS = '1 place de la Démonstration, 06000 Nice';

describe('academiaApiAccess', () => {
  it('éteint pour les vraies agences, et sans adresse de démonstration tant que Laurent ne l’a pas donnée', () => {
    expect(ACADEMIA_API_OUVERT_AGENCES).toBe(false);
    expect(ACADEMIA_DEMO_ADDRESS).toBeNull();
    expect(academiaApiAccess(false, env)).toBeNull();
    expect(academiaApiAccess(true, env)).toBeNull();
  });

  it('la démo : la clé d’essai et l’adresse fictive de son dossier, jamais la vraie clé', () => {
    expect(academiaApiAccess(true, env, false, DEMO_ADDRESS)).toEqual({
      key: 'msk_demo',
      demoAddress: DEMO_ADDRESS,
    });
    expect(
      academiaApiAccess(true, { ACADEMIA_API_KEY: 'msk_vraie' }, true, DEMO_ADDRESS),
    ).toBeNull();
  });

  it('une vraie agence, l’interrupteur allumé : la vraie clé, jamais celle de la démo', () => {
    expect(academiaApiAccess(false, env, true)).toEqual({ key: 'msk_vraie', demoAddress: null });
    expect(academiaApiAccess(false, { ACADEMIA_API_KEY_DEMO: 'msk_demo' }, true)).toBeNull();
    expect(academiaApiAccess(false, { ACADEMIA_API_KEY: '  ' }, true)).toBeNull();
  });
});
