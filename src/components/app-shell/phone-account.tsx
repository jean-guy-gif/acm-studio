'use client';

import { usePathname } from 'next/navigation';

import { AccountMenu, type ErrorsBadge } from '@/components/app-shell/account-menu';

// La refonte, lot A — sur téléphone, le menu du bas n'a que quatre entrées (maquette REFONTE-1) :
// le compte du conseiller s'ouvre depuis un rond à ses initiales, en haut à droite
// d'« Aujourd'hui », la page d'arrivée — posé à côté du titre, comme le bouton rond des maquettes,
// sans prendre une ligne de la page. À partir de 768 px, il est dans le menu.
export function PhoneAccount({
  profileName,
  profileEmail,
  agencyName,
  signOutAction,
  errorsBadge,
  demoEntry,
}: {
  profileName: string;
  profileEmail: string;
  agencyName: string;
  signOutAction: () => Promise<void>;
  errorsBadge: ErrorsBadge | null;
  demoEntry: boolean;
}) {
  const pathname = usePathname();
  if (pathname !== '/aujourdhui') return null;
  return (
    <div className="absolute top-3 right-4 md:hidden" data-testid="phone-account">
      <AccountMenu
        profileName={profileName}
        profileEmail={profileEmail}
        agencyName={agencyName}
        signOutAction={signOutAction}
        errorsBadge={errorsBadge}
        demoEntry={demoEntry}
        variant="avatar"
      />
    </div>
  );
}
