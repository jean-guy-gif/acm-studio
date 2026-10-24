// Mission 118 (partie A) — l'interrupteur Vendeur | Acquéreur, en tête du menu : il ne change que
// le menu, jamais les droits ni les données. Mémorisé par conseiller (`profiles.workspace_mode`).
export const WORKSPACE_MODES = ['seller', 'buyer'] as const;
export type WorkspaceMode = (typeof WORKSPACE_MODES)[number];

export const WORKSPACE_MODE_LABELS: Record<WorkspaceMode, string> = {
  seller: 'Vendeur',
  buyer: 'Acquéreur',
};

export function isWorkspaceMode(value: unknown): value is WorkspaceMode {
  return typeof value === 'string' && (WORKSPACE_MODES as readonly string[]).includes(value);
}

// Une valeur inconnue (base d'avant la mission, lecture en échec) vaut Vendeur : le menu d'avant.
export function parseWorkspaceMode(value: unknown): WorkspaceMode {
  return isWorkspaceMode(value) ? value : 'seller';
}
