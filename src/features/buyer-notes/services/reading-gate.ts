import { isOperatorEmail } from '@/features/operations/services/operators';

// Mission 151 — la lecture des notes reste FERMÉE tant que la juriste n'a pas validé le texte de
// confidentialité (décision de Jean-Guy, 12/11) : rien n'en est ouvert aux conseillers, ni en
// production ni sur l'essai. Restent ouverts :
//   - l'agence de démonstration, dont la lecture est simulée (aucun appel, M114) ;
//   - les opérateurs (`ACM_OPERATOR_EMAILS`, M100), pour l'essai manuel que Jean-Guy déclenche
//     lui-même sur le vrai modèle — le seul appel réel hors d'une agence ouverte.
// La basculer à `true` après l'accord de la juriste, et seulement alors, ouvre la lecture à tous.
export const NOTES_READING_OPEN = false;

export function notesReadingOpen(input: {
  isDemo: boolean;
  email: string | null | undefined;
  open?: boolean;
}): boolean {
  if (input.open ?? NOTES_READING_OPEN) return true;
  return input.isDemo || isOperatorEmail(input.email);
}
