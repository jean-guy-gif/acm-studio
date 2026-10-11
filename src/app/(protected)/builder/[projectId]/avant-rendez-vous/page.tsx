import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  backLink,
  badgeRejected,
  badgeSelected,
  hintText,
  kickerLabel,
  pageSubtitle,
  pageTitle,
  sectionTitle,
} from '@/components/ui/styles';
import { MarketAndDecision } from '@/features/before-meeting/components/market-and-decision';
import { MarketGlanceCard } from '@/features/before-meeting/components/market-glance-card';
import {
  SellerSequenceCard,
  type SequenceNote,
} from '@/features/before-meeting/components/seller-sequence-card';
import {
  buildLiveSequence,
  tooManyCompetitorsNote,
} from '@/features/before-meeting/services/live-sequence';
import {
  buildMarketGlance,
  toGlanceCompetitor,
} from '@/features/before-meeting/services/market-glance';
import {
  buildReadinessChecks,
  decisionFormulaNote,
  isReadyBadge,
  type ReadinessCheck,
} from '@/features/before-meeting/services/readiness-checks';
import { ComparableAnalysisEnergy } from '@/features/comparable-analysis/components/comparable-analysis-energy';
import { ComparableAnalysisFeatures } from '@/features/comparable-analysis/components/comparable-analysis-features';
import { ComparableAnalysisLocation } from '@/features/comparable-analysis/components/comparable-analysis-location';
import { ComparableAnalysisOutliers } from '@/features/comparable-analysis/components/comparable-analysis-outliers';
import { ComparableAnalysisOverview } from '@/features/comparable-analysis/components/comparable-analysis-overview';
import { ComparableAnalysisPrices } from '@/features/comparable-analysis/components/comparable-analysis-prices';
import { ComparableAnalysisSurfaces } from '@/features/comparable-analysis/components/comparable-analysis-surfaces';
import { getComparables } from '@/features/comparables/queries/get-comparables';
import { isDurationKnown } from '@/features/live-seller/services/project-live-for-seller';
import { pricePerSquareMeter } from '@/features/comparables/services/calculate-comparable-summary';
import { getMainPhotoUrl } from '@/features/comparables/utils/comparable-photos';
import { deletePricePositioning } from '@/features/price-positioning/actions/delete-price-positioning';
import { savePricePositioning } from '@/features/price-positioning/actions/save-price-positioning';
import { ConfidenceCard } from '@/features/price-positioning/components/confidence-card';
import {
  InfluentialComparablesView,
  type InfluentialComparableDisplay,
} from '@/features/price-positioning/components/influential-comparables';
import { PositioningDecisionForm } from '@/features/price-positioning/components/positioning-decision-form';
import { PositioningReasons } from '@/features/price-positioning/components/positioning-reasons';
import { PositioningStatus } from '@/features/price-positioning/components/positioning-status';
import { RecommendedRangeView } from '@/features/price-positioning/components/recommended-range';
import { getSavedPricePositioning } from '@/features/price-positioning/services/get-saved-price-positioning';
import { getProject } from '@/features/projects/queries/get-project';
import { buildSellerPresentation } from '@/features/seller-presentation/services/build-seller-presentation';
import { getSubjectPropertyCondominium } from '@/features/subject-property-condominium/services/get-subject-property-condominium';
import { getSubjectPropertyDiagnostics } from '@/features/subject-property-diagnostics/services/get-subject-property-diagnostics';
import { getPropertyPhotos } from '@/features/subject-property-photos/services/get-property-photos';
import { getSubjectProperty } from '@/features/subject-property/queries/get-subject-property';
import { formatDateTime } from '@/lib/format';

type BeforeMeetingPageProps = {
  params: Promise<{ projectId: string }>;
};

// Où aller pour cocher une pastille encore à faire.
const CHECK_HREF: Record<ReadinessCheck['key'], (projectId: string) => string | null> = {
  property: (id) => `/builder/${id}/property`,
  competitors: (id) => `/builder/${id}/comparables`,
  price_and_surface: (id) => `/builder/${id}/comparables`,
  decision: () => null,
};

const checkDone =
  'inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 stage:border-emerald-400/30 stage:bg-emerald-500/10 stage:text-emerald-300';
const checkTodo =
  'inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 stage:border-amber-400/30 stage:bg-amber-500/10 stage:text-amber-300';

