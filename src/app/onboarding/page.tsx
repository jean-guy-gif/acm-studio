import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { SubmitButton } from '@/components/submit-button';
import { AppLogo } from '@/components/theme/app-logo';
import { AppStage, AppThemeToggle } from '@/components/theme/app-stage';
import { APP_THEME_COOKIE, type AppTheme } from '@/components/theme/theme';
import {
  alertError,
  btnPrimary,
  card,
  fieldLabel,
  inputBase,
  kickerLabel,
  pageSubtitle,
} from '@/components/ui/styles';
import { getProfile } from '@/lib/auth/get-profile';

import { bootstrapAgencyOwner } from './actions';

type OnboardingPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const profile = await getProfile();
  if (profile) {
    redirect('/builder');
  }

  const [{ error }, cookieStore] = await Promise.all([searchParams, cookies()]);
  const theme: AppTheme = cookieStore.get(APP_THEME_COOKIE)?.value === 'dark' ? 'dark' : 'light';

  return (
    <AppStage initialTheme={theme}>
      <div className="relative isolate flex flex-1 items-center justify-center bg-gradient-to-b from-brand-soft/60 to-white p-4 transition-colors duration-300 stage:bg-none stage:bg-[#051826]">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 right-[-10%] -z-10 hidden h-[26rem] w-[26rem] rounded-full bg-brand/15 blur-3xl stage:block"
        />
        <div className="absolute top-4 right-4">
          <AppThemeToggle />
        </div>

        <div className={`${card} flex w-full max-w-sm flex-col gap-6 p-6 sm:p-8`}>
          <AppLogo priority className="h-10" />
          <div className="flex flex-col gap-1.5">
            <span className={kickerLabel}>Première connexion</span>
            <h1 className="font-title text-3xl font-bold tracking-tight text-brand-deep stage:text-white">
              Bienvenue dans ACM Studio
            </h1>
            <p className={pageSubtitle}>
              Configuration initiale : créez votre agence pour commencer.
            </p>
          </div>
          {error ? (
            <p role="alert" className={alertError}>
              {error}
            </p>
          ) : null}
          <form action={bootstrapAgencyOwner} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className={fieldLabel}>Nom de l&apos;agence</span>
              <input type="text" name="agencyName" required className={inputBase} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={fieldLabel}>Prénom</span>
              <input type="text" name="firstName" required className={inputBase} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={fieldLabel}>Nom</span>
              <input type="text" name="lastName" required className={inputBase} />
            </label>
            <SubmitButton pendingLabel="Création…" className={`${btnPrimary} mt-1 w-full py-2.5`}>
              Créer mon agence
            </SubmitButton>
          </form>
        </div>
      </div>
    </AppStage>
  );
}
