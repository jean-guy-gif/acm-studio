import { isOperatorEmail } from '@/features/operations/services/operators';

// Mission 151 — la lecture par l'IA (des notes, et le classement des annonces) s'ouvre AGENCE PAR
// AGENCE, sans redéploiement (décision de Jean-Guy, 12/11) : par le plafond d'IA qu'un opérateur
// pose en bas de `/erreurs` (`agency_ai_budgets`). Sans plafond posé, ou à 0 €, elle est fermée ;
// au-dessus, ouverte. Le texte de confidentialité attend l'accord de la juriste : aucune agence ne
// s'ouvre sans la décision de Jean-Guy. Restent ouverts :
//   - l'agence de démonstration, dont la lecture est simulée (aucun appel, M114) ;
//   - les opérateurs (`ACM_OPERATOR_EMAILS`, M100), pour l'essai manuel que Jean-Guy déclenche
//     lui-même sur le vrai modèle.
// Une lecture du plafond en échec vaut « fermé » (M98 : on ne paie pas sur une panne). Pur.
export function notesReadingOpen(input: {
  isDemo: boolean;
  email: string | null | undefined;
  // Le plafond posé par un opérateur, en centimes ; null : aucun, ou illisible.
  agencyCapCents: number | null;
}): boolean {
  if (input.isDemo || isOperatorEmail(input.email)) return true;
  return input.agencyCapCents != null && input.agencyCapCents > 0;
}
