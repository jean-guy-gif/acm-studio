// La refonte, lot A — le rond aux initiales d'une personne (maquettes REFONTE-1, 5, 7 et 8). Lot F
// (Jean-Guy, 26/11) — les initiales viennent des NOMS DE FAMILLE, jamais d'une civilité ni de
// « Famille » : « M. et Mme Lambert-Duval » → LD (un nom composé donne ses deux lettres), « M.
// Girard et Mme Chevalier » → GC, « Famille Keller » → K, « M. et Mme Rossi » → R. Les fiches
// n'ont pas de prénom (M119) : un nom tapé avec son prénom (« Jean Dupont ») donne JD. Deux lettres
// au plus. Sa teinte suit la tâche, pas le nom (`tone.ts`).

// Ce qui n'est pas un nom de famille : les civilités, « Famille », les mots qui les relient, le mot
// « Exemple » du dossier d'exemple (M97). Comparés sans casse ni point final.
const NOT_A_NAME = new Set([
  'm',
  'mm',
  'mme',
  'mmes',
  'mlle',
  'mlles',
  'monsieur',
  'madame',
  'mademoiselle',
  'messieurs',
  'mesdames',
  'mr',
  'mrs',
  'ms',
  'miss',
  'dr',
  'me',
  'famille',
  'couple',
  'consorts',
  'et',
  'and',
  'exemple',
]);

// Les particules en minuscules (« de », « du ») ne donnent pas de lettre.
const PARTICLES = new Set(['de', 'du', 'des', 'd', 'van', 'von', 'da', 'di']);

const letters = (word: string) => word.replace(/[^\p{L}]/gu, '');

export function initialsOf(name: string): string {
  const words = name
    .split(/[\s·,&/]+/)
    .map((word) => word.replace(/[.’']+$/u, ''))
    .filter((word) => letters(word) !== '');
  if (words.length === 0) return '?';
  const family = words.filter(
    (word) =>
      !NOT_A_NAME.has(letters(word).toLowerCase()) &&
      !(word === word.toLowerCase() && PARTICLES.has(letters(word))),
  );
  // Rien d'autre qu'une civilité (« Famille ») : sa première lettre, plutôt qu'un rond vide.
  if (family.length === 0) return letters(words[0]!).charAt(0).toUpperCase() || '?';
  // Un nom composé (« Lambert-Duval ») : une lettre par partie.
  const parts = family
    .flatMap((word) => word.split(/[-‐–]+/))
    .map(letters)
    .filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase();
}
