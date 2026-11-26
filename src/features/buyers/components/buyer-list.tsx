'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { badgeBrand, btnSecondary, card, emptyState, inputBase } from '@/components/ui/styles';
import {
  BUYER_FILTER_LABELS,
  BUYER_FILTERS,
  buyerFilterCounts,
  matchesBuyerFilter,
  matchesBuyerName,
  type BuyerFilter,
} from '@/features/buyers/services/buyer-filters';
import { allBuyersSearch } from '@/features/buyers/services/buyers-page';

// Une ligne de la liste, préparée au serveur (le tri par urgence, la prochaine étape, son retard).
export type BuyerListRow = {
  id: string;
  name: string;
  status: string;
  statusLabel: string;
  facts: string;
  readiness: 'ready' | 'recontact' | null;
  lastAnswer: string | null;
  mine: boolean;
  // null : l'avancement n'a pas pu être lu (M98).
  next: { title: string; since: string | null; label: string; href: string } | null;
  late: string | null;
  // Vrai seulement quand l'échéance est passée : « aujourd'hui » n'est pas un retard.
  overdue: boolean;
};

export type BuyerListView = 'mine' | 'agency';

const tab = 'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors';
const tabActive = `${tab} bg-brand-soft font-semibold text-brand-deep stage:bg-white/10 stage:text-white`;
const tabIdle = `${tab} text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 stage:text-white/55 stage:hover:bg-white/10`;
const chip =
  'rounded-full border px-3 py-1 text-sm font-semibold whitespace-nowrap transition-colors';
const chipActive = `${chip} border-brand bg-brand-soft text-brand-deep stage:bg-white/10 stage:text-white`;
const chipIdle = `${chip} border-zinc-200 bg-white text-zinc-600 hover:border-brand hover:text-brand-deep stage:border-white/15 stage:bg-white/5 stage:text-white/70`;

// L'adresse garde la vue, le filtre et la recherche, pour un lien envoyé (`?vue=agence`, `?q=`),
// sans recharger la page — et reste celle de la liste entière (`allBuyersSearch`).
function keepInAddress(view: BuyerListView, filter: BuyerFilter, query: string) {
  const search = allBuyersSearch(window.location.search, { view, filter, query });
  window.history.replaceState(null, '', `${window.location.pathname}?${search}`);
}

