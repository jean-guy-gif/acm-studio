// Mission 146 (partie B, I4) — sans dépendance : la liste des acquéreurs les applique dans le
// navigateur, en tapant.

// Les filtres d'état, comptés dans la vue choisie ; un filtre à zéro ne s'affiche pas.
export const BUYER_FILTERS = ['all', 'ready', 'recontact', 'under_offer'] as const;
export type BuyerFilter = (typeof BUYER_FILTERS)[number];
export const BUYER_FILTER_LABELS: Record<BuyerFilter, string> = {
  all: 'Toutes',
  ready: 'Prêts à visiter',
  recontact: 'À recontacter',
  under_offer: 'Sous offre',
};

export type BuyerFilterRow = { readiness: 'ready' | 'recontact' | null; status: string };

export function matchesBuyerFilter(row: BuyerFilterRow, filter: BuyerFilter): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'ready':
      return row.readiness === 'ready';
    case 'recontact':
      return row.readiness === 'recontact';
    case 'under_offer':
      return row.status === 'under_offer';
  }
}

export function buyerFilterCounts(rows: readonly BuyerFilterRow[]): Record<BuyerFilter, number> {
  return Object.fromEntries(
    BUYER_FILTERS.map((filter) => [
      filter,
      rows.filter((row) => matchesBuyerFilter(row, filter)).length,
    ]),
  ) as Record<BuyerFilter, number>;
}

export function parseBuyerFilter(value: string | null | undefined): BuyerFilter {
  return (BUYER_FILTERS as readonly string[]).includes(value ?? '')
    ? (value as BuyerFilter)
    : 'all';
}

// La recherche par nom, en tapant : sans accent ni casse (M117).
const fold = (text: string): string =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export function matchesBuyerName(name: string, query: string | null): boolean {
  const needle = fold(query ?? '');
  return needle === '' || fold(name).includes(needle);
}
