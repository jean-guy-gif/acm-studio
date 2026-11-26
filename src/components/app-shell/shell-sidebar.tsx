'use client';

import { usePathname } from 'next/navigation';

import { AccountMenu, type ErrorsBadge } from '@/components/app-shell/account-menu';
import { SidebarNav } from '@/components/app-shell/sidebar-nav';
import { AppLogo } from '@/components/theme/app-logo';
import { isInnerPage } from '@/features/workspace-mode/services/workspace-mode';

// Le menu de l'application aux trois tailles — la refonte, lot A (maquettes REFONTE-1, 5 et 6).
// Sur téléphone, une barre fixée en bas, quatre entrées (remplace M132, la barre du haut et ☰) ;
// sur tablette, une colonne d'icônes de 88 px ; sur ordinateur, le menu complet de 232 px, le
// logo de l'agence en tête. Le compte du conseiller (M125) est en bas de la colonne : un rond aux
// initiales sur tablette, sa carte sur ordinateur ; sur téléphone, il est en haut d'« Aujourd'hui ».
//
// Sur téléphone, le menu du bas n'est que sur les pages principales : une page intérieure (une
// fiche, un dossier, « Nouvel acquéreur ») n'a que son lien de retour, comme sur les maquettes
// REFONTE-2, 3 et 4 ; la place du menu est alors rendue à la page (`--shell-bottom`, globals.css).
//
// Sur tablette, la feuille du compte (240 px) déborde de la colonne (88 px). La colonne passe donc
// AU-DESSUS de la page pendant que la feuille est ouverte, et seulement alors
// (`md:has-[[role=menu]]:z-[45]`) : elle recouvre le contenu et la barre « Enregistrer » (z-40), et
// reste sous les couches plein écran (confirmation, fiche d'un bien : z-50). Fermée, la colonne
// garde son rang : le menu « … » d'une carte de gauche se pose sur elle, jamais dessous.
export function ShellSidebar({
  profileName,
  profileEmail,
  agencyName,
  signOutAction,
  logoLightUrl,
  logoDarkUrl,
  errorsBadge,
  demoEntry,
}: {
  profileName: string;
  profileEmail: string;
  agencyName: string;
  signOutAction: () => Promise<void>;
  logoLightUrl: string | null;
  logoDarkUrl: string | null;
  errorsBadge: ErrorsBadge | null;
  demoEntry: boolean;
}) {
  const inner = isInnerPage(usePathname());
  return (
    <aside
      data-testid="shell-menu"
      data-shell-menu={inner ? 'inner' : 'main'}
      className={`${inner ? 'max-md:hidden ' : ''}fixed inset-x-0 bottom-0 z-40 border-t border-[#E3E6F0] bg-white pb-[env(safe-area-inset-bottom)] md:sticky md:inset-x-auto md:top-0 md:bottom-auto md:z-auto md:flex md:h-screen md:w-[var(--shell-left)] md:shrink-0 md:flex-col md:gap-4 md:border-t-0 md:border-r md:px-2 md:py-5 xl:px-4 xl:py-7 md:has-[[role=menu]]:z-[45] print:hidden stage:border-white/10 stage:bg-[#0b2233]`}
    >
      <div className="hidden px-3 pb-2 xl:block">
        <AppLogo
          className="h-9"
          lightUrl={logoLightUrl}
          darkUrl={logoDarkUrl}
          fallbackName={agencyName}
        />
      </div>
      <SidebarNav />
      {/* Mission 125 — tout ce qui n'est pas le travail passe derrière le compte du conseiller. */}
      <div className="hidden md:block">
        <AccountMenu
          profileName={profileName}
          profileEmail={profileEmail}
          agencyName={agencyName}
          signOutAction={signOutAction}
          errorsBadge={errorsBadge}
          demoEntry={demoEntry}
        />
      </div>
    </aside>
  );
}
