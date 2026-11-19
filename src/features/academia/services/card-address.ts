// Correctifs 161 — ce que la carte « Le bien dans Academia » sait de l'adresse du bien : la carte
// travaille sur l'adresse ENREGISTRÉE (M147 A) ; tant que celle que le conseiller tape sur la fiche
// n'est pas enregistrée, elle le dit (« Enregistrez d'abord la fiche »), au lieu de « Il faut
// l'adresse du bien » ou d'un lien sur l'ancienne adresse (maquette C161-1). Pur.
//
// `typed` : l'adresse tapée, tant que la fiche a des modifications non enregistrées ; `undefined`
// quand la fiche est telle qu'en base.
export type CardAddressState = 'saved' | 'missing' | 'save_first';

export function cardAddressState(
  saved: string | null,
  typed: string | null | undefined,
): CardAddressState {
  if (typed !== undefined && typed !== saved) return 'save_first';
  return saved ? 'saved' : 'missing';
}

// Ce que la fiche dit à la carte : l'adresse tapée tant qu'elle a des modifications non
// enregistrées, rien sinon (la carte suit alors l'adresse enregistrée, relue par la page).
export function reportedDraft(dirty: boolean, typed: string | null): string | null | undefined {
  return dirty ? typed : undefined;
}

// Sur la carte de l'API : une fiche sans adresse (`new`) ou une adresse modifiée (`changed`).
export function saveFirstKind(
  state: CardAddressState,
  savedAddress: string | null,
): 'new' | 'changed' | null {
  if (state !== 'save_first') return null;
  return savedAddress ? 'changed' : 'new';
}

// Correctifs 161 (maquette C161-1, Jean-Guy, 19/11) — « Coller le lien à la main » n'est proposé que
// quand Academia ne répond pas (panne, coupure, préparation en échec), que le plafond est atteint,
// ou après les 2 minutes d'attente ; jamais pour une adresse introuvable ou ambiguë, ni pour un lien
// expiré (« Créer un lien neuf »).
export function showsFallback(view: {
  readonly kind: string;
  readonly gaveUp?: boolean;
  readonly [field: string]: unknown;
}): boolean {
  return view.kind === 'failed' || (view.kind === 'waiting' && view.gaveUp === true);
}
