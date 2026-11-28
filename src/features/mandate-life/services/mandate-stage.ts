import type { ConclusionOutcome } from '@/features/meeting-conclusion/types';
import type { MandateLife, MandateOffer, MandateStage } from '@/features/mandate-life/types';

// Lot C — l'étape d'un mandat, d'après ses faits : la vente notée, la fin sans vente, le compromis
// noté, puis l'offre acceptée encore tenue (« L'offre est tombée », M138, la rend : rien n'est
// écrit). Hors d'un mandat signé, aucune vie du mandat (les faits restent, ignorés, M54). Les offres
// illisibles laissent l'étape inconnue : jamais lues comme « aucune offre » (M98). Pur.
export function mandateStage(input: {
  outcome: ConclusionOutcome | null;
  life: MandateLife;
  offer: MandateOffer | null | 'unknown';
}): MandateStage | 'unknown' | null {
  if (input.outcome !== 'signed') return null;
  if (input.life.deedSignedOn) return 'sold';
  if (input.life.endedOn) return 'ended';
  if (input.life.compromiseSignedOn) return 'under_compromise';
  if (input.offer === 'unknown') return 'unknown';
  return input.offer ? 'offer_accepted' : 'signed';
}

// Retouche 3 de Jean-Guy (28/11) — le Point marché mensuel ne court qu'au stade « Mandat signé » :
// il s'arrête dès l'offre acceptée, et reprend si l'offre tombe. Une étape inconnue n'en fait
// naître aucun.
export function marketUpdateRuns(stage: MandateStage | 'unknown' | null): boolean {
  return stage === 'signed';
}
