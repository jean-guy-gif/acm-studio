// Mission 156 — la ligne d'information du lien « Vivre ici » d'un bien hors mandat (planches A3-1
// et A3-2) : une fois en tête du bloc du dossier acquéreur, une fois au moment du partage (le lien
// du dossier, la relance d'une sélection, « Confirmer la visite »), jamais sous chaque bien
// (retouche de Jean-Guy, 16/11). Pour le conseiller seul : l'acquéreur ne la lit pas. Pur.

export const LIVING_HERE_INFO = 'Ce lien montre la rue (sans numéro) et un repère à environ 100 m.';

// « « Vivre ici » du bien B, sur ce lien : », « « Vivre ici » des biens B et C, sur ce lien : ».
export function livingHereSharePrefix(letters: string[]): string {
  if (letters.length === 1) return `« Vivre ici » du bien ${letters[0]}, sur ce lien : `;
  const list = `${letters.slice(0, -1).join(', ')} et ${letters[letters.length - 1]}`;
  return `« Vivre ici » des biens ${list}, sur ce lien : `;
}

// Les liens « Vivre ici » n'ont pas pu être lus au moment de préparer un lien de sélection : rien
// n'est créé, le conseiller réessaie (un lien hors mandat ne part jamais sans la ligne
// d'information, Jean-Guy, 16/11).
export const LIVING_HERE_UNREAD_SHARE =
  'Les liens « Vivre ici » des biens n’ont pas pu être lus. Réessayez dans un instant.';

// La lettre d'un bien, celle du déroulé (A, B, C…, M122).
export function deckLetter(index: number): string {
  return ['A', 'B', 'C', 'D', 'E'][index] ?? String(index + 1);
}
