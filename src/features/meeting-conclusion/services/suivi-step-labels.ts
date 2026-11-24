import {
  addDays,
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
import { offerAnswerTitle } from '@/features/purchase-offer/services/offer-answer';
import { normalizePropertyType } from '@/features/competitor-search/utils/normalize-property-type';
import { formatRelativeDay } from '@/lib/format';

// Midi d'un jour AAAA-MM-JJ : un instant de ce jour-là à Paris, pour une date relative.
const parisNoon = (day: string): Date => new Date(`${day}T12:00:00Z`);

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
  // Mission 145 — l'argument pour rentrer le mandat : « 1 acquéreur prêt correspond à la maison ».
  argue?: string | null;
  // Le sous-titre, et sa fin en orange quand la tâche est en retard.
  detail: string;
  late: string | null;
  button: string;
  href: string;
};

// Mission 146 (partie B, B5) — l'argument se lit côté conseiller, sans guillemets, par le type du
// bien : « 1 acquéreur prêt correspond à l'appartement », « … à la maison » ; « au bien » quand le
// type manque ou ne se reconnaît pas (le type normalisé de M54). Ni « votre », ni « leur », ni
// « son » (décision de Jean-Guy, 08/11) : « votre » reste au message envoyé au vendeur (M145 B).
const TO_THE_PROPERTY: Record<string, string> = {
  apartment: 'à l’appartement',
  house: 'à la maison',
  land: 'au terrain',
  building: 'à l’immeuble',
  commercial: 'au local commercial',
  parking: 'au parking',
};
export function readyBuyersArgument(count: number, propertyType?: string | null): string {
  const target = TO_THE_PROPERTY[normalizePropertyType(propertyType ?? null) ?? ''] ?? 'au bien';
  return count > 1
    ? `${count} acquéreurs prêts correspondent ${target}`
    : `1 acquéreur prêt correspond ${target}`;
}

// « 1 acquéreur prêt » / « 4 acquéreurs prêts ».
export function readyBuyersCount(count: number): string {
  return count > 1 ? `${count} acquéreurs prêts` : '1 acquéreur prêt';
}

