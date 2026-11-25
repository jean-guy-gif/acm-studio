import type { Tone } from '@/components/socle/tone';
import { propertyFigures, propertyPhrase } from '@/features/buyers/services/loop-properties';
import { dayLabel, lateLabel } from '@/features/meeting-conclusion/services/suivi-step-labels';
import {
  addDays,
  sortDueTasks,
  taskLateDays,
  type SuiviTask,
  type SuiviTaskKind,
} from '@/features/meeting-conclusion/services/suivi-tasks';

// La refonte, lot B (maquettes REFONTE-1, 5 et 6) — « À faire aujourd'hui », en tête de
// Acquéreurs : une carte par PERSONNE, avec ce qu'il y a à faire et son bouton. Ce sont les tâches
// d'« Aujourd'hui » (M130 A à M145 B, mêmes règles, mêmes gestes), rangées par acquéreur : la plus
// utile de chacun fait sa carte, les autres se lisent dans son détail. Aucune règle nouvelle. Pur.

// Les sortes de tâches d'« Aujourd'hui » qui tiennent à un acquéreur.
export const BUYER_TASK_KINDS: readonly SuiviTaskKind[] = [
  'offer_answer',
  'offer_expiry',
  'visit_report',
  'visit',
  'propose_buyers',
  'buyer_watch',
  'buyer_relaunch',
  'buyer_recontact',
  'buyer_meeting',
  'buyer_weekly_report',
];

export type BuyerTodayItem = {
  buyerId: string;
  name: string;
  // Sa tâche du jour, ramenée à lui seul : le geste est celui d'« Aujourd'hui ».
  task: SuiviTask;
  // Ce qu'il y a à faire, sans redire son nom ; le retard se dit à part, en orange.
  what: string;
  late: string | null;
  // La teinte de son rond : orange, à regarder avant d'agir ; verte, une bonne nouvelle.
  tone: Tone;
  // Ses autres tâches du jour, dans l'ordre.
  others: { task: SuiviTask; what: string; late: string | null }[];
};

// Une tâche qui réunit plusieurs acquéreurs — un bien de la veille trouvé pour plusieurs, les
// visites à organiser d'un mandat, un bien à proposer à ses acquéreurs prêts — devient une tâche
// par acquéreur. Une tâche sans acquéreur connu ne fait aucune carte : rien n'est deviné.
export function tasksByBuyer(task: SuiviTask): SuiviTask[] {
  if (task.buyerId) return [task];
  if (task.kind === 'buyer_watch' && task.watchBuyers) {
    return task.watchBuyers.map((buyer) => ({
      ...task,
      buyerId: buyer.id,
      buyerName: buyer.name,
      watchBuyers: undefined,
      count: 1,
    }));
  }
  if (task.kind === 'visit' && task.visitBuyers) {
    const counts = new Map<string, { name: string; count: number }>();
    for (const buyer of task.visitBuyers) {
      const known = counts.get(buyer.id);
      counts.set(buyer.id, { name: buyer.name, count: (known?.count ?? 0) + 1 });
    }
    return [...counts].map(([id, { name, count }]) => ({
      ...task,
      buyerId: id,
      buyerName: name,
      visitBuyers: undefined,
      count,
    }));
  }
  if (task.kind === 'propose_buyers' && task.proposeBuyers) {
    return task.proposeBuyers.map((buyer) => ({
      ...task,
      buyerId: buyer.id,
      buyerName: buyer.name,
      proposeBuyers: undefined,
      count: 1,
    }));
  }
  return [];
}

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

