import { cookies } from 'next/headers';

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

import { login } from './actions';

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
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
            <span className={kickerLabel}>Espace conseiller</span>
            <h1 className="font-title text-3xl font-bold tracking-tight text-brand-deep stage:text-white">
              Connexion
            </h1>
            <p className={pageSubtitle}>Accédez à votre espace ACM Studio.</p>
          </div>
          {error ? (
            <p role="alert" className={alertError}>
              {error}
            </p>
          ) : null}
          <form action={login} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className={fieldLabel}>Adresse e-mail</span>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                className={inputBase}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={fieldLabel}>Mot de passe</span>
              <input
                type="password"
                name="password"
                required
                autoComplete="current-password"
                className={inputBase}
              />
            </label>
            <SubmitButton pendingLabel="Connexion…" className={`${btnPrimary} mt-1 w-full py-2.5`}>
              Se connecter
            </SubmitButton>
          </form>
        </div>
      </div>
    </AppStage>
  );
}
