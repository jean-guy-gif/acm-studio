// Mission 71 — UNE comparaison des communes pour tout l'outil (classement, score, géocodage, code
// INSEE). « St Laurent du Var », « SAINT-LAURENT-DU-VAR » et « Saint-Laurent-du-Var » sont la même
// commune : accents, casse, tirets, apostrophes, St/Ste → Saint/Sainte. Avant, le classement
// comparait les noms à la casse près : un bien vendeur écrit « St Laurent du Var » écartait tous
// les biens Stream Estate « Saint-Laurent-du-Var » — et le bouton d'import groupé disparaissait.

export function normalizeCommuneName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[-'’]/g, ' ')
    .replace(/\bst\b/g, 'saint')
    .replace(/\bste\b/g, 'sainte')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// La clé de comparaison ; null pour une commune absente ou vide.
export function communeKey(value: string | null | undefined): string | null {
  if (value == null) return null;
  const key = normalizeCommuneName(value);
  return key === '' ? null : key;
}
