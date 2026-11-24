import {
  sortDueTasks,
  taskLateDays,
  type SuiviTask,
  type SuiviTaskKind,
} from '@/features/meeting-conclusion/services/suivi-tasks';
import {
  buyerInSentence,
  readyBuyersCount,
} from '@/features/meeting-conclusion/services/suivi-step-labels';

// Mission 145 (partie B) — « Aujourd'hui » : les tâches dues de l'agence (M130 A à M139, et les
// alertes pour rentrer un mandat), en quatre blocs — Urgent, Vendeurs, Acquéreurs, Prospection —,
// une ligne par sorte de tâche dès qu'il y en a deux (elle s'ouvre sur place), l'Urgent jamais
// regroupé. La pastille du menu compte les LIGNES. « Mes tâches » : celles des dossiers et des
// acquéreurs du conseiller ; « Toute l'agence », pour un manager seulement. Pur.

export type TodayBlockKey = 'urgent' | 'sellers' | 'buyers' | 'prospecting';

export const TODAY_BLOCK_TITLES: Record<TodayBlockKey, string> = {
  urgent: 'Urgent',
  sellers: 'Vendeurs',
  buyers: 'Acquéreurs',
  prospecting: 'Prospection',
};

export const TODAY_BLOCK_NOTES: Partial<Record<TodayBlockKey, string>> = {
  urgent: 'une vente en cours',
  prospecting: 'courriers et passages',
};

const BLOCK_OF: Record<SuiviTaskKind, TodayBlockKey> = {
  offer_answer: 'urgent',
  offer_expiry: 'urgent',
  follow_up: 'sellers',
  follow_up_early: 'sellers',
  market_update: 'sellers',
  visit: 'buyers',
  visit_report: 'buyers',
  propose_buyers: 'buyers',
  buyer_watch: 'buyers',
  buyer_relaunch: 'buyers',
  buyer_recontact: 'buyers',
  buyer_meeting: 'buyers',
  buyer_weekly_report: 'buyers',
  prospect_buyers: 'prospecting',
  prospect: 'prospecting',
};

const BLOCK_ORDER: TodayBlockKey[] = ['urgent', 'sellers', 'buyers', 'prospecting'];

export type TodayLine = {
  key: string;
  kind: SuiviTaskKind;
  // Une tâche, ou plusieurs de la même sorte (la série, ouverte sur place).
  tasks: SuiviTask[];
  // Combien de tâches de la ligne sont en retard.
  late: number;
};

export type TodayBlock = { key: TodayBlockKey; lines: TodayLine[] };

export type TodayBoard = { blocks: TodayBlock[]; lineCount: number; taskCount: number };

// La plus en retard d'abord, puis la plus ancienne.
function bySeriesOrder(today: string) {
  return (a: SuiviTask, b: SuiviTask) =>
    taskLateDays(b, today) - taskLateDays(a, today) || a.dueOn.localeCompare(b.dueOn);
}

const taskKey = (task: SuiviTask): string =>
  `${task.kind}:${task.offerId ?? task.prospectCard?.id ?? task.propertyKey ?? task.buyerId ?? task.projectId}`;

export function todayBoard(dues: SuiviTask[], today: string): TodayBoard {
  const sorted = sortDueTasks(dues);
  const blocks: TodayBlock[] = [];
  for (const block of BLOCK_ORDER) {
    const tasks = sorted.filter((task) => BLOCK_OF[task.kind] === block);
    const lines: TodayLine[] = [];
    // Mission 145 — une relance qui porte l'argument (des acquéreurs prêts) a sa propre ligne, en
    // tête du bloc Vendeurs ; l'Urgent n'est jamais regroupé.
    const own = tasks.filter(
      (task) => block === 'urgent' || (task.kind === 'follow_up' && (task.readyBuyers ?? 0) > 0),
    );
    for (const task of own) {
      lines.push({
        key: taskKey(task),
        kind: task.kind,
        tasks: [task],
        late: taskLateDays(task, today) > 0 ? 1 : 0,
      });
    }
    const rest = tasks.filter((task) => !own.includes(task));
    const kinds = [...new Set(rest.map((task) => task.kind))];
    for (const kind of kinds) {
      const series = rest.filter((task) => task.kind === kind).sort(bySeriesOrder(today));
      lines.push({
        key: series.length === 1 ? taskKey(series[0]!) : `series:${kind}`,
        kind,
        tasks: series,
        late: series.filter((task) => taskLateDays(task, today) > 0).length,
      });
    }
    if (lines.length > 0) blocks.push({ key: block, lines });
  }
  const lineCount = blocks.reduce((sum, block) => sum + block.lines.length, 0);
  return { blocks, lineCount, taskCount: dues.length };
}

// --- « Mes tâches » ----------------------------------------------------------------------------

export type TaskOwners = {
  // Le conseiller attitré de chaque dossier vendeur et de chaque acquéreur.
  projectAdvisor: ReadonlyMap<string, string | null>;
  buyerAdvisor: ReadonlyMap<string, string | null>;
};

