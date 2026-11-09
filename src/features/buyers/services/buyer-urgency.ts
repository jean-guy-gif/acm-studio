import { daysBetween } from '@/features/meeting-conclusion/services/suivi-tasks';
import { lateLabel } from '@/features/meeting-conclusion/services/suivi-step-labels';

// Mission 146 (partie B, I4, planche B2) — la liste des acquéreurs, triée par urgence, dans les
// deux vues (« Mes fiches », « Toute l'agence ») : la vente en cours en tête (une offre acceptée à
// traiter, M138, M143) ; puis les fiches en retard — les échéances d'« Aujourd'hui » : la relance
// d'une sélection sans réponse (M135), le contact à reprendre à 30 jours (M132) —, la plus en
// retard d'abord ; puis la prochaine étape la plus ancienne (remplace M117, « les miennes en
// tête »). Pur.

export type BuyerUrgencyInput = {
  // La vente tient (une offre acceptée, l'acquéreur « Sous offre », `saleInProgress`), ou la
  // réponse du vendeur à son offre attend encore le conseiller (M138).
  sale: boolean;
  // Le jour (Paris) où la relance de sa sélection est due (`relaunchDue`), s'il y en a une.
  relaunchDueOn: string | null;
  // Le jour (Paris) où il est à recontacter, seulement quand il l'est (`buyerReadiness`).
  recontactOn: string | null;
  // Le jour où sa prochaine étape a commencé (ISO), s'il est connu.
  since: string | null;
  updatedAt: string;
};

export type BuyerUrgency = {
  rank: 0 | 1 | 2;
  // L'échéance due : la relance l'emporte sur « Reprendre contact », comme dans « Aujourd'hui ».
  due: { reason: 'relaunch' | 'recontact'; dueOn: string; lateDays: number } | null;
};

export function buyerUrgency(input: BuyerUrgencyInput, today: string): BuyerUrgency {
  const dueOf = (reason: 'relaunch' | 'recontact', dueOn: string | null) =>
    dueOn != null && dueOn <= today
      ? { reason, dueOn, lateDays: Math.max(0, daysBetween(dueOn, today)) }
      : null;
  const due = dueOf('relaunch', input.relaunchDueOn) ?? dueOf('recontact', input.recontactOn);
  return { rank: input.sale ? 0 : due ? 1 : 2, due };
}

export function compareBuyerUrgency(
  a: BuyerUrgencyInput & { urgency: BuyerUrgency },
  b: BuyerUrgencyInput & { urgency: BuyerUrgency },
): number {
  if (a.urgency.rank !== b.urgency.rank) return a.urgency.rank - b.urgency.rank;
  if (a.urgency.due && b.urgency.due && a.urgency.due.dueOn !== b.urgency.due.dueOn) {
    return a.urgency.due.dueOn.localeCompare(b.urgency.due.dueOn);
  }
  if (a.since !== b.since) {
    if (a.since == null) return 1;
    if (b.since == null) return -1;
    return a.since.localeCompare(b.since);
  }
  return b.updatedAt.localeCompare(a.updatedAt);
}

// Ce que la ligne dit de l'échéance, en orange : « en retard d'un jour », « aujourd'hui » ; pour un
// contact à reprendre, qui n'est pas la prochaine étape, son nom d'abord.
export function urgencyLabel(due: BuyerUrgency['due'], nextTitle: string): string | null {
  if (!due) return null;
  const when = due.lateDays > 0 ? lateLabel(due.lateDays) : 'aujourd’hui';
  if (due.reason === 'relaunch') {
    return nextTitle === 'Relancer sa réponse' ? when : `relance ${when}`;
  }
  return `contact à reprendre ${when}`;
}
