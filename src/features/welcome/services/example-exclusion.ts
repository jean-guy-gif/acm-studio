// Mission 97 — un dossier d'exemple se VOIT (badge « Exemple ») mais ne COMPTE pas : ni dans les
// tuiles et compteurs du Suivi, ni dans « à relancer aujourd'hui », ni dans la Prospection, ni
// dans la vue du manager. Pur : une seule règle, appliquée partout où l'on compte.
type MaybeExample = { project: { is_example?: boolean | null } };

export function isExampleDossier(dossier: MaybeExample): boolean {
  return dossier.project.is_example === true;
}

export function withoutExamples<T extends MaybeExample>(dossiers: T[]): T[] {
  return dossiers.filter((dossier) => !isExampleDossier(dossier));
}

export const EXAMPLE_SEARCH_MESSAGE =
  'Dossier d’exemple\u00a0: la recherche du marché est coupée. Ses concurrents fictifs sont déjà là.';
