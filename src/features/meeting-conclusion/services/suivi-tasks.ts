import {
  FOLLOW_UP_DUE_AFTER_DAYS,
  parisDay,
  sortContacts,
  type FollowUpContact,
} from '@/features/meeting-conclusion/services/follow-up-contacts';
import type { ConclusionOutcome } from '@/features/meeting-conclusion/types';

// Mission 130 — « Une seule prochaine étape » : ce que le Suivi demande au conseiller, daté. Une
// tâche est DUE le jour de son échéance et après (en retard) ; la liste « À faire aujourd'hui »
// ne montre que les tâches dues, la plus ancienne d'abord ; la carte d'un vendeur montre sa plus
// ancienne étape, due ou à venir. Pur : tout se lit déjà en base, aucune donnée nouvelle.
//   • relancer un vendeur à relancer, à sa date de prochaine relance (M105, M108), sinon 7 jours
//     après le dernier contact (M96) ;
//   • faire le Point marché d'un mandat signé : le premier un mois après la signature (la date du
//     rendez-vous pour un mandat d'avant la M90), puis un mois après le dernier point (décision de
//     Jean-Guy, 05/11 : mensuel) ; un mandat sans concurrent retenu n'a rien à relire ;
//   • démarcher les concurrents prêts d'un mandat signé (cartes « Prêt à envoyer », M86) : dû dès
//     qu'une carte est prête, jamais « en retard » ;
//   • organiser une visite qu'un acquéreur a demandée sur un mandat de l'agence (M119) : elle n'a
//     pas de date prévue, elle est due dès qu'elle existe et ne se dit jamais « en retard ».

// Mission 132 — `buyer_recontact` : un acquéreur sans échange depuis 30 jours, « Reprendre contact
// avec la famille Keller » ; il ne tient à aucun dossier vendeur (`buyerId`, `projectId` vide).
// Mission 133 — `propose_buyers` : un mandat signé appelle ses acquéreurs prêts, « Proposer le bien
// de M. Bernard à 7 acquéreurs prêts », due à la signature, jamais en retard ; elle compte les
// acquéreurs prêts qui correspondent et n'ont pas encore reçu ce bien dans une sélection depuis la
// signature, et disparaît à zéro (aucun état en base).
export type SuiviTaskKind =
  'visit' | 'propose_buyers' | 'market_update' | 'prospect' | 'follow_up' | 'buyer_recontact';

// L'ordre des tâches dues : par valeur, puis par ancienneté (décision de Jean-Guy, 05/11) —
// relancer un vendeur, organiser une visite, proposer un mandat à ses acquéreurs (M133), faire le
// Point marché, reprendre contact avec un acquéreur (M132), démarcher.
const KIND_ORDER: Record<SuiviTaskKind, number> = {
  follow_up: 0,
  visit: 1,
  propose_buyers: 2,
  market_update: 3,
  buyer_recontact: 4,
  prospect: 5,
};

export type SuiviTask = {
  kind: SuiviTaskKind;
  projectId: string;
  sellerName: string;
  // Le jour d'échéance, à Paris (AAAA-MM-JJ).
  dueOn: string;
  // Relance : la date venait-elle d'une relance ou de la conclusion (sinon, la règle des 7 jours) ?
  datePosed?: boolean;
  // Point marché : le dernier point (AAAA-MM-JJ), null pour le premier.
  lastPointOn?: string | null;
  // Démarchage : le nombre de concurrents prêts ; visites : le nombre de demandes à organiser.
  count?: number;
  // Démarchage : le jour où la plus ancienne adresse prête est apparue, s'il est connu (une
  // adresse d'avant la M102 n'en a pas : rien n'est déduit, M47).
  readyOn?: string | null;
  // Visite : l'acquéreur de la plus ancienne demande. Reprendre contact : l'acquéreur.
  buyerName?: string | null;
  // Mission 132 — reprendre contact : la fiche acquéreur, et les jours sans échange.
  buyerId?: string;
  sinceDays?: number;
};

