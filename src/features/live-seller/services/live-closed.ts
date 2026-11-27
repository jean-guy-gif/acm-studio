// Mission 109 — un dossier conclu ou archivé ne change plus par le Live : ses réponses sont des
// faits du Suivi (M53, M56). Seule la réouverture par un opérateur (M104) rouvre un Live — et
// elle est refusée sur un dossier conclu. La base l'interdit aussi (trigger de la migration
// `live_closed_after_conclusion`).
export const LIVE_CLOSED_STATUSES = ['meeting_completed', 'archived'] as const;

export const LIVE_CLOSED_MESSAGE = 'Rendez-vous terminé\u00a0: la réponse n’est pas enregistrée.';

export function isLiveClosed(status: string | null | undefined): boolean {
  return (LIVE_CLOSED_STATUSES as readonly string[]).includes(status ?? '');
}

// Mission 112 — un concurrent hors Live, ou plus retenu, ne reçoit pas de réponse du vendeur.
export const NOT_SHOWN_IN_LIVE_MESSAGE = 'Ce concurrent n’est pas montré pendant le Live.';
