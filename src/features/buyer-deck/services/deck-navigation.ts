import { clientTexts, type TextLanguage } from '@/lib/client-texts';
import type { ItemAnswer, ItemResponse } from '@/features/buyer-deck/types';

// Mission 122 (essai de Jean-Guy, 25/10) — la navigation de la présentation, LIBRE : depuis la
// grille, on ouvre n'importe quel bien ; de chaque bien, on revient à la grille, ou l'on passe au
// précédent ou au suivant. « Suivant » ne mène JAMAIS à « Sa réponse » : on y passe par un bouton
// distinct, « Passer à ses disponibilités ». Répondre sur un bien ne fait jamais avancer. Service
// pur : la scène ne fait que l'afficher.
export type DeckScreen =
  { type: 'words' } | { type: 'grid' } | { type: 'item'; index: number } | { type: 'answer' };

export const WORDS: DeckScreen = { type: 'words' };
export const GRID: DeckScreen = { type: 'grid' };
export const ANSWER: DeckScreen = { type: 'answer' };

// L'écran qui suit : ses mots → la grille → le premier bien → … → le dernier bien ; rien après le
// dernier bien, ni depuis « Sa réponse ».
export function nextScreen(screen: DeckScreen, itemCount: number): DeckScreen | null {
  switch (screen.type) {
    case 'words':
      return GRID;
    case 'grid':
      return itemCount > 0 ? { type: 'item', index: 0 } : null;
    case 'item':
      return screen.index + 1 < itemCount ? { type: 'item', index: screen.index + 1 } : null;
    case 'answer':
      return null;
  }
}

// L'écran d'avant : un bien → le précédent, le premier bien → la grille, la grille → ses mots,
// « Sa réponse » → la grille.
export function previousScreen(screen: DeckScreen): DeckScreen | null {
  switch (screen.type) {
    case 'words':
      return null;
    case 'grid':
      return WORDS;
    case 'item':
      return screen.index > 0 ? { type: 'item', index: screen.index - 1 } : GRID;
    case 'answer':
      return GRID;
  }
}

// La place d'un écran dans la barre d'avancement (ses mots, la grille, les biens, sa réponse).
export function screenPosition(screen: DeckScreen, itemCount: number): number {
  switch (screen.type) {
    case 'words':
      return 0;
    case 'grid':
      return 1;
    case 'item':
      return 2 + screen.index;
    case 'answer':
      return 2 + itemCount;
  }
}

// La réponse déjà donnée à un bien, pour sa colonne de la grille.
export function answerOf(itemId: string, responses: ItemResponse[]): ItemAnswer | null {
  return responses.find((response) => response.itemId === itemId)?.answer ?? null;
}

// Les lettres des biens encore sans réponse, dans l'ordre de la sélection.
export function unansweredLetters(
  items: { letter: string; itemId: string }[],
  responses: ItemResponse[],
): string[] {
  return items
    .filter((item) => answerOf(item.itemId, responses) == null)
    .map((item) => item.letter);
}

// Mission 140 — dans la langue de l'acquéreur (le français par défaut).
const unansweredQuestion = (
  letters: string[],
  verb: 'finish' | 'send',
  language: TextLanguage,
): string | null =>
  letters.length === 0 ? null : clientTexts(language).buyer.screens.unanswered(letters, verb);

// « 2 biens sans réponse : A et B. Terminer quand même ? » ; null quand tout a une réponse.
export function finishConfirmation(
  letters: string[],
  language: TextLanguage = 'fr',
): string | null {
  return unansweredQuestion(letters, 'finish', language);
}

// Mission 122 (partie B, décision de Jean-Guy, 25/10) — sur le lien, l'envoi est définitif :
// « 2 biens sans réponse : A et B. Envoyer quand même ? » ; null quand tout a une réponse.
export function sendConfirmation(letters: string[], language: TextLanguage = 'fr'): string | null {
  return unansweredQuestion(letters, 'send', language);
}
