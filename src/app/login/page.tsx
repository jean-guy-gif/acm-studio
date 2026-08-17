import { Logo } from '@/components/brand/logo';
import { SubmitButton } from '@/components/submit-button';
import { card, inputBase } from '@/components/ui/styles';

import { login } from './actions';

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center bg-gradient-to-b from-brand-soft/60 to-white p-4">
      <div className={`flex w-full max-w-sm flex-col gap-6 p-6 ${card}`}>
        <Logo priority className="h-10" />
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Connexion</h1>
          <p className="text-sm text-zinc-500">Accédez à votre espace ACM Studio.</p>
        </div>
        {error ? (
          <p
            role="alert"
            className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
          >
            {error}
          </p>
        ) : null}
        <form action={login} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Adresse e-mail
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              className={`${inputBase} font-normal`}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Mot de passe
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              className={`${inputBase} font-normal`}
            />
          </label>
          <SubmitButton pendingLabel="Connexion…">Se connecter</SubmitButton>
        </form>
      </div>
    </div>
  );
}
