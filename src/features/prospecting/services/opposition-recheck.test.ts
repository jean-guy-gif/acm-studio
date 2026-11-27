import { describe, expect, it } from 'vitest';

import { addressKey } from '@/features/prospecting/services/address-key';
import {
  correctedOppositionKey,
  isCronAuthorized,
  recheckDecision,
  UNKNOWN_COMMUNE_NOTICE,
} from '@/features/prospecting/services/opposition-recheck';

// Mission 105 — les oppositions « commune non vérifiée », revérifiées chaque nuit.
describe('la revérification de la nuit', () => {
  it('commune reconnue (nom d’usage compris) : le repère est retiré', () => {
    expect(recheckDecision('Cagnes sur Mer', [{ nom: 'Cagnes-sur-Mer' }])).toBe('verified');
    expect(recheckDecision('Juan-les-Pins', [{ nom: 'Antibes' }])).toBe('verified');
  });

  it('commune inconnue : le manager le voit', () => {
    expect(recheckDecision('Cagnes sur Mère', [{ nom: 'Cagnes-sur-Mer' }])).toBe('unknown');
    expect(recheckDecision('Nullepart', [])).toBe('unknown');
    expect(UNKNOWN_COMMUNE_NOTICE).toBe('Opposition à vérifier\u00a0: commune inconnue');
  });

  it('service muet : rien ne change, on réessaie la nuit suivante', () => {
    expect(recheckDecision('Antibes', null)).toBe('retry');
  });

  it('seule la tâche planifiée, avec son jeton, la déclenche', () => {
    const secret = 'un-secret-de-plus-de-16-caracteres';
    expect(isCronAuthorized(`Bearer ${secret}`, secret)).toBe(true);
    expect(isCronAuthorized(null, secret)).toBe(false);
    expect(isCronAuthorized('Bearer autre', secret)).toBe(false);
    // Sans secret configuré (ou trop court), personne n'entre.
    expect(isCronAuthorized('Bearer ', undefined)).toBe(false);
    expect(isCronAuthorized('Bearer court', 'court')).toBe(false);
  });
});

// Mission 107 — corriger la commune d'une alerte : la clé rejoint celle de la carte.
describe('corriger la commune d’une opposition « commune inconnue »', () => {
  it('la clé reconstruite est celle de la carte, alias compris', () => {
    const key = correctedOppositionKey({
      addressKey: '14 chemin des oliviers cagnes sur mere',
      communeTyped: 'Cagnes sur Mère',
      correctedCommune: 'Cagnes-sur-Mer',
      found: [{ nom: 'Cagnes-sur-Mer' }],
    });
    expect(key).toBe(addressKey('14 ch. des Oliviers, 06800 Cagnes-sur-Mer'));
    expect(
      correctedOppositionKey({
        addressKey: '8 avenue hochet juans les pins',
        communeTyped: 'Juans les Pins',
        correctedCommune: 'Juan-les-Pins',
        found: [{ nom: 'Antibes' }],
      }),
    ).toBe(addressKey('8 av Hochet, 06160 Antibes'));
  });

  it('commune non reconnue, ou rue introuvable dans la clé : rien n’est deviné', () => {
    const base = { addressKey: '14 chemin des oliviers nullepart', communeTyped: 'Nullepart' };
    expect(
      correctedOppositionKey({ ...base, correctedCommune: 'Antibes', found: [{ nom: 'Cannes' }] }),
    ).toBeNull();
    expect(
      correctedOppositionKey({
        addressKey: '14 chemin des oliviers ailleurs',
        communeTyped: 'Nullepart',
        correctedCommune: 'Antibes',
        found: [{ nom: 'Antibes' }],
      }),
    ).toBeNull();
    // Paris sans arrondissement ne se devine pas.
    expect(
      correctedOppositionKey({
        addressKey: '12 rue lecourbe pariss',
        communeTyped: 'Pariss',
        correctedCommune: 'Paris',
        found: [{ nom: 'Paris' }],
      }),
    ).toBeNull();
  });
});
