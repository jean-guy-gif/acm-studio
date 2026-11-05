import {
  isTaskDue,
  taskLateDays,
  type SuiviTask,
} from '@/features/meeting-conclusion/services/suivi-tasks';
import type { ConclusionOutcome } from '@/features/meeting-conclusion/types';

// Mission 130 — ce que disent « À faire aujourd'hui » et la colonne « Prochaine étape » d'une
// carte, avec les mots d'un conseiller (textes du designer, `M130-suivi-etats.md`). Pur.

// « 07/11 » depuis un jour AAAA-MM-JJ.
export function dayLabel(day: string): string {
  const [, month, date] = day.split('-');
  return `${date}/${month}`;
}

export function lateLabel(days: number): string {
  return days === 1 ? 'en retard d’un jour' : `en retard de ${days} jours`;
}

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

// Ce que la ligne d'une tâche sait du dossier, au-delà de la tâche elle-même.
export type TaskContext = {
  motiveLabel: string | null;
  lastContactDays: number | null;
  signedOn: string | null; // AAAA-MM-JJ
  propertyLabel: string | null;
};

export type TaskLine = {
  title: string;
  // Le sous-titre, et sa fin en orange quand la tâche est en retard.
  detail: string;
  late: string | null;
  button: string;
  href: string;
};

export function taskHref(task: SuiviTask): string {
  switch (task.kind) {
    case 'follow_up':
      return `/suivi?relancer=${task.projectId}#suivi-${task.projectId}`;
    case 'market_update':
      return `/suivi?point=${task.projectId}#suivi-${task.projectId}`;
    case 'prospect':
      return `/prospection?bien=${task.projectId}`;
    case 'visit':
      return '/visites';
  }
}

export function taskLine(task: SuiviTask, context: TaskContext, today: string): TaskLine {
  const lateDays = taskLateDays(task, today);
  const late = lateDays > 0 ? lateLabel(lateDays) : null;
  const href = taskHref(task);
  switch (task.kind) {
    case 'follow_up': {
      const contact =
        context.lastContactDays == null
          ? null
          : context.lastContactDays === 0
            ? 'dernier contact aujourd’hui'
            : `dernier contact il y a ${plural(context.lastContactDays, 'jour', 'jours')}`;
      const planned = late
        ? `relance prévue le ${dayLabel(task.dueOn)}${task.datePosed ? '' : ' (7 jours après le dernier contact)'}, `
        : 'relance prévue aujourd’hui';
      return {
        title: `Relancer ${task.sellerName}`,
        detail: [context.motiveLabel, contact, planned].filter(Boolean).join(' · '),
        late,
        button: 'Relancer',
        href,
      };
    }
    case 'market_update': {
      const since = task.lastPointOn
        ? `Dernier point le ${dayLabel(task.lastPointOn)}`
        : context.signedOn
          ? `Mandat signé le ${dayLabel(context.signedOn)}`
          : null;
      const due = late
        ? `prévu le ${dayLabel(task.dueOn)}, `
        : `${task.lastPointOn ? 'Point marché dû' : 'premier Point marché dû'} (tous les mois)`;
      return {
        title: `Point marché de ${task.sellerName}`,
        detail: [since, due].filter(Boolean).join(' · '),
        late,
        button: 'Faire le point',
        href,
      };
    }
    case 'prospect': {
      const count = task.count ?? 0;
      return {
        title: `Démarcher ${plural(count, 'concurrent', 'concurrents')} de ${task.sellerName}`,
        detail: `${plural(count, 'adresse prête', 'adresses prêtes')} · courriers à imprimer`,
        late: null,
        button: 'Prospecter',
        href,
      };
    }
    case 'visit': {
      const count = task.count ?? 0;
      const title =
        count > 1
          ? `Organiser ${count} visites chez ${task.sellerName}`
          : `Organiser la visite de ${task.buyerName ?? 'l’acquéreur'} chez ${task.sellerName}`;
      return {
        title,
        detail: [context.propertyLabel, `demandée le ${dayLabel(task.dueOn)}`]
          .filter(Boolean)
          .join(' · '),
        late: null,
        button: 'Organiser la visite',
        href,
      };
    }
  }
}

// « Rien à faire aujourd'hui. Prochaine tâche : relancer M. et Mme Martin le 12/11. »
export function nothingTodayLabel(next: SuiviTask | null): string {
  if (!next) return 'Rien à faire aujourd’hui, et aucune tâche prévue.';
  const what =
    next.kind === 'follow_up'
      ? `relancer ${next.sellerName}`
      : next.kind === 'market_update'
        ? `Point marché de ${next.sellerName}`
        : next.kind === 'prospect'
          ? `démarcher les concurrents de ${next.sellerName}`
          : `organiser une visite chez ${next.sellerName}`;
  return `Rien à faire aujourd’hui. Prochaine tâche : ${what} le ${dayLabel(next.dueOn)}.`;
}

// --- La colonne « Prochaine étape » d'une carte ----------------------------------------------

export type StepAction =
  { kind: 'relance' } | { kind: 'market_update' } | { kind: 'link'; href: string };

export type CardStep = {
  // « Aujourd'hui », « le 23/11 », « en retard de 3 jours » (en orange), « aucune ».
  when: string;
  whenLate: boolean;
  title: string;
  phrase: string;
  button: { label: string; action: StepAction; primary: boolean } | null;
};