// Ce qu'il y a à faire pour cette personne, avec les mots d'« Aujourd'hui », sans son nom ni
// pronom (un nom de fiche ne dit ni le genre ni le nombre, M119).
export function buyerTaskWhat(task: SuiviTask, today: string): string {
  switch (task.kind) {
    case 'offer_answer':
      return task.decision === 'accepted'
        ? `Offre acceptée par le vendeur le ${dayLabel(task.dueOn)}`
        : task.decision === 'refused'
          ? `Offre refusée par le vendeur le ${dayLabel(task.dueOn)}`
          : `Le vendeur a répondu à l’offre le ${dayLabel(task.dueOn)}`;
    case 'offer_expiry': {
      const last = task.validUntil ?? task.dueOn;
      return `L’offre expire ${last <= today ? 'ce soir' : 'demain'} : le vendeur n’a pas répondu`;
    }
    case 'visit_report':
      return ['Compte rendu de visite à saisir', task.propertyLabel ?? null]
        .filter(Boolean)
        .join(' · ');
    case 'visit': {
      const where = task.property
        ? propertyPhrase(task.property)
        : task.sellerName
          ? `le bien de ${task.sellerName}`
          : 'un bien de l’agence';
      return (task.count ?? 1) > 1
        ? `${task.count} visites demandées : ${where}`
        : `Visite demandée : ${where}`;
    }
    case 'propose_buyers': {
      const what = task.property ? propertyPhrase(task.property) : 'un bien de l’agence';
      const figures = task.figures ? propertyFigures(task.figures) : null;
      return `Un bien à proposer : ${what}${figures ? ` (${figures})` : ''}`;
    }
    case 'buyer_watch': {
      const count = task.count ?? 1;
      return `${count} ${count > 1 ? 'nouveaux biens trouvés' : 'nouveau bien trouvé'} par la veille`;
    }
    case 'buyer_relaunch':
      return [
        `${task.sentOn ? `Sélection envoyée le ${dayLabel(task.sentOn)}` : 'Sélection envoyée'}, pas de réponse`,
        task.count === 2 ? '2e relance' : null,
        task.linkExpired ? 'lien expiré' : null,
      ]
        .filter(Boolean)
        .join(' · ');
    case 'buyer_recontact':
      return `Aucun échange depuis ${plural(task.sinceDays ?? 30, 'jour', 'jours')}`;
    case 'buyer_meeting':
      return 'Prêt à visiter : un point à proposer, à l’agence ou en visio';
    case 'buyer_weekly_report': {
      const start = task.weekStart ?? addDays(task.dueOn, -7);
      return `Point de la semaine du ${dayLabel(start)} au ${dayLabel(addDays(start, 6))} à envoyer`;
    }
    default:
      return '';
  }
}

// La teinte suit la tâche, comme sur les maquettes : orange pour ce qui est à regarder avant
// d'agir (une offre refusée ou qui expire, un acquéreur sans nouvelles, un retard), verte pour une
// bonne nouvelle (une offre acceptée, une visite demandée), la couleur de l'agence sinon.
export function buyerTaskTone(task: SuiviTask, lateDays: number): Tone {
  if (task.kind === 'offer_answer') return task.decision === 'accepted' ? 'good' : 'watch';
  if (task.kind === 'offer_expiry' || task.kind === 'buyer_recontact') return 'watch';
  if (lateDays > 0) return 'watch';
  if (task.kind === 'visit') return 'good';
  return 'plain';
}

// Une carte par acquéreur : sa tâche la plus utile d'abord (l'ordre d'« Aujourd'hui »), les
// acquéreurs dans l'ordre de leur première tâche.
export function buyersToday(tasks: readonly SuiviTask[], today: string): BuyerTodayItem[] {
  const own = sortDueTasks(tasks.filter((task) => BUYER_TASK_KINDS.includes(task.kind))).flatMap(
    tasksByBuyer,
  );
  const items = new Map<string, BuyerTodayItem>();
  for (const task of own) {
    const id = task.buyerId;
    if (!id) continue;
    const lateDays = taskLateDays(task, today);
    const entry = {
      task,
      what: buyerTaskWhat(task, today),
      late: lateDays > 0 ? lateLabel(lateDays) : null,
    };
    const known = items.get(id);
    if (known) {
      known.others.push(entry);
      continue;
    }
    items.set(id, {
      buyerId: id,
      name: task.buyerName?.trim() || 'Acquéreur',
      ...entry,
      tone: buyerTaskTone(task, lateDays),
      others: [],
    });
  }
  return [...items.values()];
}

// « 3 choses à faire aujourd'hui » : une par personne.
export function buyersTodayCount(count: number): string {
  return count === 0
    ? 'Rien à faire aujourd’hui'
    : `${count} ${count > 1 ? 'choses' : 'chose'} à faire aujourd’hui`;
}