export function taskHref(task: SuiviTask): string {
  switch (task.kind) {
    case 'follow_up':
    case 'follow_up_early':
      return `/suivi?relancer=${task.projectId}#suivi-${task.projectId}`;
    // Mission 145 — démarcher : préparer le courrier au propriétaire (M84, M120 A), ou confirmer
    // l'adresse d'abord, sur la carte de Prospection ; jamais un appel.
    case 'prospect_buyers': {
      const card = task.prospectCard;
      if (!card || card.toConfirm) {
        return card?.kind === 'buyer_prospect'
          ? '/prospection?origine=acquereur'
          : `/prospection?bien=${task.projectId}`;
      }
      return card.kind === 'competitor'
        ? `/builder/${task.projectId}/prospection/${card.id}?version=owner`
        : card.letterOriginId
          ? `/acquereurs/courrier/${card.letterOriginId}`
          : '/prospection?origine=acquereur';
    }
    case 'market_update':
      return `/suivi?point=${task.projectId}#suivi-${task.projectId}`;
    case 'prospect':
      return `/prospection?bien=${task.projectId}`;
    case 'visit':
      return '/visites';
    case 'propose_buyers':
      return proposeHref(task.propertyKey ?? '');
    case 'offer_expiry':
    case 'offer_answer':
      return `/acquereurs/${task.buyerId ?? ''}/offre/${task.offerId ?? ''}`;
    case 'buyer_watch':
      return task.buyerId
        ? `/acquereurs/${task.buyerId}/biens-ideaux#nouveau`
        : `/acquereurs/${task.watchBuyers?.[0]?.id ?? ''}/biens-ideaux#nouveau`;
    case 'buyer_recontact':
    case 'buyer_relaunch':
    case 'buyer_meeting':
    case 'buyer_weekly_report':
      return `/acquereurs/${task.buyerId ?? ''}`;
    // Lancement, mission 7 — le formulaire « Visite faite » de cette visite, ouvert sur Visites.
    case 'visit_report':
      return `/visites?faite=${task.visitId ?? ''}#visite-${task.visitId ?? ''}`;
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
        argue: task.readyBuyers
          ? readyBuyersArgument(task.readyBuyers, task.property?.propertyType)
          : null,
        detail: [context.motiveLabel, contact, planned].filter(Boolean).join(' · '),
        late,
        button: 'Relancer',
        href,
      };
    }
    // Mission 145 — la relance n'est pas encore due, mais des acquéreurs prêts correspondent.
    case 'follow_up_early': {
      const count = task.readyBuyers ?? 0;
      return {
        title: `Relancer plus tôt ? ${readyBuyersCount(count)} ${count > 1 ? 'correspondent' : 'correspond'} au bien de ${task.sellerName}`,
        argue: null,
        detail: [
          task.plannedOn ? `relance prévue le ${dayLabel(task.plannedOn)}` : null,
          context.motiveLabel,
        ]
          .filter(Boolean)
          .join(' · '),
        late: null,
        button: 'Relancer',
        href,
      };
    }
    // Mission 145 — un bien sans mandat que veulent des acquéreurs prêts : courrier ou passage.
    case 'prospect_buyers': {
      const count = task.count ?? 0;
      const card = task.prospectCard;
      return {
        title: `Démarcher : ${readyBuyersCount(count)} ${count > 1 ? 'correspondent' : 'correspond'}`,
        argue: null,
        detail: [
          card?.label ?? null,
          card?.toConfirm ? 'adresse à confirmer' : 'courrier au propriétaire',
          'par courrier ou passage, jamais par téléphone',
        ]
          .filter(Boolean)
          .join(' · '),
        late: null,
        button: card?.toConfirm ? 'Confirmer l’adresse' : 'Préparer le courrier',
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
    // Mission 138 — la réponse du vendeur à une offre, jusqu'au « Fait » du conseiller.
    case 'offer_answer': {
      // Une décision absente n'est jamais devinée (M47) : la ligne dit seulement la réponse.
      const decision = task.decision;
      return {
        title: decision
          ? offerAnswerTitle(decision, task.buyerName ?? null)
          : `Le vendeur a répondu à l’offre de ${buyerInSentence(task.buyerName)}`,
        detail:
          decision === 'accepted'
            ? `acceptée le ${dayLabel(task.dueOn)} · prévenir l’acquéreur, transmettre au notaire`
            : decision === 'refused'
              ? `refusée le ${dayLabel(task.dueOn)} · prévenir l’acquéreur`
              : `réponse du ${dayLabel(task.dueOn)}`,
        late: null,
        button: 'Voir l’offre',
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
    // Lancement, mission 7 — la visite confirmée a eu lieu : son compte rendu, en trente secondes.
    case 'visit_report': {
      const what = [
        task.propertyLabel ?? null,
        task.scheduledAt
          ? `visite prévue ${formatRelativeDay(task.scheduledAt, parisNoon(today))}`
          : null,
      ]
        .filter((part): part is string => part != null)
        .join(' · ');
      return {
        title: `Saisir le compte rendu de la visite de ${buyerInSentence(task.buyerName)}`,
        detail: late ? `${what} · ` : what,
        late,
        button: 'Visite faite',
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
    // Mission 139 — le point proposé à un acquéreur prêt à visiter, tous les 14 jours.
    case 'buyer_meeting':
      return {
        title: `Proposer un point avec ${buyerInSentence(task.buyerName)}`,
        detail: 'prêt à visiter · à l’agence ou en visio',
        late: null,
        button: 'Proposer un point',
        href,
      };
    // Mission 139 — le point de la semaine écoulée, chaque lundi.
    case 'buyer_weekly_report': {
      const start = task.weekStart ?? addDays(task.dueOn, -7);
      return {
        title: `Envoyer le point de la semaine à ${buyerInSentence(task.buyerName)}`,
        detail: `semaine du ${dayLabel(start)} au ${dayLabel(addDays(start, 6))}`,
        late: null,
        button: 'Préparer le point',
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
      : next.kind === 'follow_up_early'
        ? `relancer ${next.sellerName}`
        : next.kind === 'prospect_buyers'
          ? 'démarcher un bien que veulent des acquéreurs prêts'
          : next.kind === 'market_update'
            ? `Point marché de ${next.sellerName}`
            : next.kind === 'prospect'
              ? `démarcher les concurrents de ${next.sellerName}`
              : next.kind === 'buyer_recontact'
                ? `reprendre contact avec ${buyerInSentence(next.buyerName)}`
                : next.kind === 'buyer_meeting'
                  ? `proposer un point avec ${buyerInSentence(next.buyerName)}`
                  : next.kind === 'buyer_weekly_report'
                    ? `envoyer le point de la semaine à ${buyerInSentence(next.buyerName)}`
                    : next.kind === 'buyer_relaunch'
                      ? `relancer ${buyerInSentence(next.buyerName)}`
                      : next.kind === 'offer_answer'
                        ? `donner suite à la réponse du vendeur à ${buyerInSentence(next.buyerName)}`
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
          'ACM relit les annonces des concurrents (sans compter dans le forfait), puis vous envoyez le document au vendeur.',
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
    // Une tâche d'acquéreur ou d'un bien à proposer ne tient à aucune carte du Suivi ; « Relancer
    // plus tôt ? » et « Démarcher » non plus (Mission 145 : « Aujourd'hui » seulement).
    case 'follow_up_early':
    case 'prospect_buyers':
    case 'offer_expiry':
    case 'offer_answer':
    case 'propose_buyers':
    case 'buyer_watch':
    case 'buyer_relaunch':
    case 'buyer_recontact':
    case 'buyer_meeting':
    case 'buyer_weekly_report':
    case 'visit_report':
      return { when: 'aucune', whenLate: false, title: '', phrase: '', button: null };
  }
}
