// Mission 151 — le budget d'IA d'une agence (lecture des notes, classement des annonces) : 10 € par
// mois par défaut (Jean-Guy, 10/11), réglé par un opérateur en bas de `/erreurs` (M100), lu par le
// manager, jamais réglé par lui (M55). Comme Stream Estate : réservé avant l'appel, réglé après
// (M105). Pur.
export const AI_DEFAULT_MONTHLY_CAP_CENTS = 1000;
export const AI_CAP_MAX_EUROS = 1000;

// Les issues d'une lecture, gardées sur sa ligne (`ai_usage.outcome`).
export const AI_OUTCOMES = [
  'pending',
  'created',
  'completed',
  'cancelled',
  'failed',
  'ranked',
] as const;
export type AiOutcome = (typeof AI_OUTCOMES)[number];
