import { priceOrSurfaceToVerifyLabel } from '@/features/imported-fields/services/fields-to-verify';

// Mission 104 — ce que « Lancer le Live » vérifie avant d'ouvrir la scène, partout où il est
// proposé (liste du Live, fiche du dossier, « Avant le rendez-vous »). Pur.
//   • aucun concurrent retenu : on ne lance pas, et on dit pourquoi ;
//   • un ou deux : on lance, après l'avoir dit — la lecture du marché sera fragile ;
//   • des prix ou des surfaces encore à vérifier : rappelés, rien n'est bloqué ;
//   • un vrai dossier (pas le dossier d'exemple) : le conseiller confirme qu'il est devant le
//     vendeur — ses réponses seront figées (M92).
// Aucun autre blocage : le choix reste au conseiller.

export const NO_COMPETITOR_REASON = 'Retenez au moins un concurrent pour lancer le Live';
export const FEW_COMPETITORS_WARNING = 'Peu de concurrents : la lecture du marché sera fragile.';
export const REAL_DOSSIER_CONFIRMATION =
  'Vous êtes devant le vendeur ? Ses réponses seront enregistrées pour de bon. Pour vous entraîner, ouvrez le dossier d’exemple.';
// Sur « Avant le rendez-vous », près du bouton : la même chose, dite avant le clic.
export const REAL_DOSSIER_NOTE =
  'Devant le vendeur, ses réponses sont enregistrées pour de bon. Pour vous entraîner, ouvrez le dossier d’exemple.';
// Mission 108 — une décision de prix périmée est rappelée, sans bloquer : devant le vendeur, le
// « Prix des concurrents » est alors le calcul du jour, pas le prix de la décision.
export const OUTDATED_DECISION_NOTICE =
  'Décision de prix à actualiser : le marché a changé depuis votre décision. Le vendeur verra le prix des concurrents calculé aujourd’hui.';
export const LAUNCH_FOR_REAL_LABEL = 'Lancer devant le vendeur';
export const OPEN_EXAMPLE_LABEL = 'Ouvrir le dossier d’exemple';

// Au-dessous de trois concurrents (la règle « prêt », M52), la lecture du marché est fragile.
const FEW_COMPETITORS_BELOW = 3;

export type LiveLaunchCheck =
  | { status: 'blocked'; reason: string }
  // `confirm` : la confirmation « devant le vendeur » ; `notices` : ce qui est rappelé avant.
  | { status: 'ask'; confirm: boolean; notices: string[] }
  | { status: 'go' };

export function liveLaunchCheck(input: {
  competitorCount: number;
  isExample: boolean;
  // Concurrents retenus dont le prix ou la surface reste à vérifier.
  toVerifyCount: number;
  // Mission 108 — la décision de prix enregistrée ne correspond plus au marché.
  decisionOutdated?: boolean;
}): LiveLaunchCheck {
  if (input.competitorCount <= 0) {
    return { status: 'blocked', reason: NO_COMPETITOR_REASON };
  }
  const notices = [
    input.competitorCount < FEW_COMPETITORS_BELOW ? FEW_COMPETITORS_WARNING : null,
    toVerifyNotice(input.toVerifyCount),
    input.decisionOutdated ? OUTDATED_DECISION_NOTICE : null,
  ].filter((notice): notice is string => notice != null);
  const confirm = !input.isExample;
  return confirm || notices.length > 0 ? { status: 'ask', confirm, notices } : { status: 'go' };
}

function toVerifyNotice(count: number): string | null {
  const label = priceOrSurfaceToVerifyLabel(count);
  return label ? `${label} : ils entrent tels quels dans le prix des concurrents.` : null;
}
