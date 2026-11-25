import type { ErrorsBadge } from '@/components/app-shell/account-menu';
import { PhoneAccount } from '@/components/app-shell/phone-account';
import { ShellSidebar } from '@/components/app-shell/shell-sidebar';
import { AppStage } from '@/components/theme/app-stage';
import type { AppTheme } from '@/components/theme/theme';

// Shell applicatif présentational : le menu + la zone principale, dans le thème choisi par
// l'utilisateur (bouton Clair/Sombre). Aucune donnée chargée ici — le layout protégé fournit
// profil et agence.
//
// La refonte, lot A — le cadre aux trois tailles : le menu en bas sur téléphone (la page garde sa
// place au-dessus, `--shell-bottom`), en icônes puis complet à gauche à partir de 768 px ; le fond
// des maquettes (#F4F5FA).
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
  children: React.ReactNode;
}) {
  return (
    <AppStage initialTheme={initialTheme}>
      <div className="relative isolate flex min-h-screen flex-col bg-[#F4F5FA] text-zinc-900 transition-colors duration-300 md:flex-row stage:bg-[#051826] stage:text-white">
        {/* Halo d'ambiance discret, uniquement en thème sombre. */}
        <div
          aria-hidden
          className="pointer-events-none fixed -top-48 right-[-12%] -z-10 hidden h-[28rem] w-[28rem] rounded-full bg-brand/10 blur-3xl stage:block"
        />

        <ShellSidebar
          profileName={profileName}
          profileEmail={profileEmail}
          agencyName={agencyName}
          signOutAction={signOutAction}
          logoLightUrl={logoLightUrl}
          logoDarkUrl={logoDarkUrl}
          errorsBadge={errorsBadge}
          demoEntry={demoEntry}
        />

        <main className="relative min-w-0 flex-1 pb-[var(--shell-bottom)]">
          <PhoneAccount
            profileName={profileName}
            profileEmail={profileEmail}
            agencyName={agencyName}
            signOutAction={signOutAction}
            errorsBadge={errorsBadge}
            demoEntry={demoEntry}
          />
          {/* Une page en deux colonnes (la liste, le détail : maquettes REFONTE-5, 6 et 8) prend
              toute la place, sans marge : elle le dit par `data-shell-wide`. */}
          <div className="mx-auto w-full max-w-6xl px-4 pt-4 pb-6 has-[[data-shell-wide]]:max-w-none has-[[data-shell-wide]]:p-0 sm:px-6 md:px-10 md:py-10">
            {children}
          </div>
        </main>
      </div>
    </AppStage>
  );
}
