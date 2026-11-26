import type { Tone } from '@/components/socle/tone';
import {
  dayLabel,
  lateLabel,
  readyBuyersArgument,
  readyBuyersCount,
} from '@/features/meeting-conclusion/services/suivi-step-labels';
import {
  sortDueTasks,
  taskLateDays,
  type SuiviTask,
  type SuiviTaskKind,
} from '@/features/meeting-conclusion/services/suivi-tasks';

// La refonte, lot E (maquettes REFONTE-7 et 8) — « À faire aujourd'hui », en tête de Vendeurs : une
// carte par VENDEUR (un dossier), avec ce qu'il y a à faire et son bouton. Ce sont les tâches du
// bloc « Vendeurs » d'« Aujourd'hui » (M130 A, M145 B), « Mes tâches », mêmes règles, mêmes gestes :
// la relance d'un vendeur à relancer, « Relancer plus tôt ? », le Point marché d'un mandat signé.
// Aucune règle nouvelle ; un dossier en préparation n'a pas de tâche du jour (la date du
// rendez-vous n'est pas en base) : il est sous « Tous mes vendeurs ». Pur.

export const SELLER_TASK_KINDS: readonly SuiviTaskKind[] = [
  'follow_up',
  'follow_up_early',
  'market_update',
];

// Ce que la ligne d'une tâche sait du dossier (le motif de relance, la signature du mandat).
export type SellerTaskContext = { motiveLabel: string | null; signedOn: string | null };

export type SellerTodayItem = {
  projectId: string;
  name: string;
  // Sa tâche du jour : le geste est celui d'« Aujourd'hui ».
  task: SuiviTask;
  // Ce qu'il y a à faire, sans redire son nom ; le retard se dit à part, en orange.
  what: string;
  late: string | null;
  tone: Tone;
  // Ses autres tâches du jour, dans l'ordre.
  others: { task: SuiviTask; what: string; late: string | null }[];
};

// Ce qu'il y a à faire, sans redire son nom (ni pronom : un nom de dossier ne dit ni le genre ni le
// nombre, M119) ; les dates comme « Aujourd'hui » les dit (« Mandat signé le 27/10 »).
export function sellerTaskWhat(task: SuiviTask, context: SellerTaskContext | undefined): string {
  switch (task.kind) {
    case 'follow_up':
      // Des acquéreurs prêts correspondent à son bien : c'est l'argument de la relance (M145).
      return task.readyBuyers
        ? `À relancer : ${readyBuyersArgument(task.readyBuyers, task.property?.propertyType)}`
        : ['À relancer', context?.motiveLabel ?? null].filter(Boolean).join(' · ');
    case 'follow_up_early': {
      const count = task.readyBuyers ?? 0;
      return [
        `Relancer plus tôt ? ${readyBuyersCount(count)} ${count > 1 ? 'correspondent' : 'correspond'}`,
        task.plannedOn ? `relance prévue le ${dayLabel(task.plannedOn)}` : null,
      ]
        .filter(Boolean)
        .join(' · ');
    }
    case 'market_update': {
      const since = task.lastPointOn
        ? `Dernier point le ${dayLabel(task.lastPointOn)}`
        : context?.signedOn
          ? `Mandat signé le ${dayLabel(context.signedOn)}`
          : 'Mandat signé';
      return `${since} · ${task.lastPointOn ? 'Point marché du mois' : 'premier Point marché'}`;
    }
    default:
      return '';
  }
}

// Le bouton d'une tâche, dans les mots de la maquette (REFONTE-7) : il ouvre la carte du Suivi sur
// son geste, comme sur « Aujourd'hui ».
export function sellerTaskButton(task: SuiviTask): string {
  switch (task.kind) {
    case 'follow_up':
      return 'Préparer la relance';
    case 'market_update':
      return 'Faire le point marché';
    default:
      return 'Relancer';
  }
}

// La teinte suit la tâche (maquettes REFONTE-7 et 8) : orange pour un retard, verte pour un mandat
// signé, la couleur de l'agence pour une relance.
export function sellerTaskTone(task: SuiviTask, lateDays: number): Tone {
  if (lateDays > 0) return 'watch';
  if (task.kind === 'market_update') return 'good';
  return 'plain';
}

// Une carte par vendeur : sa tâche la plus utile d'abord (l'ordre d'« Aujourd'hui »), les vendeurs
// dans l'ordre de leur première tâche.
export function sellersToday(
  tasks: readonly SuiviTask[],
  contextOf: (projectId: string) => SellerTaskContext | undefined,
  today: string,
): SellerTodayItem[] {
  const own = sortDueTasks(tasks.filter((task) => SELLER_TASK_KINDS.includes(task.kind)));
  const items = new Map<string, SellerTodayItem>();
  for (const task of own) {
    if (!task.projectId) continue;
    const lateDays = taskLateDays(task, today);
    const entry = {
      task,
      what: sellerTaskWhat(task, contextOf(task.projectId)),
      late: lateDays > 0 ? lateLabel(lateDays) : null,
    };
    const known = items.get(task.projectId);
    if (known) {
      known.others.push(entry);
      continue;
    }
    items.set(task.projectId, {
      projectId: task.projectId,
      name: task.sellerName.trim() || 'Vendeur',
      ...entry,
      tone: sellerTaskTone(task, lateDays),
      others: [],
    });
  }
  return [...items.values()];
}

// L'adresse d'un vendeur dans la liste (tablette, ordinateur) : son détail à droite.
export function sellerTodayHref(item: Pick<SellerTodayItem, 'projectId'>): string {
  return `/vendeurs?dossier=${item.projectId}`;
}

// Le vendeur du détail : celui de l'adresse, sinon le premier.
export function selectedSeller(
  items: readonly SellerTodayItem[],
  dossier: string | undefined,
): SellerTodayItem | null {
  return items.find((item) => item.projectId === dossier) ?? items[0] ?? null;
}

// Ce qui distingue une tâche d'une autre chez le même vendeur : sa sorte et son échéance. Pour la
// clé d'une ligne à l'écran, jamais son rang.
export function sellerTaskKey(task: SuiviTask): string {
  return [task.kind, task.projectId, task.dueOn].join('|');
}
