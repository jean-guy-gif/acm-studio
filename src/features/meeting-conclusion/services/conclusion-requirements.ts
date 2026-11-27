import type { ConclusionDecision } from '@/features/meeting-conclusion/schemas/conclusion-input';
import type {
  ConclusionOutcome,
  FollowUpMotive,
  MandateType,
} from '@/features/meeting-conclusion/types';

// Mission 90 — ce qu'une issue EXIGE, à la conclusion comme au changement d'issue. Pur.
//   • « Mandat signé » : exclusif ou simple, obligatoire ; et un prix de commercialisation —
//     celui qui est déjà enregistré, ou celui qu'on saisit s'il manque ;
//   • « À relancer » (mission 96) : un motif de relance, choisi dans la liste ; « Autre » se
//     précise d'une ligne. Le prix et la note libre restent facultatifs ;
//   • « Vendu ailleurs », « Retiré de la vente » : rien d'obligatoire.
// Sans le type et le prix d'un mandat signé, la bêta ne peut pas mesurer ce que le produit
// promet : combien de mandats, dont combien d'exclusifs, et à quel prix.

export const OUTCOME_REQUIRED_MESSAGE =
  'Choisissez une issue\u00a0: Mandat signé, À relancer, Vendu ailleurs ou Retiré de la vente.';
export const MANDATE_TYPE_REQUIRED_MESSAGE =
  'Mandat signé\u00a0: indiquez s’il est exclusif ou simple.';
export const PRICE_REQUIRED_MESSAGE = 'Mandat signé\u00a0: indiquez le prix de commercialisation.';
export const MOTIVE_REQUIRED_MESSAGE = 'À relancer\u00a0: choisissez un motif de relance.';
export const MOTIVE_DETAIL_REQUIRED_MESSAGE =
  'Motif «\u00a0Autre\u00a0»\u00a0: précisez-le en une ligne.';
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
  // Mission 96 — le motif de relance et sa précision ; null hors « à relancer ».
  motive: FollowUpMotive | null;
  motiveDetail: string | null;
  // Le type à écrire : celui du formulaire ; null hors mandat signé.
  mandateType: MandateType | null;
  // Le prix à écrire ; null = garder celui qui est enregistré.
  price: number | null;
};

export type DecisionCheck = { ok: true; value: ResolvedDecision } | { ok: false; error: string };

export function checkDecision(decision: ConclusionDecision, known: KnownConclusion): DecisionCheck {
  if (decision.outcome === 'follow_up') {
    if (decision.motive == null) {
      return { ok: false, error: MOTIVE_REQUIRED_MESSAGE };
    }
    if (decision.motive === 'other' && decision.motiveDetail == null) {
      return { ok: false, error: MOTIVE_DETAIL_REQUIRED_MESSAGE };
    }
  }
  if (decision.outcome !== 'signed') {
    const followUp = decision.outcome === 'follow_up';
    return {
      ok: true,
      value: {
        outcome: decision.outcome,
        reason: decision.reason,
        motive: followUp ? decision.motive : null,
        motiveDetail: followUp && decision.motive === 'other' ? decision.motiveDetail : null,
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
      motive: null,
      motiveDetail: null,
      mandateType: decision.mandateType,
      price: decision.price,
    },
  };
}
