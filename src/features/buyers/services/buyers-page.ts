// La refonte, lot B — Acquéreurs s'ouvre sur « à faire aujourd'hui » ; la liste entière des fiches
// (M117, M146 B) est derrière « Tous mes acquéreurs ». Une adresse qui porte déjà une vue
// (`?vue=agence`), un filtre (`?etat=`), une recherche (`?q=`) ou l'avis d'une fiche archivée
// (`?archive=`) ouvre la liste, comme avant : un lien envoyé mène toujours au même endroit. Pur.
export const ALL_BUYERS_HREF = '/acquereurs?tous=1';
// Remarques de Jean-Guy (26/11) — « Tous les acquéreurs de l'agence » : la liste dans la vue
// « Toute l'agence » (M146 B).
export const AGENCY_BUYERS_HREF = '/acquereurs?vue=agence';

const LIST_PARAMS = ['q', 'archive', 'vue', 'etat', 'tous'] as const;

export function showsAllBuyers(query: Partial<Record<string, string | undefined>>): boolean {
  return LIST_PARAMS.some((key) => query[key] != null);
}

// La liste entière garde dans son adresse la vue, le filtre et la recherche (un lien envoyé,
// `?vue=agence`, `?q=`) — et « tous=1 » quand plus rien d'autre ne la désigne : sans lui, vider la
// recherche ou revenir à « Mes fiches » puis recharger la page ouvrirait « à faire aujourd'hui ».
// `current` : ce que l'adresse porte déjà (`window.location.search`). Pur.
export function allBuyersSearch(
  current: string,
  next: { view: 'mine' | 'agency'; filter: string; query: string },
): string {
  const params = new URLSearchParams(current);
  const set = (key: string, value: string | null) =>
    value ? params.set(key, value) : params.delete(key);
  set('vue', next.view === 'agency' ? 'agence' : null);
  set('etat', next.filter === 'all' ? null : next.filter);
  set('q', next.query.trim() || null);
  if (!LIST_PARAMS.some((key) => params.has(key))) params.set('tous', '1');
  return params.toString();
}
