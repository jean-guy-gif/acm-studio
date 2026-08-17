import Link from 'next/link';
import { notFound } from 'next/navigation';

import { importSearchResultsHtml } from '@/features/competitor-search/actions/import-search-results-html';
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

  const criteriaLabel = hasCity
    ? [property?.city, property?.postal_code].filter(Boolean).join(' ')
    : '—';

  return (
    <div className="flex flex-col gap-4">
      <Link
        href={`/builder/${projectId}/comparables`}
        className="text-sm font-medium text-brand underline-offset-2 transition-colors hover:text-brand-deep"
      >
        Retour aux biens concurrents
      </Link>
      <h1 className="text-2xl font-semibold">Trouver des concurrents</h1>

      {hasCity ? (
        <CompetitorSearchPanel
          projectId={projectId}
          criteriaLabel={criteriaLabel}
          searchAction={searchAction}
          importResultsHtmlAction={importResultsHtmlAction}
        />
      ) : (
        <div className="flex flex-col gap-2 rounded border border-zinc-200 p-4 text-sm dark:border-zinc-800">
          <p>La recherche se base sur la localisation du bien vendeur, qui n’est pas renseignée.</p>
          <Link
            href={`/builder/${projectId}/property`}
            className="font-medium text-brand underline-offset-2 hover:underline"
          >
            Renseigner le bien vendeur
          </Link>
        </div>
      )}
    </div>
  );
}
