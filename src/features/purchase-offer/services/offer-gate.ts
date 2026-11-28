import type { BuyerFinancingMode } from '@/features/buyers/types';

// Lot B (Jean-Guy, 27/11) — l'offre d'achat selon comment l'acquéreur finance son achat, tant que
// la clause avec prêt n'est pas validée par la juriste (`OFFRE_AVEC_PRET_VALIDEE`) : comptant,
// l'offre d'aujourd'hui ; pas encore dit, l'écran demande d'abord le mode, avant tout champ ; avec
// prêt, l'offre est bloquée. Un mode lu dans les notes et encore « À vérifier » se confirme d'abord
// (réponse 10 : la validation du conseiller avant un résultat final). La page l'applique en tête ;
// la signature, au serveur, l'applique de nouveau sur la fiche relue en base. Le texte de l'offre ne
// change pas d'un mot. Pur.

export const OFFER_LOAN_BLOCKED =
  'Cet acquéreur finance avec un prêt\u00a0: l’offre avec prêt n’est pas encore disponible dans ACM. Utilisez le modèle de votre agence.';
export const OFFER_MODE_FIRST =
  'Dites d’abord comment l’acquéreur finance son achat\u00a0: l’offre en dépend.';

export type OfferGate =
  | { kind: 'form' }
  | { kind: 'ask'; mode: BuyerFinancingMode; toVerify: boolean }
  | { kind: 'blocked' };

export function offerGate(input: {
  mode: BuyerFinancingMode;
  toVerify: boolean;
  loanClauseValidated: boolean;
}): OfferGate {
  if (input.mode === 'not_said' || input.toVerify) {
    return { kind: 'ask', mode: input.mode, toVerify: input.toVerify };
  }
  if (input.mode === 'loan' && !input.loanClauseValidated) return { kind: 'blocked' };
  return { kind: 'form' };
}

// Ce que répond la signature quand l'offre n'est pas ouverte : rien ne se signe.
export function offerGateRefusal(gate: OfferGate): string | null {
  if (gate.kind === 'ask') return OFFER_MODE_FIRST;
  if (gate.kind === 'blocked') return OFFER_LOAN_BLOCKED;
  return null;
}
