// Mission 53 — l'issue d'un rendez-vous et ses montants figés.

export type ConclusionOutcome = 'signed' | 'follow_up';

// Les QUATRE montants, figés à l'instant de la conclusion (copies, jamais recalculées).
// Nommés pour qu'un non-initié les distingue — « conseiller » ≠ « conseillé ».
export type ConclusionAmounts = {
  marketComputed: number | null; // ① le marché CALCULÉ à partir des concurrents
  advisorAnalysis: number | null; // ② l'analyse comparative SAISIE par le conseiller
  advisorPrice: number | null; // ③ le prix conseillé VALIDÉ au positionnement
  commercializationPrice: number | null; // ④ le prix de commercialisation CONVENU
};

export type MeetingConclusion = ConclusionAmounts & {
  outcome: ConclusionOutcome | null;
  followUpReason: string | null;
  concludedAt: string | null;
};
