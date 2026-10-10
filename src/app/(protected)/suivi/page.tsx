import Link from 'next/link';

import { emptyState, kickerLabel, pageSubtitle, pageTitle } from '@/components/ui/styles';
import { BuyerSearchPanel } from '@/features/meeting-conclusion/components/buyer-search-panel';
import { SuiviRow } from '@/features/meeting-conclusion/components/suivi-row';
import { getSuiviDossiers } from '@/features/meeting-conclusion/queries/get-suivi-dossiers';
import {
  SUIVI_GROUPS,
  SUIVI_GROUP_LABELS,
  averageJourneyGap,
  filterSuiviByGroup,
  parseSuiviGroup,
  suiviCounts,
  type SuiviGroup,
} from '@/features/meeting-conclusion/services/filter-suivi';
import { getAgencyProspecting } from '@/features/prospecting/queries/get-agency-prospecting';
import {
  prospectingProgress,
  type ProspectingStatus,
} from '@/features/prospecting/services/prospecting-status';
import { formatPercent } from '@/lib/format';

type SuiviPageProps = {
  searchParams: Promise<{ issue?: string }>;
};

const chip =
  'rounded-full border px-3 py-1 text-sm font-semibold whitespace-nowrap transition-colors';
const chipActive = `${chip} border-brand-deep bg-brand-deep text-white`;
const chipIdle = `${chip} border-zinc-200 bg-white text-zinc-600 hover:border-brand hover:text-brand-deep stage:border-white/15 stage:bg-white/5 stage:text-white/70`;

const tile =
  'flex min-w-36 flex-col rounded-xl border bg-white px-4 py-3 transition-colors stage:bg-white/5';
const tileIdle = `${tile} border-zinc-200 hover:border-brand stage:border-white/10`;
const tileActive = `${tile} border-brand-deep ring-1 ring-brand-deep stage:border-brand stage:ring-brand`;

const COUNT_COLOR: Record<SuiviGroup, string> = {
  signed: 'text-zinc-900 stage:text-white',
  follow_up: 'text-brand-deep stage:text-brand',
  lost: 'text-zinc-400 stage:text-white/50',
};

const groupHref = (group: SuiviGroup | null): string =>
  group == null ? '/suivi' : `/suivi?issue=${group}`;

// Mission 54 — le Suivi qui sert : filtrer, rapprocher un acheteur, faire évoluer l'issue.
// Mission 86 — il se lit d'un coup d'œil : des compteurs qui filtrent, une ligne courte par
// dossier, une seule action selon l'issue. « Tous » ne masque rien (règle M52).
export default async function SuiviPage({ searchParams }: SuiviPageProps) {
  const { issue } = await searchParams;
  const group = parseSuiviGroup(issue);

  const allDossiers = await getSuiviDossiers();
  const { entries } = await getAgencyProspecting(allDossiers);
  const dossiers = filterSuiviByGroup(allDossiers, group);
  const counts = suiviCounts(allDossiers);
  const averageGap = averageJourneyGap(allDossiers);

  const statusesByProject = new Map<string, ProspectingStatus[]>();
  for (const { row, seller } of entries) {
    statusesByProject.set(seller.projectId, [
      ...(statusesByProject.get(seller.projectId) ?? []),
      row.status,
    ]);
  }

  return (
    <div className="flex flex-col gap-5 md:gap-6">
      <div className="flex flex-col gap-1.5">
        <span className={kickerLabel}>Après le rendez-vous</span>
        <h1 className={pageTitle}>Suivi</h1>
        <p className={pageSubtitle}>
          Vos rendez-vous conclus, et ce qu’il reste à faire pour chacun.
        </p>
      </div>

      {allDossiers.length === 0 ? (
        <div className={emptyState}>
          <p className="font-title text-lg font-semibold text-zinc-700 stage:text-white/85">
            Aucun dossier conclu pour le moment.
          </p>
          <p className="mt-1 text-sm text-zinc-500 stage:text-white/60">
            Un dossier arrive ici une fois le rendez-vous conclu depuis le Live.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-3">
            {SUIVI_GROUPS.map((value) => (
              <Link
                key={value}
                href={groupHref(group === value ? null : value)}
                aria-current={group === value ? 'true' : undefined}
                className={group === value ? tileActive : tileIdle}
              >
                <span className={`font-title text-2xl font-bold ${COUNT_COLOR[value]}`}>
                  {counts[value]}
                </span>
                <span className="text-xs whitespace-nowrap text-zinc-500 stage:text-white/60">
                  {SUIVI_GROUP_LABELS[value]}
                </span>
              </Link>
            ))}
            {averageGap != null ? (
              <div className="flex min-w-56 flex-col rounded-xl bg-brand-deep px-4 py-3 text-white">
                <span className="font-title text-2xl font-bold whitespace-nowrap">
                  {formatPercent(Math.round(averageGap), { signed: true })}
                </span>
                <span className="text-xs text-white/70">
                  Écart moyen&nbsp;: prix du vendeur → prix de commercialisation
                </span>
              </div>
            ) : null}
          </div>

          <BuyerSearchPanel dossiers={allDossiers} entries={entries} />

          <div className="flex flex-wrap items-center gap-2">
            <Link href="/suivi" className={group === null ? chipActive : chipIdle}>
              Tous
            </Link>
            {SUIVI_GROUPS.map((value) => (
              <Link
                key={value}
                href={groupHref(value)}
                className={group === value ? chipActive : chipIdle}
              >
                {SUIVI_GROUP_LABELS[value]}
              </Link>
            ))}
          </div>

          {dossiers.length === 0 ? (
            <div className={emptyState}>
              <p className="text-sm text-zinc-500 stage:text-white/60">
                Aucun dossier pour ce filtre.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {dossiers.map((dossier) => {
                const statuses = statusesByProject.get(dossier.project.id) ?? [];
                return (
                  <SuiviRow
                    key={dossier.project.id}
                    dossier={dossier}
                    prospecting={
                      dossier.conclusion?.outcome === 'signed'
                        ? { count: statuses.length, progress: prospectingProgress(statuses) }
                        : null
                    }
                  />
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
