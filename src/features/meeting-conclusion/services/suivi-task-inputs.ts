import type { SuiviDossier } from '@/features/meeting-conclusion/queries/get-suivi-dossiers';
import type { FollowUpContact } from '@/features/meeting-conclusion/services/follow-up-contacts';
import type { SuiviTaskInput } from '@/features/meeting-conclusion/services/suivi-tasks';
import type { ProspectingStatus } from '@/features/prospecting/services/prospecting-status';

// Mission 130 — les entrées des tâches du jour, composées depuis ce que le Suivi lit déjà : les
// dossiers, leurs relances, leurs points marché, les cartes de Prospection et les demandes de
// visite. Une fonction, pour la page comme pour le compteur du menu. Pur.

// Une carte de Prospection : son statut, son opposition, les dossiers dont elle est un concurrent.
export type TaskCard = {
  row: { status: ProspectingStatus; opposedOn: string | null };
  sellers: { projectId: string }[];
};

// Une demande de visite, telle que la page Visites la lit (M119).
export type TaskVisit = {
  itemSource: string;
  itemReference: string;
  requestedAt: string;
  cancelledAt: string | null;
  visitedAt: string | null;
  buyerArchived: boolean;
  buyerName: string;
};

// Ce que la frise d'un mandat dit de ses concurrents (hors « Ne plus solliciter », M98).
export type ProspectingCount = {
  total: number;
  ready: number;
  toConfirm: number;
  done: number;
  declined: number;
};

const DONE: ProspectingStatus[] = ['handed', 'meeting', 'mandate', 'collaboration', 'declined'];

export function prospectingCounts(cards: TaskCard[]): Map<string, ProspectingCount> {
  const counts = new Map<string, ProspectingCount>();
  for (const card of cards) {
    if (card.row.opposedOn != null) continue;
    for (const seller of card.sellers) {
      const count = counts.get(seller.projectId) ?? {
        total: 0,
        ready: 0,
        toConfirm: 0,
        done: 0,
        declined: 0,
      };
      count.total += 1;
      if (card.row.status === 'ready') count.ready += 1;
      if (card.row.status === 'to_confirm') count.toConfirm += 1;
      if (DONE.includes(card.row.status)) count.done += 1;
      if (card.row.status === 'declined') count.declined += 1;
      counts.set(seller.projectId, count);
    }
  }
  return counts;
}

// Les concurrents d'un mandat, opposés compris : un Point marché les relit tous.
export function competitorCounts(cards: TaskCard[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const card of cards) {
    for (const seller of card.sellers) {
      counts.set(seller.projectId, (counts.get(seller.projectId) ?? 0) + 1);
    }
  }
  return counts;
}

// Les visites à organiser sur un mandat de l'agence : vivantes, d'un acquéreur non archivé.
export function pendingVisitsByProject(visits: TaskVisit[]): Map<string, TaskVisit[]> {
  const byProject = new Map<string, TaskVisit[]>();
  for (const visit of visits) {
    if (visit.itemSource !== 'project' || visit.cancelledAt || visit.visitedAt) continue;
    if (visit.buyerArchived) continue;
    byProject.set(visit.itemReference, [...(byProject.get(visit.itemReference) ?? []), visit]);
  }
  return byProject;
}

// Les visites demandées sur un mandat, faites ou non (annulées exclues) : la frise les compte.
export function visitCounts(visits: TaskVisit[]): Map<string, { done: number; pending: number }> {
  const counts = new Map<string, { done: number; pending: number }>();
  for (const visit of visits) {
    if (visit.itemSource !== 'project' || visit.cancelledAt) continue;
    const count = counts.get(visit.itemReference) ?? { done: 0, pending: 0 };
    if (visit.visitedAt) count.done += 1;
    else if (!visit.buyerArchived) count.pending += 1;
    counts.set(visit.itemReference, count);
  }
  return counts;
}

export function suiviTaskInputs(input: {
  dossiers: SuiviDossier[];
  contacts: Map<string, Pick<FollowUpContact, 'contactedAt' | 'nextFollowUpOn'>[]>;
  lastPoints: Map<string, string>;
  cards: TaskCard[];
  visits: TaskVisit[];
  // Les points n'ont pas pu être lus : aucune tâche Point marché.
  pointsUnknown?: boolean;
}): SuiviTaskInput[] {
  const prospecting = prospectingCounts(input.cards);
  const competitors = competitorCounts(input.cards);
  const visits = pendingVisitsByProject(input.visits);
  return input.dossiers.map(({ project, conclusion }) => ({
    projectId: project.id,
    sellerName: project.seller_name ?? 'Dossier vendeur',
    outcome: conclusion?.outcome ?? null,
    isExample: project.is_example === true,
    concludedAt: conclusion?.concludedAt ?? null,
    signedAt: conclusion?.signedAt ?? null,
    firstFollowUpOn: conclusion?.nextFollowUpOn ?? null,
    contacts: input.contacts.get(project.id) ?? [],
    lastPointAt: input.lastPoints.get(project.id) ?? null,
    pointsUnknown: input.pointsUnknown === true,
    competitorCount: competitors.get(project.id) ?? 0,
    readyCount: prospecting.get(project.id)?.ready ?? 0,
    visits: (visits.get(project.id) ?? []).map((visit) => ({
      requestedAt: visit.requestedAt,
      buyerName: visit.buyerName,
    })),
  }));
}
