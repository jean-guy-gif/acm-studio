// La refonte, lot A — le rond aux initiales d'une personne (maquettes REFONTE-1, 5, 7 et 8) : la
// première lettre du premier mot et celle du dernier (« M. et Mme Moreau » → MM, « Mme Rossi » →
// MR, « Famille Keller » → FK) ; un seul mot : ses deux premières lettres. Les fiches n'ont pas de
// prénom (M119) : on ne devine rien. Sa teinte suit la tâche, pas le nom (`tone.ts`).
const letters = (word: string) => word.replace(/[^\p{L}]/gu, '');

export function initialsOf(name: string): string {
  const words = name
    .split(/[\s·,]+/)
    .map(letters)
    .filter((word) => word !== '');
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}
