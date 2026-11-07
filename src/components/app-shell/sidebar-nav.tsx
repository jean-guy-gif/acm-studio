'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
  suiviTaskCountLabel,
  useSuiviTaskCount,
} from '@/features/meeting-conclusion/components/suivi-task-count';
import { effectiveMode, navForMode } from '@/features/workspace-mode/services/workspace-mode';
import type { WorkspaceMode } from '@/features/workspace-mode/types';

// Navigation principale du shell applicatif. Client Component uniquement pour
// connaître la route active (usePathname) — aucune donnée, aucune logique.
//
// Mission 118 — le menu est celui du mode affiché (l'interrupteur est au-dessus, ShellSidebar) :
// le mode mémorisé, ou celui de la page quand elle appartient à un mode (un lien envoyé par un
// collègue fonctionne).
// Mission 125 — rien d'autre que le travail : les quatre espaces du mode. Mon profil,
// Administration, Aide, Ma démo et Erreurs sont derrière la carte du conseiller (AccountMenu) ; une
// de leurs pages ne surligne aucun des quatre espaces.
export function SidebarNav({ workspaceMode = 'seller' }: { workspaceMode?: WorkspaceMode }) {
  const pathname = usePathname();
  const mode = effectiveMode(workspaceMode, pathname);
  // Mission 130 — la pastille du Suivi : les tâches dues aujourd'hui (muette à zéro).
  const suiviCount = useSuiviTaskCount(mode === 'seller');

  return (
    <nav className="flex flex-col gap-1 md:gap-1.5" data-mode={mode}>
      {navForMode(mode).map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const badge = item.href === '/suivi' && suiviCount != null && suiviCount > 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            aria-label={badge ? suiviTaskCountLabel(suiviCount) : undefined}
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
                  data-testid="suivi-task-count"
                  className="rounded-full bg-orange-500 px-2 py-px font-sans text-xs font-bold text-white"
                >
                  {suiviCount}
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
    </nav>
  );
}
