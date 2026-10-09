import Link from 'next/link';
import { notFound } from 'next/navigation';

import { backLink, kickerLabel, link, pageTitle, softPanel } from '@/components/ui/styles';
import { importAndCreateComparable } from '@/features/competitor-search/actions/import-and-create-competitor';
import { prepareCompetitorSearch } from '@/features/competitor-search/actions/prepare-competitor-search';
import { prepareOpenSearches } from '@/features/competitor-search/actions/prepare-open-searches';
import { rememberPortalPlaces } from '@/features/competitor-search/actions/remember-portal-places';
import { rankCompetitorCandidates } from '@/features/competitor-search/actions/rank-competitor-candidates';
import { recordCompetitorDecision } from '@/features/competitor-search/actions/record-competitor-decision';
import { recordCompetitorDecisions } from '@/features/competitor-search/actions/record-competitor-decisions';
import { searchStreamEstate } from '@/features/competitor-search/actions/search-stream-estate';
import { CompetitorSearchPanel } from '@/features/competitor-search/components/competitor-search-panel';
import { streamEstateApiKey } from '@/features/competitor-search/services/stream-estate-config';
import { getProject } from '@/features/projects/queries/get-project';
import { getSubjectProperty } from '@/features/subject-property/queries/get-subject-property';
import {
  missingForSearch,
  propertyFieldId,
  SEARCH_REQUIREMENT_LABELS,
} from '@/features/subject-property/services/search-requirements';

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
  // MISSION 77 — la recherche a besoin de la ville (le secteur) et du type (filtre dur, M54).
  // Ce qui manque est nommé, et son lien ouvre la fiche sur le champ.
  const missing = missingForSearch({
    property_type: property?.property_type,
    city: property?.city,
  });

  const prepareAction = prepareCompetitorSearch.bind(null, projectId);
  const rankAction = rankCompetitorCandidates.bind(null, projectId);
  const recordDecisionAction = recordCompetitorDecision.bind(null, projectId);
  const importAction = importAndCreateComparable.bind(null, projectId);
  const recordDecisionsAction = recordCompetitorDecisions.bind(null, projectId);
  const prepareOpenAction = prepareOpenSearches.bind(null, projectId);
  const rememberPlacesAction = rememberPortalPlaces.bind(null, projectId);
  // Essai Stream Estate : seulement si la clé est définie côté serveur. On transmet une action
  // liée, jamais la clé.
  const streamEstateAction =
    streamEstateApiKey() != null ? searchStreamEstate.bind(null, projectId) : undefined;

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

      {missing.length === 0 ? (
        <CompetitorSearchPanel
          projectId={projectId}
          criteriaLabel={criteriaLabel}
          prepareAction={prepareAction}
          rankAction={rankAction}
          recordDecisionAction={recordDecisionAction}
          importAction={importAction}
          recordDecisionsAction={recordDecisionsAction}
          prepareOpenAction={prepareOpenAction}
          rememberPlacesAction={rememberPlacesAction}
          streamEstateAction={streamEstateAction}
        />
      ) : (
        <div
          className={`${softPanel} flex flex-col gap-2 p-4 text-sm text-zinc-600 stage:text-white/70`}
        >
          <p>La recherche se base sur le type et la localisation du bien vendeur. Il manque :</p>
          <ul className="flex flex-col gap-1">
            {missing.map((name) => (
              <li key={name}>
                <Link
                  href={`/builder/${projectId}/property#${propertyFieldId(name)}`}
                  className={`${link} hover:underline`}
                >
                  Renseigner {name === 'city' ? 'la' : 'le'} {SEARCH_REQUIREMENT_LABELS[name]}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
