import {
  isTaskDue,
  taskLateDays,
  type SuiviTask,
} from '@/features/meeting-conclusion/services/suivi-tasks';
import type { ConclusionOutcome } from '@/features/meeting-conclusion/types';
import {
  LOOP_ORIGIN_NOTES,
  propertyFigures,
  propertyPhrase,
} from '@/features/buyers/services/loop-properties';

// Mission 134 — la page « Proposer ce bien ».
export const proposeHref = (propertyKey: string): string =>
  `/acquereurs/proposer?bien=${encodeURIComponent(propertyKey)}`;

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

// « Famille Keller » se dit « la famille Keller » au milieu d'une phrase ; « M. et Mme Rossi » tel
// quel.
export function buyerInSentence(name: string | null | undefined): string {
  const value = name?.trim();
  if (!value) return 'l’acquéreur';
  const family = /^famille\s+(.+)$/i.exec(value);
  return family ? `la famille ${family[1]}` : value;
}

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
    case 'propose_buyers':
      return proposeHref(task.propertyKey ?? '');
    case 'offer_expiry':
      return `/acquereurs/${task.buyerId ?? ''}/offre/${task.offerId ?? ''}`;
    case 'buyer_watch':
      return task.buyerId
        ? `/acquereurs/${task.buyerId}/biens-ideaux#nouveau`
        : `/acquereurs/${task.watchBuyers?.[0]?.id ?? ''}/biens-ideaux#nouveau`;
    case 'buyer_recontact':
    case 'buyer_relaunch':
      return `/acquereurs/${task.buyerId ?? ''}`;
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
        ? `relance prévue le ${dayLabel(task.dueOn)}${task.datePosed ? '' : ' (8 jours après le dernier contact)'}, `
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
        detail: `${plural(count, 'adresse prête', 'adresses prêtes')}${
          task.readyOn ? ` depuis le ${dayLabel(task.readyOn)}` : ''
        } · courriers à imprimer`,
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
          : `Organiser la visite de ${buyerInSentence(task.buyerName)} chez ${task.sellerName}`;
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
    // Mission 134 — un nouveau bien appelle ses acquéreurs prêts : une tâche par bien.
    case 'propose_buyers': {
      const count = task.count ?? 0;
      const what = task.property ? propertyPhrase(task.property) : 'ce bien';
      const figures = task.figures ? propertyFigures(task.figures) : null;
      return {
        title: `${plural(count, 'acquéreur', 'acquéreurs')} pour ${what}${figures ? ` (${figures})` : ''}`,
        detail: [task.origin ? LOOP_ORIGIN_NOTES[task.origin] : null, 'prêts à visiter']
          .filter(Boolean)
          .join(' · '),
        late: null,
        button: 'Proposer ce bien',
        href,
      };
    }
    // Mission 137 B — une offre d'achat sans réponse du vendeur, la veille de son dernier jour.
    case 'offer_expiry': {
      const last = task.validUntil ?? task.dueOn;
      const lastLabel = `${last.slice(8, 10)}/${last.slice(5, 7)}`;
      return {
        title: `L’offre de ${buyerInSentence(task.buyerName)} expire ${last <= today ? 'ce soir' : 'demain'}`,
        detail: `valable jusqu’au ${lastLabel} inclus · le vendeur n’a pas répondu`,
        late: null,
        button: 'Voir l’offre',
        href,
      };
    }
    // Mission 136 — ce que la veille a trouvé : pour un acquéreur, ou un bien pour plusieurs.
    case 'buyer_watch': {
      const count = task.count ?? 0;
      if (task.buyerId) {
        return {
          title: `${count} ${count > 1 ? 'nouveaux biens' : 'nouveau bien'} pour ${buyerInSentence(task.buyerName)}`,
          detail: `${count > 1 ? 'trouvés' : 'trouvé'} par la veille · bien du marché : à vérifier avant d’envoyer`,
          late: null,
          button: 'Voir les biens',
          href,
        };
      }
      const what = task.property ? propertyPhrase(task.property) : 'un bien';
      const figures = task.figures ? propertyFigures(task.figures) : null;
      return {
        title: `${plural(count, 'acquéreur', 'acquéreurs')} pour ${what}${figures ? ` (${figures})` : ''}`,
        detail: `trouvé par la veille : ${(task.watchBuyers ?? []).map((buyer) => buyerInSentence(buyer.name)).join(', ')}`,
        late: null,
        button: 'Voir les biens',
        href,
      };
    }
    // Mission 135 — un lien de sélection resté sans réponse.
    case 'buyer_relaunch': {
      const sent = task.sentOn
        ? `sélection envoyée le ${dayLabel(task.sentOn)}`
        : 'sélection envoyée';
      const parts = [
        `${sent}, pas de réponse`,
        task.count === 2 ? '2e relance' : null,
        task.linkExpired ? 'lien expiré' : null,
      ].filter(Boolean);
      return {
        title: `Relancer ${buyerInSentence(task.buyerName)}`,
        detail: late ? `${parts.join(' · ')} · ` : parts.join(' · '),
        late,
        button: task.linkExpired ? 'Envoyer un nouveau lien' : 'Relancer',
        href,
      };
    }
    // Mission 132 — un acquéreur sans échange depuis 30 jours.
    case 'buyer_recontact': {
      const since =
        task.sinceDays != null
          ? `aucun échange depuis ${plural(task.sinceDays, 'jour', 'jours')}`
          : 'aucun échange depuis 30 jours';
      return {
        title: `Reprendre contact avec ${buyerInSentence(task.buyerName)}`,
        detail: late ? `${since} · ` : since,
        late,
        button: 'Voir sa fiche',
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
          : next.kind === 'buyer_recontact'
            ? `reprendre contact avec ${buyerInSentence(next.buyerName)}`
            : next.kind === 'buyer_relaunch'
              ? `relancer ${buyerInSentence(next.buyerName)}`
              : next.kind === 'offer_expiry'
                ? `rappeler l’échéance de l’offre de ${buyerInSentence(next.buyerName)}`
                : next.kind === 'buyer_watch'
                  ? `voir les biens trouvés par la veille`
                  : next.kind === 'propose_buyers'
                    ? `proposer ${next.property ? propertyPhrase(next.property) : 'un bien'} à ses acquéreurs`
                    : `organiser une visite chez ${next.sellerName}`;
  return `Rien à faire aujourd’hui. Prochaine tâche : ${what} le ${dayLabel(next.dueOn)}.`;
}

// --- La colonne « Prochaine étape » d'une carte ----------------------------------------------

export type StepAction =
  | { kind: 'relance' }
  | { kind: 'market_update' }
  // Ouvre le Point marché de la carte, sans le relancer (le dernier point, ses nouveaux venus).
  | { kind: 'point_panel' }
  | { kind: 'link'; href: string };

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
          : 'Aucune date n’avait été posée : relance 8 jours après le dernier contact.';
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
            action: { kind: 'point_panel' },
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
    // Une tâche d'acquéreur ou d'un bien à proposer ne tient à aucune carte du Suivi.
    case 'offer_expiry':
    case 'propose_buyers':
    case 'buyer_watch':
    case 'buyer_relaunch':
    case 'buyer_recontact':
      return { when: 'aucune', whenLate: false, title: '', phrase: '', button: null };
  }
}
