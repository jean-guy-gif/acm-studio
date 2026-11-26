import Link from 'next/link';

import { SELLER_TABS, type SellerTab } from '@/features/workspace-mode/services/workspace-mode';

// La refonte, lot A — « Vendeurs » n'a plus qu'une entrée au menu : ses trois espaces, Préparation,
// Live et Suivi, restent des pages (CLAUDE.md) et se rejoignent par ces onglets, en tête de chacune
// de leurs listes. Des liens : les adresses ne changent pas.
export function SellerTabs({ current }: { current: SellerTab['href'] }) {
  return (
    <nav
      aria-label="Vendeurs"
      data-testid="seller-tabs"
      className="flex w-full gap-1 rounded-2xl bg-white p-1 sm:w-fit stage:bg-white/[0.06]"
    >
      {SELLER_TABS.map((tab) => {
        const active = tab.href === current;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={
              active
                ? 'flex h-10 flex-1 items-center justify-center rounded-xl bg-brand-soft px-4 text-[15px] font-bold text-brand-deep sm:flex-none stage:bg-brand/15 stage:text-brand'
                : 'flex h-10 flex-1 items-center justify-center rounded-xl px-4 text-[15px] font-bold text-[#5B6380] transition-colors hover:text-brand-deep sm:flex-none stage:text-white/60 stage:hover:text-white'
            }
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
