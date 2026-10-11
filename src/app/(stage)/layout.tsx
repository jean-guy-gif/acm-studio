import { redirect } from 'next/navigation';

import { LiveFontPreload } from '@/features/branding/components/live-font-preload';
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

  // Mission 95 — les polices de la scène sont préchargées : le vendeur ne voit pas l'écran
  // changer de police à l'ouverture.
  return (
    <>
      <LiveFontPreload />
      {children}
    </>
  );
}
