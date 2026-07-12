const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  preparation: 'En préparation',
  ready_for_meeting: 'Prêt pour le rendez-vous',
  meeting_completed: 'Rendez-vous terminé',
  archived: 'Archivé',
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}
