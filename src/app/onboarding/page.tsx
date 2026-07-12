import { redirect } from 'next/navigation';

import { getProfile } from '@/lib/auth/get-profile';

import { bootstrapAgencyOwner } from './actions';

type OnboardingPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const profile = await getProfile();
  if (profile) {
    redirect('/protected');
  }

  const { error } = await searchParams;

  return (
    <div>
      <h1>Bienvenue dans ACM Studio</h1>
      <p>Configuration initiale...</p>
      {error ? <p role="alert">{error}</p> : null}
      <form action={bootstrapAgencyOwner}>
        <label>
          Nom de l&apos;agence
          <input type="text" name="agencyName" required />
        </label>
        <label>
          Prénom
          <input type="text" name="firstName" required />
        </label>
        <label>
          Nom
          <input type="text" name="lastName" required />
        </label>
        <button type="submit">Créer mon agence</button>
      </form>
    </div>
  );
}
