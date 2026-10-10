import type { Metadata } from 'next';
import Link from 'next/link';

import { backLink } from '@/components/ui/styles';
import { PrintButton } from '@/features/competitor-locator/components/print-button';
import { ProspectingList } from '@/features/competitor-locator/components/prospecting-list';
import { getSuiviDossiers } from '@/features/meeting-conclusion/queries/get-suivi-dossiers';
import { getAgencyProspecting } from '@/features/prospecting/queries/get-agency-prospecting';
import {
  filterProspecting,
  parseProspectingTarget,
  parseSellerFilter,
  prospectionHref,
} from '@/features/prospecting/services/filter-prospecting';
import { PROSPECTING_TARGET_LABELS } from '@/features/prospecting/types';

export const metadata: Metadata = { title: 'Ma tournée — ACM Studio' };

type TourneePageProps = {
  searchParams: Promise<{ bien?: string; cible?: string }>;
};

// Mission 86 — « Imprimer ma tournée » : la liste filtrée de la page Prospection, en A4, par
// l'impression du navigateur (comme la liste de tournée d'un dossier, M75). Chaque groupe dit
// pour quel bien vendeur. Les concurrents « pas intéressés » et les mandats rentrés n'y sont
// plus : il n'y a plus à y passer. Document interne à l'agence.
export default async function TourneePage({ searchParams }: TourneePageProps) {
  const { bien, cible } = await searchParams;

  const { sellers, entries } = await getAgencyProspecting(await getSuiviDossiers());
  const sellerId = parseSellerFilter(bien, sellers);
  const target = parseProspectingTarget(cible);
  const toVisit = filterProspecting(entries, sellerId, target).filter(
    (entry) => entry.row.status !== 'declined' && entry.row.status !== 'mandate',
  );
  const groups = sellers
    .map((seller) => ({
      seller,
      rows: toVisit
        .filter((entry) => entry.seller.projectId === seller.projectId)
        .map((entry) => entry.row),
    }))
    .filter((group) => group.rows.length > 0);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[210mm] flex-col gap-5 bg-white px-6 py-8 text-zinc-900 print:max-w-none print:p-0">
      <style>{'@page { size: A4; margin: 15mm; }'}</style>
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Link href={prospectionHref(sellerId, target)} className={backLink}>
          ← Retour à Prospection
        </Link>
        <PrintButton />
      </div>

      <header className="flex flex-col gap-1 border-b border-zinc-300 pb-3">
        <h1 className="text-xl font-bold text-black">Ma tournée de prospection</h1>
        <p className="text-sm text-zinc-700">
          {PROSPECTING_TARGET_LABELS[target]} · liste éditée le{' '}
          {new Date().toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' })}
        </p>
        <p className="text-xs text-zinc-500">Document interne à l’agence.</p>
      </header>

      {groups.length > 0 ? (
        groups.map(({ seller, rows }) => (
          <section key={seller.projectId} className="flex flex-col gap-1">
            <h2 className="break-after-avoid text-base font-bold text-black">
              Pour : {seller.name}
              {seller.label ? (
                <span className="font-normal text-zinc-700"> · {seller.label}</span>
              ) : null}
            </h2>
            <ProspectingList rows={rows} />
          </section>
        ))
      ) : (
        <p className="text-sm text-zinc-600">Aucun concurrent à aller voir pour ce filtre.</p>
      )}
    </main>
  );
}
