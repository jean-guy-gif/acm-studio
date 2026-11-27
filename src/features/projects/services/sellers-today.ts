import type { Tone } from '@/components/socle/tone';
import {
  dayLabel,
  lateLabel,
  readyBuyersArgument,
  readyBuyersCount,
} from '@/features/meeting-conclusion/services/suivi-step-labels';
import { taskLateDays, type SuiviTask } from '@/features/meeting-conclusion/services/suivi-tasks';
import type { TodayBoard } from '@/features/today/services/today-board';

// La refonte, lot E (maquettes REFONTE-7 et 8) — « À faire aujourd'hui », en tête de Vendeurs : une
// carte par VENDEUR (un dossier), avec ce qu'il y a à faire et son bouton. Ce sont les tâches du
// bloc « Vendeurs » d'« Aujourd'hui » (M130 A, M145 B), « Mes tâches », mêmes règles, mêmes gestes :
// la relance d'un vendeur à relancer, « Relancer plus tôt ? », le Point marché d'un mandat signé.
// Aucune règle nouvelle ; un dossier en préparation n'a pas de tâche du jour (la date du
// rendez-vous n'est pas en base) : il a sa carte « Préparation en cours », plus bas, à part des
// tâches (remarques de Jean-Guy, 26/11). Pur.

// Ce que la ligne d'une tâche sait du dossier (le motif de relance, la signature du mandat).
export type SellerTaskContext = { motiveLabel: string | null; signedOn: string | null };

export type SellerTodayItem = {
  projectId: string;
  name: string;
  // Sa tâche du jour : le geste est celui d'« Aujourd'hui ». `null` : un dossier en préparation,
  // dont le bouton mène à l'étape à faire (`href`).
  task: SuiviTask | null;
  href: string | null;
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
// Lot F (Jean-Guy, 26/11) — un geste, un nom : « Relancer plus tôt ? » ouvre la même relance.
export function sellerTaskButton(task: SuiviTask): string {
  switch (task.kind) {
    case 'market_update':
      return 'Faire le point marché';
    default:
      return 'Préparer la relance';
  }
}

// La teinte suit la tâche (maquettes REFONTE-7 et 8) : orange pour un retard, verte pour un mandat
// signé, la couleur de l'agence pour une relance.
export function sellerTaskTone(task: SuiviTask, lateDays: number): Tone {
  if (lateDays > 0) return 'watch';
  if (task.kind === 'market_update') return 'good';
  return 'plain';
}

// Une carte par vendeur : les tâches du bloc « Vendeurs » d'« Aujourd'hui », dans SON ordre — la
// relance qui porte l'argument (des acquéreurs prêts) en tête (M145 B), puis les autres —, les
// vendeurs dans l'ordre de leur première tâche, sa tâche la plus utile d'abord.
export function sellersToday(
  board: Pick<TodayBoard, 'blocks'>,
  contextOf: (projectId: string) => SellerTaskContext | undefined,
  today: string,
): SellerTodayItem[] {
  const tasks =
    board.blocks.find((block) => block.key === 'sellers')?.lines.flatMap((line) => line.tasks) ??
    [];
  const items = new Map<string, SellerTodayItem>();
  for (const task of tasks) {
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
      href: null,
      ...entry,
      tone: sellerTaskTone(task, lateDays),
      others: [],
    });
  }
  return [...items.values()];
}

// La refonte, remarques de Jean-Guy (26/11) — un dossier en préparation a sa carte dans « à faire
// aujourd'hui » : « Préparation en cours », et « Reprendre la préparation », qui mène à l'étape à
// faire (M97, M110). Sans la date du rendez-vous (elle n'est pas en base), seulement les dossiers
// en préparation modifiés dans les 14 derniers jours, ceux de la vue (« Mes dossiers » : le
// conseiller en est le titulaire, M145 B), jamais un dossier d'exemple (M97) ; le plus récemment
// modifié d'abord, après les tâches du jour. Ce ne sont pas des tâches d'« Aujourd'hui » : le
// sous-titre les compte à part.
export const PREPARATION_RECENT_DAYS = 14;
export const PREPARATION_WHAT = 'Préparation en cours';
export const PREPARATION_BUTTON = 'Reprendre la préparation';

export type PreparationDraft = {
  projectId: string;
  name: string;
  status: string;
  updatedAt: string;
  advisorId: string | null;
  isExample: boolean;
  // L'étape à faire du dossier (`nextDossierAction`).
  href: string;
};

export function preparationItems(
  drafts: readonly PreparationDraft[],
  options: { scope: 'mine' | 'agency'; advisorId: string; now: Date; skip?: readonly string[] },
): SellerTodayItem[] {
  const since = options.now.getTime() - PREPARATION_RECENT_DAYS * 24 * 60 * 60 * 1000;
  return drafts
    .filter(
      (draft) =>
        draft.status === 'draft' &&
        !draft.isExample &&
        (options.scope === 'agency' || draft.advisorId === options.advisorId) &&
        Date.parse(draft.updatedAt) >= since &&
        !(options.skip ?? []).includes(draft.projectId),
    )
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .map((draft) => ({
      projectId: draft.projectId,
      name: draft.name.trim() || 'Vendeur',
      task: null,
      href: draft.href,
      what: PREPARATION_WHAT,
      late: null,
      tone: 'plain' as const,
      others: [],
    }));
}

// « 2 choses à faire aujourd'hui · 1 préparation en cours » : les choses à faire sont les tâches
// d'« Aujourd'hui » ; les préparations se comptent à part.
export function sellersTodayCount(things: number, preparations: number): string {
  const prepared =
    preparations > 0
      ? // Le chiffre ne se sépare jamais de son mot en fin de ligne (une espace insécable).
        `${preparations}\u00a0${preparations > 1 ? 'préparations' : 'préparation'} en cours`
      : null;
  if (things === 0 && prepared) return prepared;
  const due =
    things === 0
      ? 'Rien à faire aujourd’hui'
      : `${things} ${things > 1 ? 'choses' : 'chose'} à faire aujourd’hui`;
  return prepared ? `${due} · ${prepared}` : due;
}

// La refonte, lot F (Jean-Guy, 26/11) — « N choses à faire » sur Vendeurs : sa part des tâches
// d'« Aujourd'hui » (le bloc « Vendeurs »), comptée comme elle.
export function sellerTaskCount(board: Pick<TodayBoard, 'blocks'>): number {
  return (
    board.blocks.find((block) => block.key === 'sellers')?.lines.flatMap((line) => line.tasks)
      .length ?? 0
  );
}

// L'adresse d'un vendeur dans la liste (tablette, ordinateur) : son détail à droite.
export function sellerTodayHref(item: Pick<SellerTodayItem, 'projectId'>): string {
  return `/vendeurs?vendeur=${item.projectId}`;
}

// Le vendeur du détail : celui de l'adresse, sinon le premier.
export function selectedSeller(
  items: readonly SellerTodayItem[],
  projectId: string | undefined,
): SellerTodayItem | null {
  return items.find((item) => item.projectId === projectId) ?? items[0] ?? null;
}

// Ce qui distingue une tâche d'une autre chez le même vendeur : sa sorte et son échéance. Pour la
// clé d'une ligne à l'écran, jamais son rang.
export function sellerTaskKey(task: SuiviTask): string {
  return [task.kind, task.projectId, task.dueOn].join('|');
}
