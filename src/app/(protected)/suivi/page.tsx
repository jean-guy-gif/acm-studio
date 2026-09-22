import Link from 'next/link';

import { emptyState, kickerLabel, pageSubtitle, pageTitle } from '@/components/ui/styles';
import { BuyerSearchPanel } from '@/features/meeting-conclusion/components/buyer-search-panel';
import { SuiviCard } from '@/features/meeting-conclusion/components/suivi-card';
import { getSuiviDossiers } from '@/features/meeting-conclusion/queries/get-suivi-dossiers';
import { filterSuiviByIssue } from '@/features/meeting-conclusion/services/filter-suivi';
import {
  CONCLUSION_OUTCOMES,
  OUTCOME_LABELS,
  type ConclusionOutcome,
} from '@/features/meeting-conclusion/types';

type SuiviPageProps = {
  searchParams: Promise<{ issue?: string }>;
};

const tab = 'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors';
const tabActive = `${tab} bg-brand text-white`;
const tabIdle = `${tab} text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 stage:text-white/55 stage:hover:bg-white/10`;

function parseIssue(raw: string | undefined): ConclusionOutcome | null {
  return (CONCLUSION_OUTCOMES as string[]).includes(raw ?? '') ? (raw as ConclusionOutcome) : null;
}

// Mission 54 §2/§3/§4 — le Suivi qui sert : filtrer par issue, rapprocher un acheteur,
// faire évoluer l'issue. « Tous » ne masque rien (règle M52).
export default async function SuiviPage({ searchParams }: SuiviPageProps) {
  const { issue: issueParam } = await searchParams;
  const issue = parseIssue(issueParam);

  const allDossiers = await getSuiviDossiers();
  const dossiers = filterSuiviByIssue(allDossiers, issue);

  const countByIssue = (outcome: ConclusionOutcome) =>
    allDossiers.filter((dossier) => dossier.conclusion?.outcome === outcome).length;

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <div className="flex flex-col gap-1.5">
        <span className={kickerLabel}>Après le rendez-vous</span>
        <h1 className={pageTitle}>Suivi</h1>
        <p className={pageSubtitle}>
          Les dossiers conclus — filtrez, rapprochez un acheteur, faites évoluer l’issue.
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
          <BuyerSearchPanel dossiers={allDossiers} />

          <div className="flex flex-wrap items-center gap-1.5">
            <Link href="/suivi" className={issue === null ? tabActive : tabIdle}>
              Tous ({allDossiers.length})
            </Link>
            {CONCLUSION_OUTCOMES.map((outcome) => (
              <Link
                key={outcome}
                href={`/suivi?issue=${outcome}`}
                className={issue === outcome ? tabActive : tabIdle}
              >
                {OUTCOME_LABELS[outcome]} ({countByIssue(outcome)})
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
              {dossiers.map((dossier) => (
                <SuiviCard key={dossier.project.id} dossier={dossier} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
