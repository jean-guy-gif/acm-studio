// Common diagnostic status vocabulary (kept in sync with the migration CHECK).
export const DIAGNOSTIC_STATUSES = [
  'not_required',
  'not_done',
  'in_progress',
  'clear',
  'anomaly',
  'positive',
  'negative',
  'unknown',
] as const;

export type DiagnosticStatus = (typeof DIAGNOSTIC_STATUSES)[number];

export const DIAGNOSTIC_STATUS_LABELS: Record<DiagnosticStatus, string> = {
  not_required: 'Non requis',
  not_done: 'Non réalisé',
  in_progress: 'En cours',
  clear: 'Conforme',
  anomaly: 'Anomalie',
  positive: 'Positif',
  negative: 'Négatif',
  unknown: 'Non renseigné',
};

// Maximum forward window for declarative dates (Mission 22 MVP rule).
export const MAX_FUTURE_YEARS = 5;

export const MAX_DIAGNOSTIC_NOTES_LENGTH = 2000;
export const MIN_ENERGY_CONSUMPTION = 0;
export const MAX_ENERGY_CONSUMPTION = 2000;
export const MIN_GES_EMISSIONS = 0;
export const MAX_GES_EMISSIONS = 500;
