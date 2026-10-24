import type { Metadata } from 'next';
import Link from 'next/link';

import {
  btnSecondary,
  card,
  emptyState,
  kickerLabel,
  pageSubtitle,
  pageTitle,
} from '@/components/ui/styles';
import { getBuyers } from '@/features/buyers/queries/get-buyers';
import {
  buyerBudgetLabel,
  buyerCitiesLabel,
  buyerTypesLabel,
  sortBuyers,
} from '@/features/buyers/services/buyer-criteria';
import { getProfile } from '@/lib/auth/get-profile';

export const metadata: Metadata = { title: 'Biens idéaux — ACM Studio' };

// Mission 118 (partie A) — « Biens idéaux » : en attendant la partie B, la page mène à chaque fiche
// et à son rapprochement (M86, M117) ; rien n'est cherché ni enregistré ici.
export default async function IdealPropertiesPage() {
  const [profile, all] = await Promise.all([getProfile(), getBuyers()]);
  const buyers = sortBuyers(all, profile?.id ?? null);
  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <div className="flex flex-col gap-1.5">
        <span className={kickerLabel}>Acquéreurs</span>
        <h1 className={pageTitle}>Biens idéaux</h1>
        <p className={pageSubtitle}>
          Pour chaque acquéreur, « Rapprocher » confronte sa recherche à vos mandats, vos vendeurs à
          relancer et vos concurrents à prospecter.
        </p>
      </div>
      {buyers.length === 0 ? (
        <div className={emptyState}>
          Aucun acquéreur pour l’instant :{' '}
          <Link href="/acquereurs/nouveau" className="font-medium underline">
            créez la première fiche
          </Link>
          .
        </div>
      ) : (
        <ul className="flex flex-col gap-2" data-testid="ideal-buyer-list">
          {buyers.map((buyer) => {
            const facts = [
              buyerTypesLabel(buyer),
              buyerCitiesLabel(buyer),
              buyerBudgetLabel(buyer),
            ].filter((fact): fact is string => fact != null && fact !== '');
            return (
              <li
                key={buyer.id}
                className={`${card} flex flex-wrap items-center justify-between gap-3 px-4 py-3`}
              >
                <div className="flex min-w-0 flex-col">
                  <Link
                    href={`/acquereurs/${buyer.id}`}
                    className="font-title text-base font-bold text-zinc-900 hover:underline stage:text-white"
                  >
                    {buyer.name}
                  </Link>
                  <span className="text-sm text-zinc-600 stage:text-white/70">
                    {facts.join(' · ')}
                  </span>
                </div>
                <Link
                  href={`/suivi?acquereur=${buyer.id}#rapprochement`}
                  className={`${btnSecondary} px-3 py-1.5 text-xs`}
                >
                  Rapprocher
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
