'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Navigation principale du shell applicatif. Client Component uniquement pour
// connaître la route active (usePathname) — aucune donnée, aucune logique.

const NAV = [
  { href: '/builder', label: 'Préparation', hint: 'Dossiers vendeurs' },
  { href: '/live', label: 'Live', hint: 'Rendez-vous vendeur' },
  { href: '/suivi', label: 'Suivi', hint: 'Après le rendez-vous' },
  { href: '/prospection', label: 'Prospection', hint: 'Concurrents à démarcher' },
  { href: '/admin', label: 'Administration', hint: 'Agence et équipe' },
  // Mission 97 — « Bienvenue », où l'on revient quand on veut.
  { href: '/bienvenue', label: 'Aide', hint: 'Premiers pas' },
];

// Mission 100 — « Erreurs » n'apparaît qu'aux comptes autorisés : le layout ne transmet
// `errorsBadge` que pour eux (la page, elle, se garde seule). La pastille dit le nombre d'erreurs
// depuis hier ; elle se tait à zéro.
export type ErrorsBadge = { count: number; label: string };

export function SidebarNav({ errorsBadge = null }: { errorsBadge?: ErrorsBadge | null }) {
  const pathname = usePathname();
  const items = errorsBadge
    ? [...NAV, { href: '/erreurs', label: 'Erreurs', hint: 'Ce qui casse' }]
    : NAV;

  return (
    <nav className="flex flex-wrap gap-1 md:flex-col md:gap-1.5">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={
              active
                ? 'flex flex-col rounded-xl bg-brand-soft px-3.5 py-2 stage:bg-brand/15'
                : 'flex flex-col rounded-xl px-3.5 py-2 transition-colors hover:bg-zinc-100 stage:hover:bg-white/[0.06]'
            }
          >
            <span
              className={
                active
                  ? 'font-title text-base font-semibold text-brand-deep stage:text-brand'
                  : 'font-title text-base font-medium text-zinc-600 stage:text-white/70'
              }
            >
              {item.label}
              {item.href === '/erreurs' && errorsBadge && errorsBadge.count > 0 ? (
                <span className="ml-2 rounded-full bg-red-600 px-2 py-0.5 align-middle font-sans text-xs font-semibold text-white">
                  {errorsBadge.label}
                </span>
              ) : null}
            </span>
            <span
              className={
                active
                  ? 'hidden text-xs text-brand-deep/60 md:block stage:text-white/50'
                  : 'hidden text-xs text-zinc-400 md:block stage:text-white/35'
              }
            >
              {item.hint}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
