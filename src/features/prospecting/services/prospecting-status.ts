// Mission 86 — où en est la prospection d'un concurrent. Pur.
//
// « À confirmer » et « prêt » se DÉDUISENT de l'adresse, comme avant la mission ; « remis »,
// « rendez-vous obtenu », « mandat rentré » et « pas intéressé » sont des faits datés, posés par
// le conseiller. On avance d'un cran à la fois, et on revient d'un cran (erreur de clic).
// « Pas intéressé » se dit à tout moment avant le mandat — à la porte, après la remise, après un
// rendez-vous sans mandat — et garde les faits d'avant : l'annuler rend le concurrent là où il
// en était.

import type { ProspectingStep } from '@/features/competitor-mandate/services/mandate-columns';
import { formatDay } from '@/lib/format';

// Mission 115 — le confrère (exclusivité) : après « Contacté », « Collaboration obtenue » clôt sa
// prospection (comme un mandat rentré, comptée à part) ; « Collaboration refusée » remet le bien
// en courrier PROPRIÉTAIRE : les faits d'avant le refus ne comptent plus, la suite est celle d'un
// propriétaire (remis → rendez-vous → mandat). Deux faits datés de plus, un cran à la fois,
// retour d'un cran possible. Le propriétaire ne voit pas ces choix.
export type ProspectingStatus =
  'to_confirm' | 'ready' | 'handed' | 'meeting' | 'mandate' | 'collaboration' | 'declined';

export type ProspectingDates = {
  prospecting_handed_at: string | null;
  prospecting_meeting_at: string | null;
  prospecting_mandate_at: string | null;
  prospecting_declined_at: string | null;
  prospecting_collaboration_at: string | null;
  prospecting_collaboration_declined_at: string | null;
};

// Un fait compte-t-il encore ? Après un refus de collaboration, seuls les faits datés APRÈS le
// refus appartiennent au parcours propriétaire qui recommence.
const counts = (date: string | null, since: string | null): boolean =>
  date != null && (since == null || Date.parse(date) > Date.parse(since));

// Après un refus de collaboration, le bien se démarche comme un propriétaire.
export function collaborationDeclined(
  dates: Pick<ProspectingDates, 'prospecting_collaboration_declined_at'>,
): boolean {
  return dates.prospecting_collaboration_declined_at != null;
}

export function prospectingStatus(
  dates: ProspectingDates,
  addressConfirmed: boolean,
): ProspectingStatus {
  if (dates.prospecting_declined_at != null) {
    return 'declined';
  }
  if (dates.prospecting_mandate_at != null) {
    return 'mandate';
  }
  if (dates.prospecting_collaboration_at != null) {
    return 'collaboration';
  }
  const since = dates.prospecting_collaboration_declined_at;
  if (counts(dates.prospecting_meeting_at, since)) {
    return 'meeting';
  }
  if (counts(dates.prospecting_handed_at, since)) {
    return 'handed';
  }
  return addressConfirmed ? 'ready' : 'to_confirm';
}

export const PROSPECTING_MOVES = [
  'handed',
  'meeting',
  'mandate',
  'collaboration',
  'collaboration_declined',
  'declined',
  'back',
] as const;
export type ProspectingMove = (typeof PROSPECTING_MOVES)[number];

export function isProspectingMove(value: unknown): value is ProspectingMove {
  return (PROSPECTING_MOVES as readonly unknown[]).includes(value);
}

export type ProspectingMoveResult =
  { ok: true; patch: Partial<ProspectingDates> } | { ok: false; error: string };

const refuse = (error: string): ProspectingMoveResult => ({ ok: false, error });

// Mission 98 — un confrère (exclusivité) se contacte par téléphone : « Marquer contacté » ne
// demande pas l'adresse du bien. C'est le même fait daté que « remis », et la suite est la même.
export function canMarkHanded(status: ProspectingStatus, step: ProspectingStep): boolean {
  return status === 'ready' || (status === 'to_confirm' && step === 'colleague');
}

export const COLLABORATION_AFTER_CONTACT_MESSAGE =
  'La collaboration se note après le contact du confrère.';
export const COLLEAGUE_NO_MEETING_MESSAGE =
  'Pour un confrère, notez la collaboration obtenue ou refusée.';

