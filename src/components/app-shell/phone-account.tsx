'use client';

import { usePathname } from 'next/navigation';

import { AccountMenu, type ErrorsBadge } from '@/components/app-shell/account-menu';

// La refonte, lot A — sur téléphone, le menu du bas n'a que quatre entrées (maquette REFONTE-1) :
// le compte du conseiller s'ouvre depuis un rond à ses initiales, en haut d'« Aujourd'hui », la
// page d'arrivée. À partir de 768 px, il est dans le menu.
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
    <div className="flex justify-end px-4 pt-3 md:hidden" data-testid="phone-account">
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
