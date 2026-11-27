import { isLiveClosed } from '@/features/live-seller/services/live-closed';

// Mission 111 — une décision de prix ne s'enregistre ni ne se supprime sur un dossier conclu ou
// archivé (décision de Laurent, 21/10) : la synthèse au vendeur et le Suivi disent les prix du
// rendez-vous, figés à la conclusion. Refusé à l'action et à l'écran.
export const DECISION_LOCKED_MESSAGE =
  'Rendez-vous conclu\u00a0: la décision de prix ne se modifie plus.';

export function isDecisionLocked(status: string | null | undefined): boolean {
  return isLiveClosed(status);
}
