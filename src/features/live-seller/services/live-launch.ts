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
// prix décidé reste montré, « Prix retenu par votre conseiller », jamais le calcul du jour.
export const OUTDATED_DECISION_NOTICE =
  'Décision de prix à actualiser : le marché a changé depuis votre décision. Le vendeur verra le prix que vous avez décidé.';
// Mission 109 — aucune décision de prix enregistrée : le vendeur ne verra aucun prix final. Dit au
// lancement, avec un lien vers « Avant le rendez-vous » ; le lancement reste possible.
export const NO_DECISION_NOTICE =
  'Aucune décision de prix : le vendeur ne verra pas de prix final. Décidez votre prix avant le rendez-vous';
// Mission 152 — les annonces des concurrents n'ont pas été vérifiées depuis plus de 24 h : rappelé
// au lancement, sans bloquer (M52), avec « Avant le rendez-vous » où se fait la vérification.
export const LISTINGS_CHECK_NOTICE =
  'Annonces des concurrents non vérifiées depuis plus de 24 h : un prix a pu changer, une annonce a pu disparaître';
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
  // Mission 109 — aucune décision de prix n'est enregistrée.
  decisionMissing?: boolean;
  // Mission 112 — concurrents retenus qui attendent encore leur import (M101).
  pendingImportCount?: number;
  // Mission 152 — aucune vérification des annonces depuis plus de 24 h.
  listingsCheckStale?: boolean;
}): LiveLaunchCheck {
  if (input.competitorCount <= 0) {
    return { status: 'blocked', reason: NO_COMPETITOR_REASON };
  }
  const notices = [
    input.competitorCount < FEW_COMPETITORS_BELOW ? FEW_COMPETITORS_WARNING : null,
    toVerifyNotice(input.toVerifyCount),
    input.decisionMissing ? NO_DECISION_NOTICE : null,
    input.decisionOutdated ? OUTDATED_DECISION_NOTICE : null,
    pendingImportsNotice(input.pendingImportCount ?? 0),
    input.listingsCheckStale ? LISTINGS_CHECK_NOTICE : null,
  ].filter((notice): notice is string => notice != null);
  const confirm = !input.isExample;
  return confirm || notices.length > 0 ? { status: 'ask', confirm, notices } : { status: 'go' };
}

function toVerifyNotice(count: number): string | null {
  const label = priceOrSurfaceToVerifyLabel(count);
  return label ? `${label} : ils entrent tels quels dans le prix des concurrents.` : null;
}

// Mission 112 — des concurrents retenus attendent encore leur import (M101, M108) : rappelé avant
// de déclarer prêt et de lancer le Live, sans rien bloquer (M52).
export function pendingImportsNotice(count: number): string | null {
  if (count <= 0) return null;
  return count === 1
    ? '1 concurrent retenu attend son import'
    : `${count} concurrents retenus attendent leur import`;
}

// Mission 112 — l'adresse du Live ne s'ouvre jamais sans ses contrôles. Un vrai dossier dont le
// Live n'a pas commencé passe par l'étape « Lancer le Live » (M107) tant que la confirmation
// « devant le vendeur » n'est pas enregistrée (M104), ou qu'au-delà de 6 concurrents retenus leur
// choix n'est pas fait (M110). Un Live commencé se reprend sans rien demander ; le dossier
// d'exemple n'a pas de confirmation, mais garde le choix des 6.
export function liveEntryGate(input: {
  isExample: boolean;
  started: boolean;
  confirmedAt: string | null;
  shortlistPending: boolean;
}): 'open' | 'confirm' {
  if (input.started) return 'open';
  if (input.shortlistPending) return 'confirm';
  if (!input.isExample && input.confirmedAt == null) return 'confirm';
  return 'open';
}

// Mission 146 — la liste du Live : d'abord les dossiers prêts pour le Live, ceux dont « Lancer le
// Live » s'ouvre (au moins un concurrent retenu, pas en « Document seul », M104, M131 ; un Live
// commencé compris, « Reprendre »), puis les autres ; dans chaque groupe, du plus récemment modifié
// au plus ancien. Seul le premier dossier prêt garde le bouton plein (M143). Pur.
export function liveListOrder<
  T extends { updatedAt: string; competitorCount: number; documentOnly: boolean },
>(rows: T[]): { row: T; launchable: boolean; primary: boolean }[] {
  const launchable = (row: T) => row.competitorCount > 0 && !row.documentOnly;
  const sorted = rows
    .map((row, index) => ({ row, index, launchable: launchable(row) }))
    .sort(
      (a, b) =>
        Number(b.launchable) - Number(a.launchable) ||
        b.row.updatedAt.localeCompare(a.row.updatedAt) ||
        a.index - b.index,
    );
  return sorted.map(({ row, launchable: canLaunch }, position) => ({
    row,
    launchable: canLaunch,
    primary: position === 0 && canLaunch,
  }));
}
