import Link from 'next/link';
import { notFound } from 'next/navigation';

import { backLink, kickerLabel, link, pageTitle, softPanel } from '@/components/ui/styles';
import { ImportBookmarklet } from '@/features/comparable-import/components/import-bookmarklet';
import { importSearchResultsHtml } from '@/features/competitor-search/actions/import-search-results-html';
import { enrichCandidate } from '@/features/competitor-search/actions/enrich-candidate';
import { recordCompetitorDecision } from '@/features/competitor-search/actions/record-competitor-decision';
import { searchCompetitors } from '@/features/competitor-search/actions/search-competitors';
import { CompetitorSearchPanel } from '@/features/competitor-search/components/competitor-search-panel';
import { getProject } from '@/features/projects/queries/get-project';
import { getSubjectProperty } from '@/features/subject-property/queries/get-subject-property';

type FindCompetitorsPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function FindCompetitorsPage({ params }: FindCompetitorsPageProps) {
  const { projectId } = await params;

  const project = await getProject(projectId);
  if (!project) {
    notFound();
  }

  const property = await getSubjectProperty(projectId);
  const hasCity = Boolean(property?.city && property.city.trim() !== '');

  const searchAction = searchCompetitors.bind(null, projectId);
  const importResultsHtmlAction = importSearchResultsHtml.bind(null, projectId);
  const recordDecisionAction = recordCompetitorDecision.bind(null, projectId);
  const enrichAction = enrichCandidate.bind(null, projectId);

  const criteriaLabel = hasCity
    ? [property?.city, property?.postal_code].filter(Boolean).join(' ')
    : '—';

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <div className="flex flex-col gap-2">
        <Link href={`/builder/${projectId}/comparables`} className={backLink}>
          ← Retour aux biens concurrents
        </Link>
        <span className={kickerLabel}>Dossier · {project.seller_name}</span>
        <h1 className={pageTitle}>Trouver des concurrents</h1>
      </div>

      {hasCity ? (
        <>
          <CompetitorSearchPanel
            projectId={projectId}
            criteriaLabel={criteriaLabel}
            searchAction={searchAction}
            importResultsHtmlAction={importResultsHtmlAction}
            recordDecisionAction={recordDecisionAction}
            enrichAction={enrichAction}
          />
          <ImportBookmarklet />
        </>
      ) : (
        <div
          className={`${softPanel} flex flex-col gap-2 p-4 text-sm text-zinc-600 stage:text-white/70`}
        >
          <p>La recherche se base sur la localisation du bien vendeur, qui n’est pas renseignée.</p>
          <Link href={`/builder/${projectId}/property`} className={`${link} hover:underline`}>
            Renseigner le bien vendeur
          </Link>
        </div>
      )}
    </div>
  );
}