export type SuiviTaskInput = {
  projectId: string;
  sellerName: string;
  outcome: ConclusionOutcome | null;
  isExample: boolean;
  concludedAt: string | null;
  signedAt: string | null;
  // La date de première relance posée à la conclusion (M108).
  firstFollowUpOn: string | null;
  contacts: Pick<FollowUpContact, 'contactedAt' | 'nextFollowUpOn'>[];
  // Le plus récent point marché (ISO), null s'il n'y en a pas.
  lastPointAt: string | null;
  // Les points n'ont pas pu être lus : aucune tâche Point marché n'est déduite (une lecture en
  // échec n'est jamais lue comme « aucun point », M98).
  pointsUnknown?: boolean;
  // Les concurrents retenus du mandat (hors « Ne plus solliciter »), et ceux prêts à envoyer.
  competitorCount: number;
  readyCount: number;
  // La plus ancienne adresse prête (ISO) ; sinon le démarchage date de la signature.
  readySince?: string | null;
  // Les demandes de visite vivantes (ni annulées ni faites, acquéreur non archivé) sur ce mandat.
  visits: { requestedAt: string; buyerName: string | null }[];
  // Mission 133 — les acquéreurs prêts qui correspondent et n'ont pas encore reçu ce bien.
  buyersToPropose?: number;
};

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

// AAAA-MM-JJ + n jours.
export function addDays(day: string, days: number): string {
  const [, y, m, d] = DAY.exec(day) ?? [];
  return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d) + days)).toISOString().slice(0, 10);
}

// AAAA-MM-JJ + 1 mois, le même jour du mois ; le 31 donne le dernier jour du mois suivant.
export function addOneMonth(day: string): string {
  const [, y, m, d] = DAY.exec(day) ?? [];
  const year = Number(y);
  const month = Number(m); // 1 à 12 ; le mois suivant est l'index `month` en base 0
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(Number(d), lastDay))).toISOString().slice(0, 10);
}

// Le nombre de jours de `from` à `to` (AAAA-MM-JJ), positif si `to` est après.
export function daysBetween(from: string, to: string): number {
  const time = (day: string) => {
    const [, y, m, d] = DAY.exec(day) ?? [];
    return Date.UTC(Number(y), Number(m) - 1, Number(d));
  };
  return Math.round((time(to) - time(from)) / 86_400_000);
}

const dayOf = (iso: string | null | undefined): string | null => {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : parisDay(date);
};

// Mission 130 — le jour où le vendeur est à relancer : la date posée avec la dernière relance
// (M105) ; avant toute relance, celle posée à la conclusion (M108) ; sinon, le lendemain du
// septième jour après le dernier contact (M96 : « au-delà de 7 jours »).
export function followUpDueOn(
  concludedAt: string | null,
  contacts: Pick<FollowUpContact, 'contactedAt' | 'nextFollowUpOn'>[],
  firstFollowUpOn: string | null,
): { day: string; posed: boolean } | null {
  const latest = sortContacts(contacts)[0];
  if (latest?.nextFollowUpOn) return { day: latest.nextFollowUpOn, posed: true };
  if (!latest && firstFollowUpOn) return { day: firstFollowUpOn, posed: true };
  const last = dayOf(latest?.contactedAt ?? concludedAt);
  return last ? { day: addDays(last, FOLLOW_UP_DUE_AFTER_DAYS + 1), posed: false } : null;
}

// Mission 130 — le prochain Point marché d'un mandat signé : un mois après la signature (la date
// du rendez-vous avant la M90), puis un mois après le dernier point.
export function nextMarketUpdateOn(
  signedAt: string | null,
  concludedAt: string | null,
  lastPointAt: string | null,
): string | null {
  const base = dayOf(lastPointAt) ?? dayOf(signedAt) ?? dayOf(concludedAt);
  return base ? addOneMonth(base) : null;
}

