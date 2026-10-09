import { redirect } from 'next/navigation';

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

  return children;
}
