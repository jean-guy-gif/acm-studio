'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { todayCountLabel, useTodayCount } from '@/features/today/components/today-count';
import { NAV_GROUPS } from '@/features/workspace-mode/services/workspace-mode';

// Navigation principale du shell applicatif. Client Component uniquement pour
// connaître la route active (usePathname) — aucune donnée, aucune logique.
//
// Mission 125 — rien d'autre que le travail. Mon profil, Administration, Aide, Ma démo et Erreurs
// sont derrière la carte du conseiller (AccountMenu) ; une de leurs pages ne surligne aucun espace.
// Mission 145 (partie B) — un seul menu en trois groupes, « Aujourd'hui » en tête avec sa pastille
// (le nombre de lignes de la page, muette à zéro) ; plus d'interrupteur Vendeur | Acquéreur.
// Mission 149 (variante A, maquettes M149-1 et 2) — les titres de groupe se voient au premier coup
// d'œil : 13 px, extra-gras, dans la couleur foncée de l'agence (≥ 4,5:1, M143), un filet fin
// au-dessus de chaque groupe titré ; « Aujourd'hui », en tête et sans titre, n'en a pas.
export function SidebarNav() {
  const pathname = usePathname();
  const todayCount = useTodayCount();

  return (
    <nav className="flex flex-col gap-1 md:gap-1.5" aria-label="Menu principal">
      {NAV_GROUPS.map((group) => (
        <div
          key={group.label ?? 'today'}
          data-testid="nav-group"
          className={
            group.label
              ? 'mt-3 flex flex-col gap-1 border-t border-zinc-200 pt-3.5 md:gap-1.5 stage:border-white/10'
              : 'flex flex-col gap-1 md:gap-1.5'
          }
        >
          {group.label ? (
            <span
              data-testid="nav-group-title"
              className="px-3.5 pb-0.5 text-[13px] font-extrabold tracking-[0.1em] text-brand-deep uppercase stage:text-brand"
            >
              {group.label}
            </span>
          ) : null}
          {group.items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const badge = item.href === '/aujourdhui' && todayCount != null && todayCount > 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                aria-label={badge ? todayCountLabel(todayCount) : undefined}
                className={
                  active
                    ? 'flex flex-col rounded-xl bg-brand-soft px-3.5 py-2 stage:bg-brand/15'
                    : 'flex flex-col rounded-xl px-3.5 py-2 transition-colors hover:bg-zinc-100 stage:hover:bg-white/[0.06]'
                }
              >
                <span
                  className={
                    active
                      ? 'flex items-center justify-between gap-2 font-title text-base font-semibold text-brand-deep stage:text-brand'
                      : 'flex items-center justify-between gap-2 font-title text-base font-medium text-zinc-600 stage:text-white/70'
                  }
                >
                  {item.label}
                  {badge ? (
                    <span
                      data-testid="today-count"
                      className="rounded-full bg-orange-600 px-2 py-px font-sans text-xs font-bold text-white"
                    >
                      {todayCount}
                    </span>
                  ) : null}
                </span>
                <span
                  className={
                    active
                      ? 'hidden text-xs text-brand-deep/60 md:block stage:text-white/50'
                      : 'hidden text-xs text-zinc-500 md:block stage:text-white/35'
                  }
                >
                  {item.hint}
                </span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
