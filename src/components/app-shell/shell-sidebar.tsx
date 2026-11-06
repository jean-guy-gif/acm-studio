'use client';

import { usePathname } from 'next/navigation';
import { useId, useState } from 'react';

import { AccountMenu, type ErrorsBadge } from '@/components/app-shell/account-menu';
import { SidebarNav } from '@/components/app-shell/sidebar-nav';
import { AppLogo } from '@/components/theme/app-logo';
import { WorkspaceSwitch } from '@/features/workspace-mode/components/workspace-switch';
import { effectiveMode } from '@/features/workspace-mode/services/workspace-mode';
import type { WorkspaceMode } from '@/features/workspace-mode/types';

export const MOBILE_MENU_LABEL = 'Menu';

// Le menu de gauche. Sous 768 px (décision de Jean-Guy, 06/11), il devient une barre compacte en
// haut : le nom de l'agence (ou son logo) à gauche, l'interrupteur Vendeur | Acquéreur, et ☰ qui
// déplie les entrées du menu et la carte du conseiller ; le contenu de la page commence juste
// dessous. À partir de 768 px, rien ne change : la colonne de gauche, toujours dépliée.
export function ShellSidebar({
  profileName,
  profileEmail,
  agencyName,
  signOutAction,
  logoLightUrl,
  logoDarkUrl,
  errorsBadge,
  demoEntry,
  workspaceMode,
}: {
  profileName: string;
  profileEmail: string;
  agencyName: string;
  signOutAction: () => Promise<void>;
  logoLightUrl: string | null;
  logoDarkUrl: string | null;
  errorsBadge: ErrorsBadge | null;
  demoEntry: boolean;
  workspaceMode: WorkspaceMode;
}) {
  const pathname = usePathname();
  const mode = effectiveMode(workspaceMode, pathname);
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <aside className="flex shrink-0 flex-col border-b border-zinc-200 bg-white px-4 py-2.5 md:sticky md:top-0 md:h-screen md:w-64 md:gap-4 md:border-r md:border-b-0 md:px-5 md:py-6 stage:border-white/10 stage:bg-white/[0.03]">
      <div className="flex items-center gap-3 md:flex-col md:items-stretch md:gap-8">
        <div className="flex min-w-0 flex-1 items-center md:flex-none">
          <AppLogo
            className="h-7 md:h-9"
            lightUrl={logoLightUrl}
            darkUrl={logoDarkUrl}
            fallbackName={agencyName}
          />
        </div>
        <div className="shrink-0">
          <WorkspaceSwitch mode={mode} />
        </div>
        <button
          type="button"
          aria-label={MOBILE_MENU_LABEL}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
          data-testid="mobile-menu-toggle"
          className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 text-xl text-zinc-700 hover:bg-zinc-100 md:hidden stage:border-white/15 stage:text-white/80 stage:hover:bg-white/10"
        >
          <span aria-hidden>{open ? '✕' : '☰'}</span>
        </button>
      </div>

      {/* Sous 768 px, replié tant que ☰ n'est pas touché ; un lien choisi le replie. */}
      <div
        id={panelId}
        data-testid="shell-menu-panel"
        onClick={(event) => {
          if ((event.target as HTMLElement).closest('a')) setOpen(false);
        }}
        className={`${open ? 'flex' : 'hidden'} flex-col gap-4 pt-3 pb-1 md:flex md:flex-1 md:justify-between md:pt-0 md:pb-0`}
      >
        <SidebarNav workspaceMode={workspaceMode} />
        {/* Mission 125 — tout ce qui n'est pas le travail passe derrière la carte du conseiller. */}
        <AccountMenu
          profileName={profileName}
          profileEmail={profileEmail}
          agencyName={agencyName}
          signOutAction={signOutAction}
          errorsBadge={errorsBadge}
          demoEntry={demoEntry}
        />
      </div>
    </aside>
  );
}
