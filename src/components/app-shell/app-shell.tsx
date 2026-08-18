import { SidebarNav } from '@/components/app-shell/sidebar-nav';
import { AppLogo } from '@/components/theme/app-logo';
import { AppStage, AppThemeToggle } from '@/components/theme/app-stage';
import type { AppTheme } from '@/components/theme/theme';
import { btnGhost, softPanel } from '@/components/ui/styles';

// Shell applicatif présentational : barre latérale + zone principale, dans le
// thème choisi par l'utilisateur (bouton Clair/Sombre). Aucune donnée chargée
// ici — le layout protégé fournit profil/agence, l'aperçu design des fixtures.
export function AppShell({
  profileName,
  profileEmail,
  agencyName,
  initialTheme,
  signOutAction,
  children,
}: {
  profileName: string;
  profileEmail: string;
  agencyName: string;
  initialTheme: AppTheme;
  signOutAction: () => Promise<void>;
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
            <div className="flex items-center justify-between gap-3">
              <AppLogo className="h-9" />
              <span className="md:hidden">
                <AppThemeToggle />
              </span>
            </div>
            <SidebarNav />
          </div>

          <div className="hidden flex-col gap-3 md:flex">
            <div className={`${softPanel} flex flex-col gap-0.5 px-3.5 py-3`}>
              <span className="text-sm font-semibold text-zinc-800 stage:text-white">
                {profileName}
              </span>
              <span className="truncate text-xs text-zinc-500 stage:text-white/50">
                {profileEmail}
              </span>
              <span className="truncate text-xs text-zinc-400 stage:text-white/40">
                {agencyName}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <AppThemeToggle />
              <form action={signOutAction}>
                <button type="submit" className={btnGhost}>
                  Déconnexion
                </button>
              </form>
            </div>
          </div>
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
