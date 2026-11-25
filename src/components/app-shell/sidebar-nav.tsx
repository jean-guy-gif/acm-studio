'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { NavIconSvg } from '@/components/app-shell/nav-icon';
import { todayCountLabel, useTodayCount } from '@/features/today/components/today-count';
import {
  isNavItemActive,
  NAV_ITEMS,
  type NavFrom,
} from '@/features/workspace-mode/services/workspace-mode';

// À partir de quelle taille l'entrée se voit : jamais deux classes d'affichage sur le même lien.
const SHOWN: Record<NavFrom, string> = {
  phone: 'flex',
  tablet: 'hidden md:flex',
  desktop: 'hidden xl:flex',
};

// Le menu de l'application, la refonte (lot A) : UNE navigation, la même aux trois tailles
// (maquettes REFONTE-1, 5 et 6). Sur téléphone, quatre entrées en bas, l'icône au-dessus du mot ;
// sur tablette, la colonne d'icônes, avec Aide en bas ; sur ordinateur, le menu complet, avec
// Prospection. Client Component uniquement pour connaître la route active (usePathname).
//
// « Vendeurs » surligne Préparation, Live et Suivi (`spaces`). La pastille d'« Aujourd'hui » (le
// nombre de lignes de la page, muette à zéro, M145 B) reste unique : sur l'icône, ou au bout de la
// ligne sur ordinateur.
export function SidebarNav() {
  const pathname = usePathname();
  const todayCount = useTodayCount();

  return (
    <nav
      aria-label="Menu principal"
      className="grid h-[72px] grid-cols-4 items-center text-xs font-bold md:flex md:h-auto md:flex-1 md:flex-col md:items-stretch md:gap-1.5 xl:text-[15px]"
    >
      {NAV_ITEMS.map((item) => {
        const active = isNavItemActive(item, pathname);
        const badge = item.href === '/aujourdhui' && todayCount != null && todayCount > 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            aria-label={badge ? todayCountLabel(todayCount) : undefined}
            className={[
              SHOWN[item.from],
              'relative flex-col items-center justify-center gap-1 rounded-xl transition-colors md:h-[60px] xl:h-11 xl:flex-row xl:justify-start xl:gap-3 xl:px-3',
              item.pinned ? 'md:mt-auto' : '',
              active
                ? 'text-brand-deep md:bg-brand-soft stage:text-brand md:stage:bg-brand/15'
                : 'text-[#5B6380] hover:text-brand-deep md:hover:bg-[#F4F5FA] stage:text-white/60 stage:hover:text-white md:stage:hover:bg-white/[0.06]',
            ].join(' ')}
          >
            <NavIconSvg name={item.icon} className="size-[22px] shrink-0 xl:size-5" />
            <span>{item.label}</span>
            {badge ? (
              <span
                data-testid="today-count"
                className="absolute top-2 left-1/2 ml-1.5 rounded-full bg-orange-600 px-1.5 py-px font-sans text-[11px] leading-4 font-bold text-white md:top-1.5 xl:static xl:ml-auto xl:px-2 xl:text-xs"
              >
                {todayCount}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
