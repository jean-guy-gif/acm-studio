import { describe, expect, it } from 'vitest';

import {
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
    expect(UNKNOWN_COMMUNE_NOTICE).toBe('Opposition à vérifier : commune inconnue');
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
