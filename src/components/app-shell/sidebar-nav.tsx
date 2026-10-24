'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { WorkspaceSwitch } from '@/features/workspace-mode/components/workspace-switch';
import {
  SHARED_NAV,
  effectiveMode,
  navForMode,
} from '@/features/workspace-mode/services/workspace-mode';
import type { WorkspaceMode } from '@/features/workspace-mode/types';

// Navigation principale du shell applicatif. Client Component uniquement pour
// connaître la route active (usePathname) — aucune donnée, aucune logique.
//
// Mission 118 — en tête, l'interrupteur Vendeur | Acquéreur ; le menu est celui du mode affiché :
// le mode mémorisé, ou celui de la page quand elle appartient à un mode (un lien envoyé par un
// collègue fonctionne). Administration, Aide, Ma démo et Erreurs sont communs.

// Mission 100 — « Erreurs » n'apparaît qu'aux comptes autorisés : le layout ne transmet
// `errorsBadge` que pour eux (la page, elle, se garde seule). La pastille dit le nombre d'erreurs
// depuis hier ; elle se tait à zéro.
export type ErrorsBadge = { count: number; label: string };

// Mission 114 (partie B) — « Ma démo » n'apparaît qu'à l'agence de démonstration : le layout ne
// transmet `demoEntry` que pour elle (la page, elle, se garde seule).
export function SidebarNav({
  errorsBadge = null,
  demoEntry = false,
  workspaceMode = 'seller',
}: {
  errorsBadge?: ErrorsBadge | null;
  demoEntry?: boolean;
  workspaceMode?: WorkspaceMode;
}) {
  const pathname = usePathname();
  const mode = effectiveMode(workspaceMode, pathname);
  const items = [
    ...navForMode(mode),
    ...SHARED_NAV,
    ...(demoEntry
      ? [{ href: '/ma-demo', label: 'Ma démo', hint: 'Quatre dossiers à dérouler' }]
      : []),
    ...(errorsBadge ? [{ href: '/erreurs', label: 'Erreurs', hint: 'Ce qui casse' }] : []),
  ];

  return (
    <div className="flex flex-col gap-3 md:gap-4">
      <WorkspaceSwitch mode={mode} />
      <nav className="flex flex-wrap gap-1 md:flex-col md:gap-1.5" data-mode={mode}>
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
    </div>
  );
}
