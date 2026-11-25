// La refonte, lot B — Acquéreurs s'ouvre sur « à faire aujourd'hui » ; la liste entière des fiches
// (M117, M146 B) est derrière « Tous mes acquéreurs ». Une adresse qui porte déjà une vue
// (`?vue=agence`), un filtre (`?etat=`), une recherche (`?q=`) ou l'avis d'une fiche archivée
// (`?archive=`) ouvre la liste, comme avant : un lien envoyé mène toujours au même endroit. Pur.
export const ALL_BUYERS_HREF = '/acquereurs?tous=1';

const LIST_PARAMS = ['q', 'archive', 'vue', 'etat', 'tous'] as const;

export function showsAllBuyers(query: Partial<Record<string, string | undefined>>): boolean {
  return LIST_PARAMS.some((key) => query[key] != null);
}
