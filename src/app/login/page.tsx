import { SubmitButton } from '@/components/submit-button';

import { login } from './actions';

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="flex w-full max-w-sm flex-col gap-6 rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Connexion</h1>
          <p className="text-sm text-zinc-500">Accédez à votre espace ACM Studio.</p>
        </div>
        {error ? (
          <p
            role="alert"
            className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
          >
            {error}
          </p>
        ) : null}
        <form action={login} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Email
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              className="rounded border px-2 py-1 font-normal"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Mot de passe
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              className="rounded border px-2 py-1 font-normal"
            />
          </label>
          <SubmitButton pendingLabel="Connexion…">Connexion</SubmitButton>
        </form>
      </div>
    </div>
  );
}
