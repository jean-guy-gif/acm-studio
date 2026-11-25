import type { SuiviDossier } from '@/features/meeting-conclusion/queries/get-suivi-dossiers';
import type { FollowUpContact } from '@/features/meeting-conclusion/services/follow-up-contacts';
import type { SuiviTaskInput } from '@/features/meeting-conclusion/services/suivi-tasks';
import type { ProspectingStatus } from '@/features/prospecting/services/prospecting-status';

// Mission 130 — les entrées des tâches du jour, composées depuis ce que le Suivi lit déjà : les
// dossiers, leurs relances, leurs points marché, les cartes de Prospection et les demandes de
// visite. Une fonction, pour la page comme pour le compteur du menu. Pur.

// Une carte de Prospection : son statut, son opposition, les dossiers dont elle est un concurrent.
export type TaskCard = {
  row: { status: ProspectingStatus; opposedOn: string | null; addressAt?: string | null };
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
  // La refonte, lot B — l'acquéreur de la demande, pour sa carte « à faire aujourd'hui ».
  buyerId?: string;
  // Le jour et l'heure confirmés de la visite (« Confirmer la visite », M142), s'il y en a.
  scheduledAt?: string | null;
  // Mission 139 — le compte rendu de la visite faite : ce qui a déplu (« prix » compte un retour).
  report?: { disliked: readonly string[] } | null;
};

// Ce que la frise d'un mandat dit de ses concurrents (hors « Ne plus solliciter », M98).
export type ProspectingCount = {
  total: number;
  ready: number;
  toConfirm: number;
  done: number;
  declined: number;
  // La plus ancienne adresse d'une carte prête : depuis quand le démarchage attend.
  readySince: string | null;
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
        readySince: null,
      };
      count.total += 1;
      if (card.row.status === 'ready') {
        count.ready += 1;
        const at = card.row.addressAt ?? null;
        if (at && (count.readySince == null || at < count.readySince)) count.readySince = at;
      }
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
// Lancement, mission 7 — une visite confirmée dont l'heure est passée n'est plus à organiser : elle
// a eu lieu, c'est son compte rendu qui est à saisir (`visitReportTasks`) ; sans `now`, comme avant.
export function pendingVisitsByProject(visits: TaskVisit[], now?: Date): Map<string, TaskVisit[]> {
  const byProject = new Map<string, TaskVisit[]>();
  for (const visit of visits) {
    if (visit.itemSource !== 'project' || visit.cancelledAt || visit.visitedAt) continue;
    if (visit.buyerArchived) continue;
    if (now && visit.scheduledAt && Date.parse(visit.scheduledAt) <= now.getTime()) continue;
    byProject.set(visit.itemReference, [...(byProject.get(visit.itemReference) ?? []), visit]);
  }
  return byProject;
}

// Les visites demandées sur un mandat, faites ou non (annulées exclues) : la frise les compte.
// Mission 139 — et les retours sur le prix : « 3 visites · 2 retours sur le prix ».
export function visitCounts(
  visits: TaskVisit[],
): Map<string, { done: number; pending: number; priceReturns: number }> {
  const counts = new Map<string, { done: number; pending: number; priceReturns: number }>();
  for (const visit of visits) {
    if (visit.itemSource !== 'project' || visit.cancelledAt) continue;
    const count = counts.get(visit.itemReference) ?? { done: 0, pending: 0, priceReturns: 0 };
    if (visit.visitedAt) {
      count.done += 1;
      if (visit.report?.disliked.includes('price')) count.priceReturns += 1;
    } else if (!visit.buyerArchived) count.pending += 1;
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
  // Mission 145 — les cartes déjà dans « Démarcher : N acquéreurs prêts correspondent » : la ligne
  // « Démarcher les concurrents » ne les compte plus.
  alerted?: ReadonlySet<TaskCard['row']>;
  // Lancement, mission 7 — l'instant : une visite confirmée déjà passée n'est plus à organiser.
  now?: Date;
}): SuiviTaskInput[] {
  const prospecting = prospectingCounts(
    input.alerted ? input.cards.filter((card) => !input.alerted!.has(card.row)) : input.cards,
  );
  const competitors = competitorCounts(input.cards);
  const visits = pendingVisitsByProject(input.visits, input.now);
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
    readySince: prospecting.get(project.id)?.readySince ?? null,
    visits: (visits.get(project.id) ?? []).map((visit) => ({
      requestedAt: visit.requestedAt,
      buyerName: visit.buyerName,
      buyerId: visit.buyerId,
    })),
  }));
}
