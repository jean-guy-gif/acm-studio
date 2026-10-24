import type { Metadata } from 'next';
import Link from 'next/link';

import {
  alertOk,
  btnPrimary,
  inputBase,
  kickerLabel,
  pageSubtitle,
  pageTitle,
} from '@/components/ui/styles';
import { BuyerList } from '@/features/buyers/components/buyer-list';
import { getBuyers } from '@/features/buyers/queries/get-buyers';
import { filterBuyersByName, sortBuyers } from '@/features/buyers/services/buyer-criteria';
import { getProfile } from '@/lib/auth/get-profile';

export const metadata: Metadata = { title: 'Acquéreurs — ACM Studio' };

type BuyersPageProps = { searchParams: Promise<{ q?: string; archive?: string }> };

// Mission 117 — l'espace « Acquéreurs » : les fiches de l'agence, les miennes en tête, une
// recherche par nom, « Nouvel acquéreur ». Les fiches archivées n'y sont pas (M93).
export default async function BuyersPage({ searchParams }: BuyersPageProps) {
  const { q, archive } = await searchParams;
  const query = q?.trim() || null;
  const [profile, all] = await Promise.all([getProfile(), getBuyers()]);
  const buyers = filterBuyersByName(sortBuyers(all, profile?.id ?? null), query);

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className={kickerLabel}>Acquéreurs</span>
          <h1 className={pageTitle}>Les acquéreurs de l’agence</h1>
          <p className={pageSubtitle}>
            Ce que chacun cherche, noté en découverte ; « Rapprocher » le confronte à vos mandats,
            vos vendeurs à relancer et vos concurrents à prospecter.
          </p>
        </div>
        <Link href="/acquereurs/nouveau" className={btnPrimary}>
          Nouvel acquéreur
        </Link>
      </div>

      {archive ? (
        <p role="status" className={alertOk} data-testid="buyer-archived-notice">
          La fiche de {archive} est archivée : elle n’apparaît plus dans vos listes.
        </p>
      ) : null}

      <form method="get" action="/acquereurs" className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          name="q"
          defaultValue={query ?? ''}
          placeholder="Rechercher par nom"
          aria-label="Rechercher un acquéreur par nom"
          className={`${inputBase} w-full max-w-xs`}
        />
        <button
          type="submit"
          className="text-sm font-medium text-brand-deep hover:underline stage:text-brand"
        >
          Rechercher
        </button>
        {query ? (
          <Link
            href="/acquereurs"
            className="text-sm text-zinc-500 hover:underline stage:text-white/60"
          >
            Tout afficher
          </Link>
        ) : null}
      </form>

      <BuyerList buyers={buyers} advisorId={profile?.id ?? null} query={query} />
    </div>
  );
}
