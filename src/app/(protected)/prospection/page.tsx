import type { Metadata } from 'next';
import Link from 'next/link';

import {
  btnSecondary,
  emptyState,
  kickerLabel,
  pageSubtitle,
  pageTitle,
} from '@/components/ui/styles';
import { CompetitorLocatorWatcher } from '@/features/competitor-locator/components/competitor-locator-watcher';
import { getSuiviDossiers } from '@/features/meeting-conclusion/queries/get-suivi-dossiers';
import { ProspectingBoard } from '@/features/prospecting/components/prospecting-board';
import { ProspectingCard } from '@/features/prospecting/components/prospecting-card';
import { ProspectionFilters } from '@/features/prospecting/components/prospection-filters';
import { getAgencyProspecting } from '@/features/prospecting/queries/get-agency-prospecting';
import {
  filterProspecting,
  parseProspectingTarget,
  parseSellerFilter,
  prospectionHref,
} from '@/features/prospecting/services/filter-prospecting';
import { prospectingCounters } from '@/features/prospecting/services/prospecting-status';

export const metadata: Metadata = { title: 'Prospection — ACM Studio' };

type ProspectionPageProps = {
  searchParams: Promise<{ bien?: string; cible?: string }>;
};

const tile =
  'flex min-w-36 flex-col rounded-xl border border-zinc-200 bg-white px-4 py-3 stage:border-white/10 stage:bg-white/5';
const tileNumber = 'font-title text-2xl font-bold whitespace-nowrap';
const tileLabel = 'text-xs text-zinc-500 stage:text-white/60';

// Mission 86 — la page Prospection : tous les concurrents à prospecter de tous les mandats
// signés de l'agence, rangés par étape. Écran CONSEILLER, jamais montré au vendeur : les
// adresses des concurrents y figurent (M75).
export default async function ProspectionPage({ searchParams }: ProspectionPageProps) {
  const { bien, cible } = await searchParams;

  const { sellers, entries } = await getAgencyProspecting(await getSuiviDossiers());
  const sellerId = parseSellerFilter(bien, sellers);
  const target = parseProspectingTarget(cible);
  const shown = filterProspecting(entries, sellerId, target);
  const counters = prospectingCounters(shown.map((entry) => entry.row.status));
  const board = shown.filter((entry) => entry.row.status !== 'declined');
  const declined = shown.filter((entry) => entry.row.status === 'declined');
  // La veille du Localisateur (M75) tourne pour chaque mandat affiché ; l'avis discret
  // (Localisateur absent, partage éteint) ne se dit qu'une fois.
  const watched = sellers.filter((seller) => sellerId == null || seller.projectId === sellerId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className={kickerLabel}>Concurrents à démarcher</span>
          <h1 className={pageTitle}>Prospection</h1>
          <p className={pageSubtitle}>
            Les biens concurrents de vos mandats signés. Écran conseiller — jamais montré au
            vendeur.
          </p>
        </div>
        {sellers.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <ProspectionFilters sellers={sellers} sellerId={sellerId} target={target} />
            {board.length > 0 ? (
              <Link
                href={prospectionHref(sellerId, target).replace(
                  '/prospection',
                  '/prospection/tournee',
                )}
                target="_blank"
                className={btnSecondary}
              >
                Imprimer ma tournée
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>

      {sellers.length === 0 ? (
        <div className={emptyState}>
          <p className="font-title text-lg font-semibold text-zinc-700 stage:text-white/85">
            Aucun mandat signé pour le moment.
          </p>
          <p className="mt-1 text-sm text-zinc-500 stage:text-white/60">
            Dès qu’un rendez-vous se conclut par un mandat signé, ses concurrents retenus arrivent
            ici.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-3">
            <div className={tile}>
              <span className={`${tileNumber} text-zinc-900 stage:text-white`}>
                {counters.toCanvass}
              </span>
              <span className={tileLabel}>
                Concurrent{counters.toCanvass > 1 ? 's' : ''} à démarcher
              </span>
            </div>
            <div className={tile}>
              <span className={`${tileNumber} text-zinc-900 stage:text-white`}>
                {counters.handed}
              </span>
              <span className={tileLabel}>Dossier{counters.handed > 1 ? 's' : ''} remis</span>
            </div>
            <div className={tile}>
              <span className={`${tileNumber} text-emerald-700 stage:text-emerald-300`}>
                {counters.meetings}
              </span>
              <span className={tileLabel}>
                Rendez-vous obtenu{counters.meetings > 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex min-w-56 flex-col rounded-xl bg-brand-deep px-4 py-3 text-white">
              <span className={tileNumber}>{counters.mandates}</span>
              <span className="text-xs text-white/70">
                Mandat{counters.mandates > 1 ? 's' : ''} rentré{counters.mandates > 1 ? 's' : ''}{' '}
                grâce à la prospection
              </span>
            </div>
          </div>

          {watched.map((seller, index) => (
            <CompetitorLocatorWatcher
              key={seller.projectId}
              projectId={seller.projectId}
              showNotice={index === 0}
            />
          ))}

          {shown.length === 0 ? (
            <div className={emptyState}>
              <p className="text-sm text-zinc-500 stage:text-white/60">
                Aucun concurrent pour ce filtre.
              </p>
            </div>
          ) : (
            <ProspectingBoard entries={board} />
          )}

          {/* « Pas intéressé » sort du tableau, sans disparaître : compté ici, annulable. */}
          {declined.length > 0 ? (
            <details className="rounded-2xl border border-zinc-200 bg-white p-4 stage:border-white/10 stage:bg-white/5">
              <summary className="cursor-pointer text-sm font-semibold text-zinc-700 stage:text-white/80">
                Pas intéressés ({declined.length})
              </summary>
              <ul className="mt-3 grid grid-cols-1 gap-2.5 lg:grid-cols-2">
                {declined.map((entry) => (
                  <ProspectingCard key={entry.row.id} entry={entry} />
                ))}
              </ul>
            </details>
          ) : null}
        </>
      )}
    </div>
  );
}
