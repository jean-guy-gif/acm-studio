import type { ProspectingStep } from '@/features/competitor-mandate/services/mandate-columns';
import type { VisitLetterState } from '@/features/buyer-prospecting/types';
import {
  shortDate,
  type ProspectingStatus,
} from '@/features/prospecting/services/prospecting-status';

// Mission 120 — sur la visite (Visites et fiche), l'état du courrier relu sur sa carte de
// Prospection : « Courrier prêt », « Remis le … », « Collaboration obtenue », « Mandat rentré ».
// Pur. Quand la collaboration est obtenue ou le mandat rentré, la visite redevient « À planifier »
// sans autre geste ; avant, elle attend le propriétaire ou le confrère (décision de Jean-Guy,
// 26/10 : un état calculé à l'affichage, aucune colonne).
export function visitLetterState(
  card: {
    status: ProspectingStatus;
    step: ProspectingStep;
    handedAt: string | null;
    meetingAt: string | null;
    opposedOn: string | null;
    // Mission 120 B — le confrère a refusé : le bien est repassé en courrier au propriétaire.
    collaborationDeclinedAt?: string | null;
  } | null,
): VisitLetterState {
  if (card == null) {
    return { kind: 'none' };
  }
  if (card.opposedOn != null) {
    return { kind: 'closed', label: 'Ne plus solliciter' };
  }
  const colleague = card.step === 'colleague';
  const declined = card.collaborationDeclinedAt != null && !colleague;
  if (declined && (card.status === 'to_confirm' || card.status === 'ready')) {
    return {
      kind: card.status === 'ready' ? 'ready' : 'address',
      label: 'Collaboration refusée : courrier au propriétaire',
    };
  }
  switch (card.status) {
    case 'to_confirm':
      return colleague
        ? { kind: 'ready', label: 'Dossier prêt' }
        : { kind: 'address', label: 'Adresse à confirmer' };
    case 'ready':
      return { kind: 'ready', label: colleague ? 'Dossier prêt' : 'Courrier prêt' };
    case 'handed':
      return {
        kind: 'handed',
        label: `${colleague ? 'Contacté' : 'Remis'} le ${shortDate(card.handedAt) ?? '—'}`,
      };
    case 'meeting':
      return {
        kind: 'waiting',
        label: `Rendez-vous obtenu${card.meetingAt ? ` le ${shortDate(card.meetingAt)}` : ''}`,
      };
    case 'mandate':
      return { kind: 'done', label: 'Mandat rentré' };
    case 'collaboration':
      return { kind: 'done', label: 'Collaboration obtenue' };
    case 'declined':
      return { kind: 'closed', label: 'Pas intéressé' };
  }
}

// Le libellé de la visite elle-même : « À planifier » quand rien n'attend plus (pas de courrier
// à faire, ou collaboration obtenue, ou mandat rentré) ; sinon l'attente, nommée.
export function visitWaitingLabel(
  state: VisitLetterState,
  step: ProspectingStep | null,
): string | null {
  if (state.kind === 'none' || state.kind === 'done' || state.kind === 'closed') {
    return null;
  }
  return step === 'colleague' ? 'En attente du confrère' : 'En attente du propriétaire';
}
