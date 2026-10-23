import { redirect } from 'next/navigation';

import { TestAccountBanner } from '@/features/test-account/test-account-banner';
import { getAgency } from '@/lib/auth/get-agency';
import { getProfile } from '@/lib/auth/get-profile';

// Groupe de routes « impression » (mission 75) : une feuille A4 sobre, sans barre latérale ni
// thème applicatif. Même garde d'accès que le shell (profil requis, accès non retiré).
export default async function PrintLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();

  if (!profile) {
    redirect('/onboarding');
  }
  if (profile.removed_at) {
    redirect('/');
  }

  // Mission 87 — le bandeau du compte de test, à l'écran seulement : jamais sur la feuille.
  const agency = await getAgency(profile.agency_id);
  return (
    <>
      <TestAccountBanner agencyName={agency?.name} />
      {children}
    </>
  );
}
