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
// Lot B5 (Jean-Guy, 28/11) — ce que lit, à la signature, un écran de l'offre ouvert avant le lot B :
// il n'affiche qu'une ligne, qui pose la question et dit quoi faire ; rien de ce qui est saisi n'est
// perdu. L'écran d'aujourd'hui pose la question elle-même et ne montre pas cette ligne.
export const OFFER_MODE_AT_SIGNING =
  'Comment finance-t-il\u202f? Pour répondre, ouvrez son offre d’achat dans un nouvel onglet\u00a0: elle vous le demande. Puis revenez ici et touchez de nouveau «\u00a0Signer l’offre d’achat\u00a0»\u00a0: ce que vous avez saisi reste à l’écran.';

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

export type RefusedGate = Exclude<OfferGate, { kind: 'form' }>;

// Ce que répond la signature quand l'offre n'est pas ouverte : rien ne se signe. La porte dit à
// l'écran ce qu'il doit demander (lot B5 : la question, à la place de la signature) ; la phrase est
// pour l'écran d'avant, qui n'affiche qu'une ligne.
export function signingRefusal(gate: OfferGate): { error: string; gate: RefusedGate } | null {
  if (gate.kind === 'ask') return { error: OFFER_MODE_AT_SIGNING, gate };
  if (gate.kind === 'blocked') return { error: OFFER_LOAN_BLOCKED, gate };
  return null;
}
