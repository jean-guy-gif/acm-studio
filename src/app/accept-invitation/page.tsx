import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { AcceptForm } from '@/app/accept-invitation/accept-form';
import { AppLogo } from '@/components/theme/app-logo';
import { AppStage, AppThemeToggle } from '@/components/theme/app-stage';
import { APP_THEME_COOKIE, type AppTheme } from '@/components/theme/theme';
import { card, kickerLabel, pageSubtitle } from '@/components/ui/styles';
import { getProfile } from '@/lib/auth/get-profile';
import { getUser } from '@/lib/auth/get-user';

// Mission 60 — l'écran d'acceptation, ouvert par le lien e-mail (via /auth/confirm, qui a établi
// la session). Sans session → connexion. Déjà un profil → l'agence (il a déjà rejoint).
export default async function AcceptInvitationPage() {
  const user = await getUser();
  if (!user) {
    redirect('/login');
  }
  const profile = await getProfile();
  if (profile) {
    redirect('/builder');
  }

  const cookieStore = await cookies();
  const theme: AppTheme = cookieStore.get(APP_THEME_COOKIE)?.value === 'dark' ? 'dark' : 'light';

  return (
    <AppStage initialTheme={theme}>
      <div className="relative isolate flex flex-1 items-center justify-center bg-gradient-to-b from-brand-soft/60 to-white p-4 transition-colors duration-300 stage:bg-none stage:bg-[#051826]">
        <div className="absolute top-4 right-4">
          <AppThemeToggle />
        </div>
        <div className={`${card} flex w-full max-w-md flex-col gap-6 p-6 sm:p-8`}>
          <AppLogo priority className="h-10" />
          <div className="flex flex-col gap-1.5">
            <span className={kickerLabel}>Invitation</span>
            <h1 className="font-title text-3xl font-bold tracking-tight text-brand-deep stage:text-white">
              Rejoindre votre agence
            </h1>
            <p className={pageSubtitle}>
              Choisissez votre mot de passe pour finaliser votre accès. Votre agence et votre rôle
              vous attendent déjà.
            </p>
          </div>
          <AcceptForm email={user.email ?? ''} />
        </div>
      </div>
    </AppStage>
  );
}
