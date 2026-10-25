import { AccountMenu, type ErrorsBadge } from '@/components/app-shell/account-menu';
import { SidebarNav } from '@/components/app-shell/sidebar-nav';
import { AppLogo } from '@/components/theme/app-logo';
import { AppStage } from '@/components/theme/app-stage';
import type { AppTheme } from '@/components/theme/theme';
import type { WorkspaceMode } from '@/features/workspace-mode/types';

// Shell applicatif présentational : barre latérale + zone principale, dans le
// thème choisi par l'utilisateur (bouton Clair/Sombre). Aucune donnée chargée
// ici — le layout protégé fournit profil/agence, l'aperçu design des fixtures.
export function AppShell({
  profileName,
  profileEmail,
  agencyName,
  initialTheme,
  signOutAction,
  logoLightUrl = null,
  logoDarkUrl = null,
  errorsBadge = null,
  demoEntry = false,
  workspaceMode = 'seller',
  children,
}: {
  profileName: string;
  profileEmail: string;
  agencyName: string;
  initialTheme: AppTheme;
  signOutAction: () => Promise<void>;
  logoLightUrl?: string | null;
  logoDarkUrl?: string | null;
  // Mission 100 — seulement pour les comptes autorisés ; null pour tous les autres.
  errorsBadge?: ErrorsBadge | null;
  // Mission 114 (partie B) — l'entrée « Ma démo », pour l'agence de démonstration seulement.
  demoEntry?: boolean;
  // Mission 118 — le mode du menu mémorisé par le conseiller (Vendeur par défaut).
  workspaceMode?: WorkspaceMode;
  children: React.ReactNode;
}) {
  return (
    <AppStage initialTheme={initialTheme}>
      <div className="relative isolate flex min-h-screen flex-col bg-zinc-50 text-zinc-900 transition-colors duration-300 md:flex-row stage:bg-[#051826] stage:text-white">
        {/* Halo d'ambiance discret, uniquement en thème sombre. */}
        <div
          aria-hidden
          className="pointer-events-none fixed -top-48 right-[-12%] -z-10 hidden h-[28rem] w-[28rem] rounded-full bg-brand/10 blur-3xl stage:block"
        />

        <aside className="flex shrink-0 flex-col gap-4 border-b border-zinc-200 bg-white px-4 py-4 md:sticky md:top-0 md:h-screen md:w-64 md:justify-between md:gap-6 md:border-r md:border-b-0 md:px-5 md:py-6 stage:border-white/10 stage:bg-white/[0.03]">
          <div className="flex flex-col gap-4 md:gap-8">
            <AppLogo
              className="h-9"
              lightUrl={logoLightUrl}
              darkUrl={logoDarkUrl}
              fallbackName={agencyName}
            />
            <SidebarNav workspaceMode={workspaceMode} />
          </div>

          {/* Mission 125 — tout ce qui n'est pas le travail passe derrière la carte du conseiller,
              visible à toutes les largeurs (Administration et Aide n'ont plus d'autre entrée). */}
          <AccountMenu
            profileName={profileName}
            profileEmail={profileEmail}
            agencyName={agencyName}
            signOutAction={signOutAction}
            errorsBadge={errorsBadge}
            demoEntry={demoEntry}
          />
        </aside>

        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 md:px-10 md:py-10">
            {children}
          </div>
        </main>
      </div>
    </AppStage>
  );
}
