import { describe, expect, it } from 'vitest';

import {
  OFFER_LOAN_BLOCKED,
  OFFER_MODE_AT_SIGNING,
  offerGate,
  signingRefusal,
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
    expect(signingRefusal(gate('cash'))).toBeNull();
  });

  it('pas encore dit : le mode se demande d’abord', () => {
    expect(gate('not_said')).toEqual({ kind: 'ask', mode: 'not_said', toVerify: false });
    expect(signingRefusal(gate('not_said'))).toEqual({
      error: OFFER_MODE_AT_SIGNING,
      gate: { kind: 'ask', mode: 'not_said', toVerify: false },
    });
  });

  it('lu dans les notes, encore « À vérifier » : il se confirme d’abord, comptant comme avec prêt', () => {
    expect(gate('cash', true)).toEqual({ kind: 'ask', mode: 'cash', toVerify: true });
    expect(gate('loan', true)).toEqual({ kind: 'ask', mode: 'loan', toVerify: true });
  });

  it('avec prêt : bloquée, avec le message de Jean-Guy, mot pour mot', () => {
    expect(gate('loan')).toEqual({ kind: 'blocked' });
    expect(signingRefusal(gate('loan'))).toEqual({
      error: OFFER_LOAN_BLOCKED,
      gate: { kind: 'blocked' },
    });
    expect(OFFER_LOAN_BLOCKED).toBe(
      'Cet acquéreur finance avec un prêt\u00a0: l’offre avec prêt n’est pas encore disponible dans ACM. Utilisez le modèle de votre agence.',
    );
  });

  // Lot B5 (Jean-Guy, 28/11) — une offre préparée, pas encore signée, quand la fiche dit « Pas encore
  // dit » : la signature rend la question, que l'écran pose à sa place. Un écran ouvert avant le
  // lot B ne sait afficher qu'une ligne : elle pose la question et dit quoi faire, rien n'est perdu.
  it('à la signature : la question pour l’écran, une phrase qui la pose pour l’écran d’avant', () => {
    expect(signingRefusal(gate('cash', true))).toEqual({
      error: OFFER_MODE_AT_SIGNING,
      gate: { kind: 'ask', mode: 'cash', toVerify: true },
    });
    expect(OFFER_MODE_AT_SIGNING).toBe(
      'Comment finance-t-il\u202f? Pour répondre, ouvrez son offre d’achat dans un nouvel onglet\u00a0: elle vous le demande. Puis revenez ici et touchez de nouveau «\u00a0Signer l’offre d’achat\u00a0»\u00a0: ce que vous avez saisi reste à l’écran.',
    );
  });

  it('le jour où la clause avec prêt est validée, l’offre avec prêt s’ouvre', () => {
    expect(gate('loan', false, true)).toEqual({ kind: 'form' });
    expect(gate('not_said', false, true).kind).toBe('ask');
  });
});
