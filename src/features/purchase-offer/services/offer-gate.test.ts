import { describe, expect, it } from 'vitest';

import {
  OFFER_LOAN_BLOCKED,
  OFFER_MODE_FIRST,
  offerGate,
  offerGateRefusal,
} from '@/features/purchase-offer/services/offer-gate';

// Lot B (Jean-Guy, 27/11) — l'offre d'achat, tant que la clause avec prêt n'est pas active :
// comptant, l'offre d'aujourd'hui ; pas encore dit, l'écran demande d'abord le mode, avant tout
// champ ; avec prêt, l'offre est bloquée, avec son message. Un mode lu dans les notes et encore
// « À vérifier » se confirme d'abord (réponse 10).
const gate = (mode: 'cash' | 'loan' | 'not_said', toVerify = false, loanClauseValidated = false) =>
  offerGate({ mode, toVerify, loanClauseValidated });

describe('la porte de l’offre d’achat', () => {
  it('comptant : l’offre d’aujourd’hui', () => {
    expect(gate('cash')).toEqual({ kind: 'form' });
    expect(offerGateRefusal(gate('cash'))).toBeNull();
  });

  it('pas encore dit : le mode se demande d’abord', () => {
    expect(gate('not_said')).toEqual({ kind: 'ask', mode: 'not_said', toVerify: false });
    expect(offerGateRefusal(gate('not_said'))).toBe(OFFER_MODE_FIRST);
  });

  it('lu dans les notes, encore « À vérifier » : il se confirme d’abord, comptant comme avec prêt', () => {
    expect(gate('cash', true)).toEqual({ kind: 'ask', mode: 'cash', toVerify: true });
    expect(gate('loan', true)).toEqual({ kind: 'ask', mode: 'loan', toVerify: true });
  });

  it('avec prêt : bloquée, avec le message de Jean-Guy, mot pour mot', () => {
    expect(gate('loan')).toEqual({ kind: 'blocked' });
    expect(offerGateRefusal(gate('loan'))).toBe(OFFER_LOAN_BLOCKED);
    expect(OFFER_LOAN_BLOCKED).toBe(
      'Cet acquéreur finance avec un prêt\u00a0: l’offre avec prêt n’est pas encore disponible dans ACM. Utilisez le modèle de votre agence.',
    );
  });

  it('le jour où la clause avec prêt est validée, l’offre avec prêt s’ouvre', () => {
    expect(gate('loan', false, true)).toEqual({ kind: 'form' });
    expect(gate('not_said', false, true).kind).toBe('ask');
  });
});
