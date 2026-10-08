import {
  missingForSearchMessage,
  type SearchRequirement,
} from '@/features/subject-property/services/search-requirements';

// MISSION 77 — ce que dit la barre d'enregistrement de la fiche. Une seule phrase à la fois,
// la plus bloquante d'abord : ce qui empêche d'enregistrer, puis ce qui empêche de partir vers
// la recherche, puis l'état (non enregistré / enregistré).
export type SaveBarState = {
  pending: boolean;
  dirty: boolean;
  saved: boolean;
  errorCount: number;
  missing: SearchRequirement[];
  error: string | null;
};

export type SaveBarStatus = {
  tone: 'neutral' | 'ok' | 'error';
  text: string;
  // Où mène un clic sur la phrase : le premier champ en erreur, ou le champ manquant.
  target: 'first_error' | SearchRequirement | null;
};

export function saveBarStatus(state: SaveBarState): SaveBarStatus {
  if (state.pending) {
    return { tone: 'neutral', text: 'Enregistrement…', target: null };
  }
  if (state.errorCount > 0) {
    const text =
      state.errorCount === 1 ? '1 champ à corriger' : `${state.errorCount} champs à corriger`;
    return { tone: 'error', text, target: 'first_error' };
  }
  if (state.error != null) {
    return { tone: 'error', text: state.error, target: null };
  }
  if (state.missing.length > 0) {
    return {
      tone: 'error',
      text: missingForSearchMessage(state.missing),
      target: state.missing[0],
    };
  }
  if (state.dirty) {
    return { tone: 'neutral', text: 'Modifications non enregistrées', target: null };
  }
  if (state.saved) {
    return { tone: 'ok', text: 'Enregistré', target: null };
  }
  return { tone: 'neutral', text: '', target: null };
}