// Mission 117 — la liste des acquéreurs. Mission 146 (partie B, I4, planche B2) — elle s'ouvre
// sur « Mes fiches » (celles dont le conseiller est le titulaire, M145 B), « Toute l'agence » à un
// geste, pour tous (M117) ; triée par urgence au serveur, dans les deux vues ; la recherche filtre
// en tapant ; les filtres d'état se comptent dans la vue ; l'action est un bouton en contour, à
// droite, « en retard » en orange. Le seul plein de l'écran est « Nouvel acquéreur ».
export function BuyerList({
  rows,
  initialView,
  initialFilter,
  initialQuery,
}: {
  rows: BuyerListRow[];
  initialView: BuyerListView;
  initialFilter: BuyerFilter;
  initialQuery: string;
}) {
  const [view, setView] = useState<BuyerListView>(initialView);
  const [filter, setFilter] = useState<BuyerFilter>(initialFilter);
  const [query, setQuery] = useState(initialQuery);

  const inView = useMemo(
    () => (view === 'mine' ? rows.filter((row) => row.mine) : rows),
    [rows, view],
  );
  const counts = useMemo(() => buyerFilterCounts(inView), [inView]);
  const shown = inView.filter(
    (row) => matchesBuyerFilter(row, filter) && matchesBuyerName(row.name, query),
  );

  const choose = (next: { view?: BuyerListView; filter?: BuyerFilter; query?: string }) => {
    const nextView = next.view ?? view;
    const nextFilter = next.filter ?? filter;
    const nextQuery = next.query ?? query;
    setView(nextView);
    setFilter(nextFilter);
    setQuery(nextQuery);
    keepInAddress(nextView, nextFilter, nextQuery);
  };

  return (
    <div className="flex flex-col gap-4">
      <input
        type="search"
        value={query}
        onChange={(event) => choose({ query: event.target.value })}
        placeholder="Rechercher par nom"
        aria-label="Rechercher un acquéreur par nom"
        className={`${inputBase} w-full max-w-xs`}
        data-testid="buyer-search"
      />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex items-center gap-1.5" role="group" aria-label="Quelles fiches">
          {(['mine', 'agency'] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={view === value}
              className={view === value ? tabActive : tabIdle}
              onClick={() => choose({ view: value, filter: 'all' })}
              data-testid={`buyer-view-${value}`}
            >
              {value === 'mine' ? 'Mes fiches' : 'Toute l’agence'}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filtrer">
          {BUYER_FILTERS.filter((value) => value === 'all' || counts[value] > 0).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              className={filter === value ? chipActive : chipIdle}
              onClick={() => choose({ filter: value })}
              data-testid={`buyer-filter-${value}`}
            >
              {BUYER_FILTER_LABELS[value]} · {counts[value]}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <div className={emptyState} data-testid="buyer-list-empty">
          {query.trim()
            ? `Aucun acquéreur ne porte « ${query.trim()} ».`
            : view === 'mine' && rows.length > 0 && inView.length === 0
              ? 'Aucune fiche à votre nom : « Toute l’agence » montre celles de vos collègues.'
              : inView.length > 0
                ? 'Aucune fiche pour ce filtre.'
                : 'Aucun acquéreur pour l’instant : « Nouvel acquéreur » crée la première fiche.'}
        </div>
      ) : (
        <ul className="flex flex-col gap-2" data-testid="buyer-list">
          {shown.map((row) => (
            <li key={row.id} data-testid="buyer-row" className={`${card} px-4 py-3`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/acquereurs/${row.id}`}
                      className="font-title text-base font-bold text-zinc-900 hover:underline stage:text-white"
                    >
                      {row.name}
                    </Link>
                    <span className={badgeBrand}>{row.statusLabel}</span>
                    {/* Mission 132 — prêt à visiter, ou à recontacter : le même calcul que la fiche. */}
                    {row.readiness === 'ready' ? (
                      <span
                        className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-bold text-white"
                        data-testid="buyer-row-ready"
                      >
                        Prêt à visiter
                      </span>
                    ) : row.readiness === 'recontact' ? (
                      <span
                        className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-bold text-orange-800"
                        data-testid="buyer-row-recontact"
                      >
                        À recontacter
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm text-zinc-600 stage:text-white/70">{row.facts}</p>
                  {row.lastAnswer ? (
                    <p
                      className="text-xs text-zinc-500 stage:text-white/60"
                      data-testid="buyer-row-last-answer"
                    >
                      {row.lastAnswer}
                    </p>
                  ) : null}
                </div>
                {/* Mission 130 B — sa prochaine étape et depuis quand ; le bouton la fait. */}
                {row.next == null ? (
                  <span className="text-xs font-semibold text-red-700">
                    Avancement non lu : rechargez la page.
                  </span>
                ) : (
                  <div className="flex flex-col gap-1.5 sm:max-w-80 sm:items-end sm:text-right">
                    <span className="text-xs text-zinc-500 stage:text-white/60">
                      Prochaine étape · {row.next.title}
                      {row.late ? (
                        <>
                          {' · '}
                          <span
                            className={
                              row.overdue
                                ? 'font-semibold text-orange-700 stage:text-orange-300'
                                : 'font-semibold text-zinc-700 stage:text-white/80'
                            }
                            data-testid="buyer-row-late"
                          >
                            {row.late}
                          </span>
                        </>
                      ) : row.next.since ? (
                        ` · ${row.next.since}`
                      ) : null}
                    </span>
                    <Link
                      href={row.next.href}
                      className={`${btnSecondary} px-3 py-1.5 text-xs`}
                      data-testid="buyer-next-step"
                    >
                      {row.next.label}
                    </Link>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
