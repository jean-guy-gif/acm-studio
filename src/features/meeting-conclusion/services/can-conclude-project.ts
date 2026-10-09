// Mission 81 — un rendez-vous réellement mené ne se perd jamais. « Lancer le Live » est
// proposé quel que soit le statut du dossier : la conclusion s'ouvre donc pour un dossier
// en préparation (draft), prêt (ready_for_meeting) ou déjà conclu (meeting_completed, pour
// corriger l'issue). Liste d'autorisation : `archived` (soft delete) et tout statut inconnu
// restent fermés. La page et l'action passent toutes deux par ici.
const CONCLUDABLE_STATUSES: readonly string[] = ['draft', 'ready_for_meeting', 'meeting_completed'];

export function canConcludeProject(status: string): boolean {
  return CONCLUDABLE_STATUSES.includes(status);
}