// Toutes les étapes d'un dossier, dues ou à venir, de la plus ancienne à la plus récente.
export function dossierTasks(input: SuiviTaskInput): SuiviTask[] {
  const base = { projectId: input.projectId, sellerName: input.sellerName };
  const tasks: SuiviTask[] = [];
  if (input.outcome === 'follow_up') {
    const due = followUpDueOn(input.concludedAt, input.contacts, input.firstFollowUpOn);
    if (due) tasks.push({ ...base, kind: 'follow_up', dueOn: due.day, datePosed: due.posed });
  }
  if (input.outcome === 'signed') {
    const signedDay = dayOf(input.signedAt) ?? dayOf(input.concludedAt);
    if (input.competitorCount > 0 && !input.pointsUnknown) {
      const next = nextMarketUpdateOn(input.signedAt, input.concludedAt, input.lastPointAt);
      if (next) {
        tasks.push({
          ...base,
          kind: 'market_update',
          dueOn: next,
          lastPointOn: dayOf(input.lastPointAt),
        });
      }
    }
    if (input.readyCount > 0 && signedDay) {
      // Dû au plus tôt à la signature : une adresse trouvée avant ne range pas la tâche plus tôt.
      const readyOn = dayOf(input.readySince);
      tasks.push({
        ...base,
        kind: 'prospect',
        dueOn: readyOn && readyOn > signedDay ? readyOn : signedDay,
        count: input.readyCount,
        readyOn,
      });
    }
    if ((input.buyersToPropose ?? 0) > 0 && signedDay) {
      tasks.push({
        ...base,
        kind: 'propose_buyers',
        dueOn: signedDay,
        count: input.buyersToPropose,
      });
    }
    const visits = [...input.visits].sort((a, b) => a.requestedAt.localeCompare(b.requestedAt));
    const first = visits[0];
    const firstDay = dayOf(first?.requestedAt);
    if (first && firstDay) {
      tasks.push({
        ...base,
        kind: 'visit',
        dueOn: firstDay,
        count: visits.length,
        buyerName: first.buyerName,
      });
    }
  }
  return sortTasks(tasks);
}

// Par date d'échéance (la plus proche d'abord) : pour les tâches à venir.
export function sortTasks(tasks: SuiviTask[]): SuiviTask[] {
  return [...tasks].sort(
    (a, b) => a.dueOn.localeCompare(b.dueOn) || KIND_ORDER[a.kind] - KIND_ORDER[b.kind],
  );
}

// Les tâches dues : par valeur, puis la plus ancienne d'abord.
export function sortDueTasks(tasks: SuiviTask[]): SuiviTask[] {
  return [...tasks].sort(
    (a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.dueOn.localeCompare(b.dueOn),
  );
}

export function isTaskDue(task: SuiviTask, today: string): boolean {
  return task.dueOn <= today;
}

// Le retard en jours (0 : aujourd'hui) ; un démarchage ou une visite n'a pas de date prévue : dus
// dès qu'ils existent, jamais en retard.
export function taskLateDays(task: SuiviTask, today: string): number {
  return task.kind === 'visit' || task.kind === 'prospect' || task.kind === 'propose_buyers'
    ? 0
    : Math.max(0, daysBetween(task.dueOn, today));
}

// La prochaine étape d'une carte : la plus ancienne, due ou à venir ; null pour un dossier clos.
// La prochaine étape d'une carte : sa tâche due de plus grande valeur, sinon la plus proche à venir.
export function nextStep(tasks: SuiviTask[], today: string): SuiviTask | null {
  const dues = sortDueTasks(tasks.filter((task) => isTaskDue(task, today)));
  return dues[0] ?? sortTasks(tasks)[0] ?? null;
}

export type SuiviTaskList = {
  // Les tâches dues aujourd'hui ou en retard, par valeur puis la plus ancienne d'abord.
  dues: SuiviTask[];
  // Sans tâche due : la prochaine tâche à venir, s'il y en a une.
  next: SuiviTask | null;
};

// « À faire aujourd'hui » : toute l'agence (M59), sans le dossier d'exemple (M97). Mission 132 —
// plus les tâches des acquéreurs (`buyerTasks`), qui ne tiennent à aucun dossier.
export function buildSuiviTaskList(
  inputs: SuiviTaskInput[],
  now: Date,
  buyerTasks: SuiviTask[] = [],
): SuiviTaskList {
  const today = parisDay(now);
  const all = sortTasks([
    ...inputs.filter((input) => !input.isExample).flatMap(dossierTasks),
    ...buyerTasks,
  ]);
  const dues = sortDueTasks(all.filter((task) => isTaskDue(task, today)));
  return { dues, next: dues.length > 0 ? null : (all[0] ?? null) };
}
