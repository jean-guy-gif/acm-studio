// La refonte, lot A — le rond aux initiales d'une personne (maquettes REFONTE-1, 5, 7 et 8) : la
// première lettre du premier mot et celle du dernier (« M. et Mme Moreau » → MM, « Mme Rossi » →
// MR, « Famille Keller » → FK) ; un seul mot : ses deux premières lettres. Les fiches n'ont pas de
// prénom (M119) : on ne devine rien.
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

// Trois teintes, comme sur les maquettes : le bleu de l'agence, un vert, un orange. La teinte suit
// le nom (toujours la même pour une même personne), jamais un état : ce n'est pas une couleur de
// sens.
export const INITIALS_TINTS = [
  'bg-brand-soft text-brand-deep stage:bg-brand/15 stage:text-brand',
  'bg-[#E3F4EC] text-[#0B6B4A] stage:bg-emerald-400/15 stage:text-emerald-300',
  'bg-[#FDEBDD] text-[#9A3A0A] stage:bg-orange-400/15 stage:text-orange-300',
] as const;

export function initialsTint(name: string): string {
  let sum = 0;
  for (const char of name) sum = (sum + (char.codePointAt(0) ?? 0)) % 9973;
  return INITIALS_TINTS[sum % INITIALS_TINTS.length];
}
