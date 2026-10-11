import type { ConclusionDecision } from '@/features/meeting-conclusion/schemas/conclusion-input';
import type { ConclusionOutcome, MandateType } from '@/features/meeting-conclusion/types';

// Mission 90 — ce qu'une issue EXIGE, à la conclusion comme au changement d'issue. Pur.
//   • « Mandat signé » : exclusif ou simple, obligatoire ; et un prix de commercialisation —
//     celui qui est déjà enregistré, ou celui qu'on saisit s'il manque ;
//   • les trois autres issues : rien d'obligatoire ; le prix reste facultatif, le motif aussi.
// Sans le type et le prix d'un mandat signé, la bêta ne peut pas mesurer ce que le produit
// promet : combien de mandats, dont combien d'exclusifs, et à quel prix.

export const OUTCOME_REQUIRED_MESSAGE =
  'Choisissez une issue : Mandat signé, À relancer, Vendu ailleurs ou Retiré de la vente.';
export const MANDATE_TYPE_REQUIRED_MESSAGE = 'Mandat signé : indiquez s’il est exclusif ou simple.';
export const PRICE_REQUIRED_MESSAGE = 'Mandat signé : indiquez le prix de commercialisation.';
export const PRICE_INVALID_MESSAGE = 'Saisissez un prix de commercialisation valide.';

// Ce que la base sait déjà du dossier au moment du geste.
export type KnownConclusion = {
  commercializationPrice: number | null;
  mandateType: MandateType | null;
};

export type ResolvedDecision = {
  outcome: ConclusionOutcome;
  // Le motif, pour tout sauf un mandat signé.
  reason: string | null;
  // Le type à écrire : celui du formulaire ; null hors mandat signé.
  mandateType: MandateType | null;
  // Le prix à écrire ; null = garder celui qui est enregistré.
  price: number | null;
};

export type DecisionCheck = { ok: true; value: ResolvedDecision } | { ok: false; error: string };

export function checkDecision(decision: ConclusionDecision, known: KnownConclusion): DecisionCheck {
  if (decision.outcome !== 'signed') {
    return {
      ok: true,
      value: {
        outcome: decision.outcome,
        reason: decision.reason,
        mandateType: null,
        price: decision.price,
      },
    };
  }
  if (decision.mandateType == null) {
    return { ok: false, error: MANDATE_TYPE_REQUIRED_MESSAGE };
  }
  if (decision.price == null && known.commercializationPrice == null) {
    return { ok: false, error: PRICE_REQUIRED_MESSAGE };
  }
  return {
    ok: true,
    value: {
      outcome: 'signed',
      reason: null,
      mandateType: decision.mandateType,
      price: decision.price,
    },
  };
}