// Mission 91 — « Avant le rendez-vous » : un seul écran à la place de l'analyse, du
// positionnement et de la présentation vendeur. Tout y est calculé à la volée par les mêmes
// moteurs qu'avant ; seule la décision du conseiller s'enregistre.
export default async function BeforeMeetingPage({ params }: BeforeMeetingPageProps) {
  const { projectId } = await params;

  // Accès : getProject est cadré sur l'agence de l'appelant.
  const project = await getProject(projectId);
  if (!project) {
    notFound();
  }

  const [property, comparables, saved, diagnostics, condominium, propertyPhotos] =
    await Promise.all([
      getSubjectProperty(projectId),
      getComparables(projectId),
      getSavedPricePositioning(projectId),
      getSubjectPropertyDiagnostics(projectId),
      getSubjectPropertyCondominium(projectId),
      getPropertyPhotos(projectId),
    ]);

  const generatedAt = new Date().toISOString();
  const presentation = buildSellerPresentation({
    project,
    property,
    diagnostics,
    condominium,
    comparables,
    savedPositioning: saved,
    generatedAt,
    propertyPhotoUrls: propertyPhotos
      .map((photo) => photo.url)
      .filter((url): url is string => url !== null),
  });
  const positioning = presentation.currentPositioning;
  const analysis = presentation.marketAnalysis;

  const retained = comparables.filter((comparable) => comparable.is_selected);
  const glance = buildMarketGlance(
    retained.map((comparable) => toGlanceCompetitor(comparable, generatedAt)),
  );

  const readiness = {
    hasProperty: property != null,
    retainedCount: retained.length,
    exploitableCount: retained.filter(
      (comparable) => pricePerSquareMeter(comparable.price, comparable.surface_area) != null,
    ).length,
    hasDecision: saved != null,
  };
  const checks = buildReadinessChecks(readiness);
  const ready = isReadyBadge(readiness, project.status);

  // Le Live ne montre des concurrents que s'il a un bien vendeur à leur comparer.
  const liveCompetitors = (presentation.live?.comparables ?? []).map((competitor) => ({
    id: competitor.id,
    energyRating: competitor.energyRating,
    durationKnown: isDurationKnown(competitor),
  }));
  const sequence = buildLiveSequence(liveCompetitors, property != null);
  const notes: SequenceNote[] = presentation.warnings.map((warning) => ({
    key: warning.code,
    severity: warning.severity,
    message: warning.message,
  }));
  // Mission 92 — au-delà de 6 concurrents, le Live est long : on le dit, sans rien bloquer.
  const tooMany = tooManyCompetitorsNote(sequence, liveCompetitors.length);
  if (tooMany) {
    notes.unshift({ key: 'too_many_competitors', severity: 'warning', message: tooMany });
  }
  if (sequence.competitorsWithoutDpe > 0) {
    const many = sequence.competitorsWithoutDpe > 1;
    notes.push({
      key: 'competitors_without_dpe',
      severity: 'info',
      message: many
        ? `${sequence.competitorsWithoutDpe} concurrents sans DPE : ils n’apparaissent pas sur l’écran DPE.`
        : '1 concurrent sans DPE : il n’apparaît pas sur l’écran DPE.',
    });
  }

  const byId = new Map(comparables.map((comparable) => [comparable.id, comparable]));
  const influential: InfluentialComparableDisplay[] = (
    positioning?.influentialComparables ?? []
  ).flatMap((entry) => {
    const comparable = byId.get(entry.comparableId);
    if (!comparable) {
      return [];
    }
    return [
      {
        comparableId: entry.comparableId,
        title: comparable.title,
        city: comparable.city,
        district: comparable.district,
        price: comparable.price,
        surfaceArea: comparable.surface_area as number,
        pricePerSquareMeter: pricePerSquareMeter(comparable.price, comparable.surface_area),
        photoUrl: getMainPhotoUrl(comparable),
        surfaceDeviationPercentage: entry.surfaceDeviationPercentage,
        proximityScore: entry.proximityScore,
      },
    ];
  });

  const range = positioning?.status === 'ready' ? positioning.recommendedRange : null;
  const sellerSurface = property?.surface_area ?? null;

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <Link href={`/builder/${projectId}`} className={backLink}>
            ← Retour au dossier
          </Link>
          <span className={kickerLabel}>Dossier · {project.seller_name}</span>
          <h1 className={pageTitle}>Avant le rendez-vous</h1>
          <p className={pageSubtitle}>Tout ce qu’il faut relire et décider, sur un seul écran.</p>
          <ul className="flex flex-wrap gap-2 pt-1">
            {checks.map((check) => {
              const href = check.done ? null : CHECK_HREF[check.key](projectId);
              const content = (
                <>
                  <span aria-hidden="true">{check.done ? '✓' : '○'}</span>
                  {check.label}
                  <span className="sr-only">{check.done ? ' — fait' : ' — à faire'}</span>
                </>
              );
              return (
                <li key={check.key}>
                  {href ? (
                    <Link href={href} className={`${checkTodo} hover:border-amber-400`}>
                      {content}
                    </Link>
                  ) : (
                    <span className={check.done ? checkDone : checkTodo}>{content}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
        <span className={`${ready ? badgeSelected : badgeRejected} px-3 py-1 text-sm`}>
          {ready ? 'Prêt' : 'Presque prêt'}
        </span>
      </div>

      <MarketAndDecision
        market={<MarketGlanceCard glance={glance} />}
        decision={
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <h2 className={sectionTitle}>Votre décision</h2>
                <p className={hintText}>Ce que vous direz au vendeur à la fin du Live.</p>
              </div>
              {saved ? (
                <PositioningStatus
                  freshness={
                    presentation.positioningStatus === 'up_to_date' ? 'up_to_date' : 'outdated'
                  }
                />
              ) : null}
            </div>
            {range && positioning && sellerSurface != null ? (
              <PositioningDecisionForm
                defaultAdvisorPrice={positioning.defaultAdvisorPrice ?? range.central}
                formulaNote={decisionFormulaNote(
                  sellerSurface,
                  positioning.dataset.excludedOutlierCount,
                )}
                hasSaved={saved != null}
                isOutdated={presentation.positioningStatus === 'outdated'}
                initialAdvisorPrice={saved?.advisorPrice ?? range.central}
                initialAdvisorAnalysis={saved?.advisorComparativeMarketPrice ?? null}
                initialJustification={saved?.justification ?? ''}
                saveAction={savePricePositioning.bind(null, projectId)}
                deleteAction={deletePricePositioning.bind(null, projectId)}
                projectId={projectId}
              />
            ) : (
              <div className="flex flex-col gap-2">
                <p className={hintText}>
                  Le prix des concurrents ne peut pas encore être calculé : la décision s’enregistre
                  dès que les données suffisent.
                </p>
                <PositioningReasons reasons={positioning?.reasons ?? []} />
              </div>
            )}
            {saved ? (
              <p className="text-xs text-zinc-500 stage:text-white/50">
                Décision enregistrée le {formatDateTime(saved.validatedAt)}.
                {presentation.positioningStatus === 'outdated'
                  ? ' Les concurrents ou le bien ont changé depuis : le prix calculé n’est plus le même.'
                  : ''}
              </p>
            ) : null}
          </>
        }
        details={
          analysis == null || analysis.statistics.count === 0 ? (
            <p className={hintText}>
              Aucun concurrent retenu avec un prix et une surface : l’analyse ne peut pas être
              produite.
            </p>
          ) : (
            <>
              <ComparableAnalysisOverview
                statistics={analysis.statistics}
                sellerComparison={analysis.sellerComparison}
              />
              <ComparableAnalysisPrices priceAnalysis={analysis.priceAnalysis} />
              <ComparableAnalysisSurfaces surfaceAnalysis={analysis.surfaceAnalysis} />
              <ComparableAnalysisFeatures featureAnalysis={analysis.featureAnalysis} />
              <ComparableAnalysisEnergy
                dpeAnalysis={analysis.dpeAnalysis}
                gesAnalysis={analysis.gesAnalysis}
              />
              <ComparableAnalysisLocation locationAnalysis={analysis.locationAnalysis} />
              <ComparableAnalysisOutliers outliers={analysis.outliers} />
              {range && positioning ? (
                <>
                  <RecommendedRangeView range={range} usedCount={positioning.dataset.usedCount} />
                  <ConfidenceCard confidence={positioning.confidence} />
                  <InfluentialComparablesView comparables={influential} />
                  <PositioningReasons reasons={positioning.reasons} />
                </>
              ) : null}
            </>
          )
        }
      />

      <SellerSequenceCard sequence={sequence} notes={notes} projectId={projectId} />
    </div>
  );
}