// Les conseillers d'une tâche : celui du dossier vendeur (relance, Point marché, démarchage, visite à
// organiser sur son mandat, bien à proposer — le conseiller du mandat), celui de l'acquéreur (ses
// relances, ses points, sa veille, ses offres), ceux des acquéreurs d'origine d'un bien démarché.
export function taskOwners(task: SuiviTask, owners: TaskOwners): string[] {
  const ofBuyers = (ids: readonly string[]) =>
    ids.map((id) => owners.buyerAdvisor.get(id)).filter((id): id is string => id != null);
  if (task.kind === 'prospect_buyers' && task.prospectCard?.kind === 'buyer_prospect') {
    return ofBuyers(task.prospectCard.originBuyerIds);
  }
  if (task.kind === 'buyer_watch' && !task.buyerId) {
    return ofBuyers((task.watchBuyers ?? []).map((buyer) => buyer.id));
  }
  if (task.buyerId) return ofBuyers([task.buyerId]);
  const advisor = task.projectId ? owners.projectAdvisor.get(task.projectId) : null;
  return advisor ? [advisor] : [];
}

export function mineOnly(tasks: SuiviTask[], advisorId: string, owners: TaskOwners): SuiviTask[] {
  return tasks.filter((task) => taskOwners(task, owners).includes(advisorId));
}

// --- Ce que dit une ligne qui regroupe plusieurs tâches -----------------------------------------

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

const capitalized = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

// Le nom d'une tâche dans une série : le vendeur, l'acquéreur, ou le bien démarché.
export function seriesItemName(task: SuiviTask): string {
  if (task.kind === 'prospect_buyers') {
    return [
      task.prospectCard?.label ?? 'Un bien',
      readyBuyersCount(task.count ?? 0),
      task.prospectCard?.toConfirm ? 'adresse à confirmer' : null,
    ]
      .filter(Boolean)
      .join(' — ');
  }
  if (task.kind === 'prospect') return `${task.sellerName} : ${task.count ?? 0}`;
  if (task.buyerName) return capitalized(buyerInSentence(task.buyerName));
  return task.sellerName || 'Un dossier';
}

export function seriesTitle(
  kind: SuiviTaskKind,
  tasks: SuiviTask[],
  prospectAlerts: boolean,
): string {
  const n = tasks.length;
  switch (kind) {
    case 'follow_up':
      return `Relancer ${plural(n, 'vendeur', 'vendeurs')}`;
    case 'follow_up_early':
      return `Relancer plus tôt ? ${plural(n, 'vendeur a', 'vendeurs ont')} des acquéreurs prêts`;
    case 'market_update':
      return `Faire ${plural(n, 'Point marché', 'Points marché')}`;
    case 'visit':
      return `Organiser des visites chez ${plural(n, 'vendeur', 'vendeurs')}`;
    case 'visit_report':
      return `Saisir le compte rendu de ${plural(n, 'visite', 'visites')}`;
    case 'propose_buyers':
      return `${plural(n, 'bien', 'biens')} à proposer à vos acquéreurs`;
    case 'buyer_watch':
      return `Nouveaux biens de la veille : ${plural(n, 'acquéreur', 'acquéreurs')}`;
    case 'buyer_relaunch':
      return `Relancer ${plural(n, 'acquéreur', 'acquéreurs')}`;
    case 'buyer_recontact':
      return `Reprendre contact avec ${plural(n, 'acquéreur', 'acquéreurs')}`;
    case 'buyer_meeting':
      return `Proposer un point à ${plural(n, 'acquéreur prêt', 'acquéreurs prêts')} à visiter`;
    case 'buyer_weekly_report':
      return `Envoyer le point de la semaine à ${plural(n, 'acquéreur', 'acquéreurs')}`;
    case 'prospect_buyers':
      return `Démarcher ${plural(n, 'bien', 'biens')} : des acquéreurs prêts y correspondent`;
    case 'prospect': {
      const total = tasks.reduce((sum, task) => sum + (task.count ?? 0), 0);
      return `Démarcher ${plural(total, prospectAlerts ? 'autre concurrent' : 'concurrent', prospectAlerts ? 'autres concurrents' : 'concurrents')} de ${plural(n, 'mandat', 'mandats')}`;
    }
    case 'offer_answer':
    case 'offer_expiry':
      return `${plural(n, 'offre', 'offres')}`;
  }
}

// « M. et Mme Roux, la famille Moreau, Mme Faure et 4 autres » ; le retard se dit à part, en orange.
export function seriesDetail(kind: SuiviTaskKind, tasks: SuiviTask[]): string {
  const names = tasks.map(seriesItemName);
  const shown =
    names.length > 3
      ? `${names.slice(0, 3).join(', ')} et ${names.length - 3} autres`
      : names.join(', ');
  const tail =
    kind === 'prospect_buyers' || kind === 'prospect'
      ? 'par courrier ou passage, jamais par téléphone'
      : null;
  return [shown, tail].filter(Boolean).join(' · ');
}

export const seriesLate = (late: number): string | null =>
  late > 0 ? `dont ${late} en retard` : null;
