import { redirect } from 'next/navigation';

import { getProfile } from '@/lib/auth/get-profile';

// Groupe de routes « scène » : la présentation Live vendeur, plein cadre.
// Même garde d'accès que le shell applicatif (profil requis), mais AUCUN
// chrome : pas de barre latérale, pas de thème applicatif — la scène occupe
// tout l'écran et gère sa propre bascule Clair/Sombre (sombre par défaut).
export default async function StageLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();

  if (!profile) {
    redirect('/onboarding');
  }

  return children;
}
