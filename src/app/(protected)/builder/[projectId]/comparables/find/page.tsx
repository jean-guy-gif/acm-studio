import { saveSearchDefaults } from '@/features/competitor-search/actions/save-search-defaults';
import { parseSearchSettings } from '@/features/competitor-search/services/search-settings';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { backLink, kickerLabel, link, pageTitle, softPanel } from '@/components/ui/styles';
import { prepareCompetitorSearch } from '@/features/competitor-search/actions/prepare-competitor-search';
import { prepareOpenSearches } from '@/features/competitor-search/actions/prepare-open-searches';
import { rememberPortalPlaces } from '@/features/competitor-search/actions/remember-portal-places';
import { rankCompetitorCandidates } from '@/features/competitor-search/actions/rank-competitor-candidates';
import { recordCompetitorDecision } from '@/features/competitor-search/actions/record-competitor-decision';
import { recordCompetitorDecisions } from '@/features/competitor-search/actions/record-competitor-decisions';
import { saveSearchSettings } from '@/features/competitor-search/actions/save-search-settings';
import { searchStreamEstate } from '@/features/competitor-search/actions/search-stream-estate';
import { CompetitorSearchPanel } from '@/features/competitor-search/components/competitor-search-panel';
import { loadSearchCriteria } from '@/features/competitor-search/queries/load-search-criteria';
import { geocodeSubject, resolveCommune } from '@/features/competitor-search/services/fetch-geo';
import { displayCommune } from '@/features/competitor-search/utils/arrondissements';
import { streamEstateApiKey } from '@/features/competitor-search/services/stream-estate-config';
import { searchDefaults } from '@/features/competitor-search/services/stream-estate-tiers';
import { getProject } from '@/features/projects/queries/get-project';
import { getSearchBudget } from '@/features/search-budget/queries/get-search-budget';
import { budgetWarningLabel } from '@/features/search-budget/services/budget';
import { getSubjectProperty } from '@/features/subject-property/queries/get-subject-property';
import {
  missingForSearch,
  propertyFieldId,
  SEARCH_REQUIREMENT_LABELS,
} from '@/features/subject-property/services/search-requirements';
import { isManagerRole } from '@/features/team/services/role';
import { getProfile } from '@/lib/auth/get-profile';

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
  const recordDecisionsAction = recordCompetitorDecisions.bind(null, projectId);
  const prepareOpenAction = prepareOpenSearches.bind(null, projectId);
  const rememberPlacesAction = rememberPortalPlaces.bind(null, projectId);
  // Essai Stream Estate : seulement si la clé est définie côté serveur. On transmet une action
  // liée, jamais la clé.
  const streamEstateAvailable =
    // Mission 97 — jamais sur un dossier d'exemple : rien n'est facturé pour une démonstration.
    streamEstateApiKey() != null && !project.is_example;
  // Mission 100 — le budget de recherche du mois. Atteint : le bouton est remplacé, aucun appel
  // ne part (l'action le refuse aussi). À 80 %, le manager de l'agence est prévenu. Un budget
  // illisible ne retire pas le bouton : c'est l'action qui refusera, en le disant.
  const profile = streamEstateAvailable ? await getProfile() : null;
  const budgetRead = profile ? await getSearchBudget(profile.agency_id) : null;
  const budget = budgetRead?.ok ? budgetRead.budget : null;
  const streamEstateAction =
    streamEstateAvailable && !budget?.reached
      ? searchStreamEstate.bind(null, projectId)
      : undefined;
  const budgetNotice =
    budget != null && isManagerRole(profile?.role) ? budgetWarningLabel(budget) : null;

  // Mission 99 — « Réglages de la recherche » : ce qui est enregistré sur le dossier, et les
  // valeurs que l'outil utiliserait seul (les bornes de la première recherche). L'adresse est
  // géocodée comme le fera la recherche (services publics gratuits, en cache un jour) pour dire
  // si le secteur automatique part du quartier ou de toute la commune.
  const loaded =
    streamEstateAction != null && missing.length === 0 ? await loadSearchCriteria(projectId) : null;
  let searchSettings: Parameters<typeof CompetitorSearchPanel>[0]['searchSettings'];
  if (loaded?.ok) {
    const commune = await resolveCommune(loaded.criteria.city, loaded.criteria.postalCode);
    const geocode = await geocodeSubject(
      loaded.address,
      loaded.criteria.postalCode,
      commune.ok ? commune.name : loaded.criteria.city,
    );
    searchSettings = {
      saved: loaded.settings,
      defaults: searchDefaults(
        loaded.criteria,
        geocode.ok,
        commune.ok && commune.arrondissement != null,
      ),
      saveAction: saveSearchSettings.bind(null, projectId),
      advisorDefaults: parseSearchSettings((await getProfile())?.search_defaults),
      saveDefaultsAction: saveSearchDefaults,
    };
  }

  const criteriaLabel = hasCity
    ? // Mission 99 — « Paris 15e 75015 » : l'arrondissement se lit dans le code postal.
      [displayCommune(property?.city, property?.postal_code), property?.postal_code]
        .filter(Boolean)
        .join(' ')
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
          recordDecisionsAction={recordDecisionsAction}
          prepareOpenAction={prepareOpenAction}
          rememberPlacesAction={rememberPlacesAction}
          keptResultAvailable={streamEstateAvailable}
          streamEstateAction={streamEstateAction}
          budgetReached={streamEstateAvailable && budget?.reached === true}
          budgetNotice={budgetNotice}
          searchSettings={searchSettings}
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
