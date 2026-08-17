import { redirect } from 'next/navigation';

import { Logo } from '@/components/brand/logo';
import { SubmitButton } from '@/components/submit-button';
import { card, inputBase } from '@/components/ui/styles';
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

  const { error } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center bg-gradient-to-b from-brand-soft/60 to-white p-4">
      <div className={`flex w-full max-w-sm flex-col gap-6 p-6 ${card}`}>
        <Logo priority className="h-10" />
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Bienvenue dans ACM Studio</h1>
          <p className="text-sm text-zinc-500">
            Configuration initiale : créez votre agence pour commencer.
          </p>
        </div>
        {error ? (
          <p
            role="alert"
            className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
          >
            {error}
          </p>
        ) : null}
        <form action={bootstrapAgencyOwner} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Nom de l&apos;agence
            <input type="text" name="agencyName" required className={`${inputBase} font-normal`} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Prénom
            <input type="text" name="firstName" required className={`${inputBase} font-normal`} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Nom
            <input type="text" name="lastName" required className={`${inputBase} font-normal`} />
          </label>
          <SubmitButton pendingLabel="Création…">Créer mon agence</SubmitButton>
        </form>
      </div>
    </div>
  );
}
