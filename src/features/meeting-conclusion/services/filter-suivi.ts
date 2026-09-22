import type { SuiviDossier } from '@/features/meeting-conclusion/queries/get-suivi-dossiers';
import type { ConclusionOutcome } from '@/features/meeting-conclusion/types';

// Mission 54 §2 — le filtre par issue, PUR. `null` = « Tous » (aucune issue masquée).
// Aucune issue n'est cachée sans que le filtre le dise : « Tous » les rend tous.
export function filterSuiviByIssue(
  dossiers: SuiviDossier[],
  issue: ConclusionOutcome | null,
): SuiviDossier[] {
  if (issue == null) {
    return dossiers;
  }
  return dossiers.filter((dossier) => dossier.conclusion?.outcome === issue);
}