// Le changement demandé, depuis le statut COURANT (relu en base par l'action) : la date du
// fait qui arrive, ou null pour celui qu'on annule. Un saut de cran est refusé.
// Mission 115 — `step` est celui de la carte (« propriétaire » après un refus de collaboration) ;
// `refusedCollaboration` dit si un refus est posé, pour l'annuler quand il est le dernier fait.
export function applyProspectingMove(
  status: ProspectingStatus,
  move: ProspectingMove,
  now: string,
  step: ProspectingStep = 'check',
  refusedCollaboration = false,
): ProspectingMoveResult {
  if (move === 'handed') {
    return canMarkHanded(status, step)
      ? { ok: true, patch: { prospecting_handed_at: now } }
      : refuse('Seul un dossier prêt à envoyer peut être marqué remis.');
  }
  if (move === 'meeting') {
    if (status === 'handed' && step === 'colleague') {
      return refuse(COLLEAGUE_NO_MEETING_MESSAGE);
    }
    return status === 'handed'
      ? { ok: true, patch: { prospecting_meeting_at: now } }
      : refuse('Le rendez-vous se note après la remise du dossier.');
  }
  if (move === 'mandate') {
    return status === 'meeting'
      ? { ok: true, patch: { prospecting_mandate_at: now } }
      : refuse('Le mandat se note après le rendez-vous.');
  }
  if (move === 'collaboration' || move === 'collaboration_declined') {
    if (status !== 'handed' || step !== 'colleague') {
      return refuse(COLLABORATION_AFTER_CONTACT_MESSAGE);
    }
    return move === 'collaboration'
      ? { ok: true, patch: { prospecting_collaboration_at: now } }
      : { ok: true, patch: { prospecting_collaboration_declined_at: now } };
  }
  if (move === 'declined') {
    return status === 'mandate' || status === 'collaboration' || status === 'declined'
      ? refuse('«\u00a0Pas intéressé\u00a0» ne se note plus pour ce concurrent.')
      : { ok: true, patch: { prospecting_declined_at: now } };
  }
  // Retour d'un cran. Annuler « pas intéressé » n'efface que lui : le concurrent retrouve le
  // statut que disent ses autres dates (ou son adresse).
  if (status === 'declined') {
    return { ok: true, patch: { prospecting_declined_at: null } };
  }
  if (status === 'mandate') {
    return { ok: true, patch: { prospecting_mandate_at: null } };
  }
  if (status === 'collaboration') {
    return { ok: true, patch: { prospecting_collaboration_at: null } };
  }
  if (status === 'meeting') {
    return { ok: true, patch: { prospecting_meeting_at: null } };
  }
  if (status === 'handed') {
    return { ok: true, patch: { prospecting_handed_at: null } };
  }
  // Mission 115 — le refus de collaboration est le dernier fait : l'annuler rend le confrère
  // « contacté », avec sa date de contact.
  if (refusedCollaboration) {
    return { ok: true, patch: { prospecting_collaboration_declined_at: null } };
  }
  return refuse('Rien à annuler pour ce concurrent.');
}

// Relance conseillée : une semaine après la remise.
export const FOLLOW_UP_DELAY_DAYS = 7;

export function followUpDate(handedAt: string): string | null {
  const date = new Date(handedAt);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  date.setUTCDate(date.getUTCDate() + FOLLOW_UP_DELAY_DAYS);
  return date.toISOString();
}

// « 07/10 » — le jour vu de l'agence, pas du serveur.
export function shortDate(iso: string | null): string | null {
  if (!iso) {
    return null;
  }
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : formatDay(date, 'fr', 'short');
}

// Les quatre colonnes du tableau. « Pas intéressé » sort du tableau : compté à part.
// Mission 115 — une collaboration obtenue clôt la prospection : elle rejoint les mandats rentrés.
export const BOARD_COLUMNS = [
  { key: 'to_confirm', title: 'Adresse à confirmer', statuses: ['to_confirm'] },
  { key: 'ready', title: 'Prêt à envoyer', statuses: ['ready'] },
  { key: 'handed', title: 'Dossier remis', statuses: ['handed'] },
  {
    key: 'meeting',
    title: 'Rendez-vous, mandats & collaborations',
    statuses: ['meeting', 'mandate', 'collaboration'],
  },
] as const satisfies readonly {
  key: string;
  title: string;
  statuses: readonly ProspectingStatus[];
}[];

export type ProspectingCounters = {
  toCanvass: number; // concurrents à démarcher : le tableau, sans les collaborations closes
  handed: number; // dossiers remis ou confrères contactés, hors « pas intéressés »
  meetings: number; // rendez-vous obtenus (mandats compris), hors « pas intéressés »
  mandates: number; // mandats rentrés
  collaborations: number; // Mission 115 — collaborations obtenues, comptées à part
  declined: number; // pas intéressés, hors tableau
};

export function prospectingCounters(statuses: ProspectingStatus[]): ProspectingCounters {
  const count = (...wanted: ProspectingStatus[]) =>
    statuses.filter((status) => wanted.includes(status)).length;
  return {
    toCanvass: statuses.length - count('declined') - count('collaboration'),
    handed: count('handed', 'meeting', 'mandate', 'collaboration'),
    meetings: count('meeting', 'mandate'),
    mandates: count('mandate'),
    collaborations: count('collaboration'),
    declined: count('declined'),
  };
}

const plural = (count: number, singular: string, pluralForm: string): string =>
  `${count} ${count > 1 ? pluralForm : singular}`;

// « 1 prêt · 3 adresses à confirmer · 1 remis » — l'avancement d'un mandat, sous son bouton
// « Prospecter » du Suivi. Seuls les statuts présents sont dits.
export function prospectingProgress(statuses: ProspectingStatus[]): string | null {
  const count = (wanted: ProspectingStatus) =>
    statuses.filter((status) => status === wanted).length;
  const parts = [
    count('ready') > 0 ? plural(count('ready'), 'prêt', 'prêts') : null,
    count('to_confirm') > 0
      ? plural(count('to_confirm'), 'adresse à confirmer', 'adresses à confirmer')
      : null,
    count('handed') > 0 ? plural(count('handed'), 'remis', 'remis') : null,
    count('meeting') > 0 ? plural(count('meeting'), 'RDV obtenu', 'RDV obtenus') : null,
    count('mandate') > 0 ? plural(count('mandate'), 'mandat rentré', 'mandats rentrés') : null,
    count('collaboration') > 0
      ? plural(count('collaboration'), 'collaboration obtenue', 'collaborations obtenues')
      : null,
    count('declined') > 0 ? plural(count('declined'), 'pas intéressé', 'pas intéressés') : null,
  ].filter((part): part is string => part !== null);
  return parts.length > 0 ? parts.join(' · ') : null;
}
