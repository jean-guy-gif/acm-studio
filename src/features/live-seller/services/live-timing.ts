// Mission 95 — mesurer la durée réelle d'un Live, et tenir son rythme.
//
// Le Live relève son heure de début (au premier écran après l'introduction) et son heure de fin
// (« Terminer le rendez-vous »). Le début ne se réécrit jamais — la base le garantit — : une
// reprise après « Rendez-vous en pause » compte dans la durée. Écran conseiller seulement.

// La durée, en minutes entières ; null tant que l'une des deux heures manque.
export function liveDurationMinutes(
  startedAt: string | null | undefined,
  endedAt: string | null | undefined,
): number | null {
  if (!startedAt || !endedAt) {
    return null;
  }
  const start = new Date(startedAt).getTime();
  const end = new Date(endedAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
    return null;
  }
  return Math.max(1, Math.round((end - start) / 60_000));
}

// « Durée du Live : 41 min » — ou rien, quand elle n'a pas été mesurée (rien n'est inventé).
export function liveDurationLabel(
  startedAt: string | null | undefined,
  endedAt: string | null | undefined,
): string | null {
  const minutes = liveDurationMinutes(startedAt, endedAt);
  return minutes == null ? null : `Durée du Live : ${minutes} min`;
}

// Le rythme se choisit AVANT le Live. Une fois le Live commencé — une heure de début relevée,
// ou une réponse du vendeur déjà enregistrée (Lives d'avant la mission) — il ne se modifie plus.
export function canChangeLiveRhythm(state: {
  liveStartedAt: string | null | undefined;
  hasSellerAnswers: boolean;
}): boolean {
  return state.liveStartedAt == null && !state.hasSellerAnswers;
}

export const RHYTHM_LOCKED_MESSAGE = 'Le Live a commencé : le rythme ne se modifie plus.';
// Mission 110 — l'ordre des concurrents suit la même règle : une fois le Live commencé, les
// flèches et le glisser-déposer sont désactivés, et l'écran le dit.
export const LIVE_ORDER_FROZEN = 'Ordre figé : le Live a commencé';