export type CardStepContext = {
  outcome: ConclusionOutcome | null;
  sellerName: string;
  isExample: boolean;
  competitorCount: number;
  toConfirmCount: number;
  declinedCount: number;
  latestPoint: { id: string; madeOn: string; line: string } | null;
  outcomeChangedOn: string | null;
  datePosed: boolean;
  lastContactNote: { on: string; note: string | null } | null;
};

const whenOf = (task: SuiviTask, today: string, isExample: boolean) => {
  if (isExample) return { when: 'à votre rythme', whenLate: false };
  const lateDays = taskLateDays(task, today);
  if (lateDays > 0) return { when: lateLabel(lateDays), whenLate: true };
  if (isTaskDue(task, today)) return { when: 'aujourd’hui', whenLate: false };
  return { when: `le ${dayLabel(task.dueOn)}`, whenLate: false };
};

export function cardStep(
  task: SuiviTask | null,
  context: CardStepContext,
  today: string,
): CardStep {
  if (context.outcome === 'sold_elsewhere' || context.outcome === 'withdrawn') {
    const noted = context.outcomeChangedOn
      ? ` (noté le ${dayLabel(context.outcomeChangedOn)})`
      : '';
    return {
      when: 'aucune',
      whenLate: false,
      title: 'Aucune',
      phrase:
        context.outcome === 'sold_elsewhere'
          ? `Vendu par une autre agence${noted}. Rien à faire.`
          : `Le vendeur a retiré son bien${noted}. Rien à faire tant qu’il ne revient pas.`,
      button: null,
    };
  }
  if (!task) {
    return {
      when: 'aucune',
      whenLate: false,
      title: 'Rien à faire pour l’instant',
      phrase:
        context.competitorCount === 0
          ? 'Aucun concurrent retenu : rien à démarcher ni à relire. Les visites demandées s’afficheront ici.'
          : 'Rien à faire pour l’instant.',
      button: null,
    };
  }
  const { when, whenLate } = whenOf(task, today, context.isExample);
  // Le bouton est plein seulement si l'étape est due ; jamais pour le dossier d'exemple (M97).
  const primary = !context.isExample && isTaskDue(task, today);
  const examplePhrase = context.isExample
    ? 'Dossier d’exemple : ses étapes n’entrent pas dans « À faire aujourd’hui ».'
    : null;
  switch (task.kind) {
    case 'follow_up': {
      const note = context.lastContactNote;
      const phrase = !isTaskDue(task, today)
        ? note
          ? `Relancé le ${dayLabel(note.on)}${note.note ? ` · « ${note.note} »` : ''}`
          : `Relance prévue le ${dayLabel(task.dueOn)}.`
        : context.datePosed
          ? 'Message prêt avec ses mots · vous notez la relance et la suivante'
          : 'Aucune date n’avait été posée : relance 7 jours après le dernier contact.';
      return {
        when,
        whenLate,
        title: 'Le relancer',
        phrase: examplePhrase ?? phrase,
        button: { label: `Relancer ${context.sellerName}`, action: { kind: 'relance' }, primary },
      };
    }
    case 'market_update': {
      if (!isTaskDue(task, today) && context.latestPoint) {
        return {
          when,
          whenLate,
          title: 'Prochain Point marché',
          phrase:
            examplePhrase ??
            `Dernier point le ${dayLabel(context.latestPoint.madeOn)} : ${context.latestPoint.line}.`,
          button: {
            label: `Voir le Point du ${dayLabel(context.latestPoint.madeOn)}`,
            action: {
              kind: 'link',
              href: `/builder/${task.projectId}/point-marche?point=${context.latestPoint.id}`,
            },
            primary: false,
          },
        };
      }
      return {
        when,
        whenLate,
        title: context.latestPoint ? 'Faire son Point marché' : 'Faire son premier Point marché',
        phrase:
          examplePhrase ??
          'ACM relit les annonces des concurrents (gratuit), puis vous envoyez le document au vendeur.',
        button: { label: 'Faire le point marché', action: { kind: 'market_update' }, primary },
      };
    }
    case 'prospect': {
      const count = task.count ?? 0;
      const declined =
        context.declinedCount > 0
          ? ` · ${context.declinedCount} ${context.declinedCount > 1 ? 'ont dit' : 'a dit'} « pas intéressé »`
          : '';
      return {
        when,
        whenLate,
        title: `Démarcher ${count > 1 ? `ses ${count} concurrents` : 'son concurrent'}`,
        phrase: examplePhrase ?? `${count > 1 ? 'Adresses prêtes' : 'Adresse prête'}${declined}`,
        button: {
          label: 'Prospecter',
          action: { kind: 'link', href: `/prospection?bien=${task.projectId}` },
          primary,
        },
      };
    }
    case 'visit': {
      const count = task.count ?? 0;
      return {
        when: 'aujourd’hui',
        whenLate: false,
        title: count > 1 ? `Organiser ${count} visites` : 'Organiser une visite',
        phrase:
          examplePhrase ??
          `${task.buyerName ?? 'Un acquéreur'} veut visiter · demandée le ${dayLabel(task.dueOn)}`,
        button: {
          label: 'Organiser la visite',
          action: { kind: 'link', href: '/visites' },
          primary,
        },
      };
    }
  }
}
