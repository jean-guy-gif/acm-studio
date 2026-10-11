import { cookies } from 'next/headers';

import { AppLogo } from '@/components/theme/app-logo';
import { AppStage, AppThemeToggle } from '@/components/theme/app-stage';
import { APP_THEME_COOKIE, type AppTheme } from '@/components/theme/theme';
import { card, kickerLabel, pageSubtitle } from '@/components/ui/styles';

// Mission 88 — la carte des écrans hors de l'application (mot de passe oublié, nouveau mot de
// passe) : même habillage que la connexion, sans rien du dossier d'un client.
export async function AuthCard({
  kicker,
  title,
  subtitle,
  children,
}: {
  kicker: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const theme: AppTheme = cookieStore.get(APP_THEME_COOKIE)?.value === 'dark' ? 'dark' : 'light';

  return (
    <AppStage initialTheme={theme}>
      <div className="relative isolate flex flex-1 items-center justify-center bg-gradient-to-b from-brand-soft/60 to-white p-4 transition-colors duration-300 stage:bg-[#051826] stage:bg-none">
        <div className="absolute top-4 right-4">
          <AppThemeToggle />
        </div>
        <div className={`${card} flex w-full max-w-sm flex-col gap-6 p-6 sm:p-8`}>
          <AppLogo priority className="h-10" />
          <div className="flex flex-col gap-1.5">
            <span className={kickerLabel}>{kicker}</span>
            <h1 className="font-title text-3xl font-bold tracking-tight text-brand-deep stage:text-white">
              {title}
            </h1>
            <p className={pageSubtitle}>{subtitle}</p>
          </div>
          {children}
        </div>
      </div>
    </AppStage>
  );
}
