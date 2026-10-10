// Mission 86 — où en est la prospection d'un concurrent. Pur.
//
// « À confirmer » et « prêt » se DÉDUISENT de l'adresse, comme avant la mission ; « remis »,
// « rendez-vous obtenu », « mandat rentré » et « pas intéressé » sont des faits datés, posés par
// le conseiller. On avance d'un cran à la fois, et on revient d'un cran (erreur de clic).

export type ProspectingStatus =
  'to_confirm' | 'ready' | 'handed' | 'meeting' | 'mandate' | 'declined';

export type ProspectingDates = {
  prospecting_handed_at: string | null;
  prospecting_meeting_at: string | null;
  prospecting_mandate_at: string | null;
  prospecting_declined_at: string | null;
};

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
  if (dates.prospecting_meeting_at != null) {
    return 'meeting';
  }
  if (dates.prospecting_handed_at != null) {
    return 'handed';
  }
  return addressConfirmed ? 'ready' : 'to_confirm';
}

export const PROSPECTING_MOVES = ['handed', 'meeting', 'mandate', 'declined', 'back'] as const;
export type ProspectingMove = (typeof PROSPECTING_MOVES)[number];

export function isProspectingMove(value: unknown): value is ProspectingMove {
  return (PROSPECTING_MOVES as readonly unknown[]).includes(value);
}

export type ProspectingMoveResult =
  { ok: true; patch: Partial<ProspectingDates> } | { ok: false; error: string };

const refuse = (error: string): ProspectingMoveResult => ({ ok: false, error });

// Le changement demandé, depuis le statut COURANT (relu en base par l'action) : la date du
// fait qui arrive, ou null pour celui qu'on annule. Un saut de cran est refusé.
export function applyProspectingMove(
  status: ProspectingStatus,
  move: ProspectingMove,
  now: string,
): ProspectingMoveResult {
  if (move === 'handed') {
    return status === 'ready'
      ? { ok: true, patch: { prospecting_handed_at: now } }
      : refuse('Seul un dossier prêt à envoyer peut être marqué remis.');
  }
  if (move === 'meeting') {
    return status === 'handed'
      ? { ok: true, patch: { prospecting_meeting_at: now } }
      : refuse('Le rendez-vous se note après la remise du dossier.');
  }
  if (move === 'mandate') {
    return status === 'meeting'
      ? { ok: true, patch: { prospecting_mandate_at: now } }
      : refuse('Le mandat se note après le rendez-vous.');
  }
  if (move === 'declined') {
    return status === 'handed'
      ? { ok: true, patch: { prospecting_declined_at: now } }
      : refuse('« Pas intéressé » se note après la remise du dossier.');
  }
  // Retour d'un cran.
  if (status === 'declined') {
    return { ok: true, patch: { prospecting_declined_at: null } };
  }
  if (status === 'mandate') {
    return { ok: true, patch: { prospecting_mandate_at: null } };
  }
  if (status === 'meeting') {
    return { ok: true, patch: { prospecting_meeting_at: null } };
  }
  if (status === 'handed') {
    return { ok: true, patch: { prospecting_handed_at: null } };
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
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        timeZone: 'Europe/Paris',
      });
}

// Les quatre colonnes du tableau. « Pas intéressé » sort du tableau : compté à part.
export const BOARD_COLUMNS = [
  { key: 'to_confirm', title: 'Adresse à confirmer', statuses: ['to_confirm'] },
  { key: 'ready', title: 'Prêt à envoyer', statuses: ['ready'] },
  { key: 'handed', title: 'Dossier remis', statuses: ['handed'] },
  { key: 'meeting', title: 'Rendez-vous & mandats', statuses: ['meeting', 'mandate'] },
] as const satisfies readonly {
  key: string;
  title: string;
  statuses: readonly ProspectingStatus[];
}[];

export type ProspectingCounters = {
  toCanvass: number; // concurrents à démarcher : tout le tableau
  handed: number; // dossiers remis (qu'un rendez-vous ait suivi ou non)
  meetings: number; // rendez-vous obtenus (mandats compris)
  mandates: number; // mandats rentrés
  declined: number; // pas intéressés, hors tableau
};

export function prospectingCounters(statuses: ProspectingStatus[]): ProspectingCounters {
  const count = (...wanted: ProspectingStatus[]) =>
    statuses.filter((status) => wanted.includes(status)).length;
  return {
    toCanvass: statuses.length - count('declined'),
    handed: count('handed', 'meeting', 'mandate'),
    meetings: count('meeting', 'mandate'),
    mandates: count('mandate'),
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
    count('declined') > 0 ? plural(count('declined'), 'pas intéressé', 'pas intéressés') : null,
  ].filter((part): part is string => part !== null);
  return parts.length > 0 ? parts.join(' · ') : null;
}
