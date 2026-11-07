import {
  competitorsWithPriceOrSurfaceToVerify,
  countFieldsToVerify,
  importedToVerifyLabel,
  priceOrSurfaceToVerifyLabel,
} from '@/features/imported-fields/services/fields-to-verify';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  backLink,
  badgeRejected,
  badgeSelected,
  btnPrimary,
  btnSecondary,
  hintText,
  kickerLabel,
  pageSubtitle,
  pageTitle,
  sectionTitle,
  link,
} from '@/components/ui/styles';
import { MarketAndDecision } from '@/features/before-meeting/components/market-and-decision';
import { MarketGlanceCard } from '@/features/before-meeting/components/market-glance-card';
import {
  SellerSequenceCard,
  type SequenceNote,
} from '@/features/before-meeting/components/seller-sequence-card';
import { LiveRhythmSetting } from '@/features/before-meeting/components/live-rhythm-setting';
import { ClientLanguageSetting } from '@/features/before-meeting/components/client-language-setting';
import { PresentationModeSetting } from '@/features/before-meeting/components/presentation-mode-setting';
import {
  bothRhythmsLabel,
  buildLiveSequence,
  tooManyCompetitorsNote,
} from '@/features/before-meeting/services/live-sequence';
import { setLiveRhythm } from '@/features/live-seller/actions/live-timing-actions';
import { PropertyBuyersBlock } from '@/features/buyers/components/property-buyers-block';
import { getPropertyBuyers } from '@/features/buyers/queries/get-property-buyers';
import { LiveLaunchActions } from '@/features/live-seller/components/live-launch-actions';
import {
  EXPORT_COMPARISON_HINT,
  EXPORT_COMPARISON_LABEL,
} from '@/features/expert-mode/services/export-labels';
import { LiveOrderEditor } from '@/features/live-seller/components/live-order-editor';
import { neutralComparableLabel } from '@/features/live-seller/utils/neutral-comparable-label';
import { LiveShortlistPicker } from '@/features/live-seller/components/live-shortlist-picker';
import { getLiveShortlist } from '@/features/live-seller/queries/get-live-shortlist';
import { LIVE_SHORTLIST_SIZE } from '@/features/live-seller/services/live-shortlist';
import { getLiveLaunchInfo } from '@/features/live-seller/queries/get-live-launch-info';
import { getProfile } from '@/lib/auth/get-profile';
import { REAL_DOSSIER_NOTE } from '@/features/live-seller/services/live-launch';
import { hasLiveStarted } from '@/features/live-seller/services/live-resume';
import { canChangeLiveRhythm } from '@/features/live-seller/services/live-timing';
import {
  buildMarketGlance,
  toGlanceCompetitor,
} from '@/features/before-meeting/services/market-glance';
import {
  buildReadinessChecks,
  decisionFormulaNote,
  excludedOutliersLabel,
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
import { isDecisionLocked } from '@/features/price-positioning/services/decision-lock';
import { PositioningDecisionForm } from '@/features/price-positioning/components/positioning-decision-form';
import { PositioningReasons } from '@/features/price-positioning/components/positioning-reasons';
import { PositioningStatus } from '@/features/price-positioning/components/positioning-status';
import { RecommendedRangeView } from '@/features/price-positioning/components/recommended-range';
import { getSavedPricePositioning } from '@/features/price-positioning/services/get-saved-price-positioning';
import { PendingImportsBanner } from '@/features/competitor-search/components/pending-imports-banner';
import { getPendingImports } from '@/features/competitor-search/queries/get-pending-imports';
import { getProject } from '@/features/projects/queries/get-project';
import { buildSellerPresentation } from '@/features/seller-presentation/services/build-seller-presentation';
import { getSubjectPropertyCondominium } from '@/features/subject-property-condominium/services/get-subject-property-condominium';
import { getSubjectPropertyDiagnostics } from '@/features/subject-property-diagnostics/services/get-subject-property-diagnostics';
import { getPropertyPhotos } from '@/features/subject-property-photos/services/get-property-photos';
import { getSubjectProperty } from '@/features/subject-property/queries/get-subject-property';
import { formatDateTime } from '@/lib/format';
import { addressDossierView } from '@/features/address-dossier/queries/get-address-dossier';
import type { RealSalesSummary } from '@/features/address-dossier/services/dossier-texts';

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

  // Mission 128 B — tout ce qui ne dépend que du dossier part ensemble.
  const [
    property,
    comparables,
    saved,
    diagnostics,
    condominium,
    propertyPhotos,
    pendingImports,
    launch,
    profile,
    buyers,
  ] = await Promise.all([
    getSubjectProperty(projectId),
    getComparables(projectId),
    getSavedPricePositioning(projectId),
    getSubjectPropertyDiagnostics(projectId),
    getSubjectPropertyCondominium(projectId),
    getPropertyPhotos(projectId),
    // Mission 101 — les biens retenus dont l'import n'a pas abouti : jamais perdus, toujours dits.
    getPendingImports(projectId),
    // Mission 104 — le bouton du Live vérifie avant d'ouvrir ; les prix et surfaces à vérifier
    // sont nommés ; les concurrents écartés du calcul sont comptés.
    getLiveLaunchInfo(projectId),
    getProfile(),
    // Mission 133 — les acquéreurs de l'agence pour ce bien ; jamais pour un dossier d'exemple
    // (le profil est déjà lu pour cette requête, `cache` de React, M128 B).
    project.is_example
      ? undefined
      : getProfile().then((viewer) =>
          viewer ? getPropertyBuyers(viewer.agency_id, projectId, new Date()) : undefined,
        ),
  ]);
  // Mission 141 — les ventes réelles du dossier d'adresse, à côté de l'analyse de valeur.
  const addressDossier = await addressDossierView(projectId, property);
  const realSales: RealSalesSummary | null =
    addressDossier.state === 'built' && addressDossier.blocks.sales.state === 'ok'
      ? {
          radiusM: addressDossier.blocks.sales.data.radiusM,
          count: addressDossier.blocks.sales.data.count,
          stats: addressDossier.blocks.sales.data.stats,
          surface: property?.surface_area ?? null,
        }
      : null;

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
  const toVerifyLabel = importedToVerifyLabel(countFieldsToVerify(property, comparables));
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
    // Mission 108 — un retenu en attente d'import retient le badge « Prêt ».
    pendingImportCount: pendingImports.length,
  };
  const checks = buildReadinessChecks(readiness);
  const ready = isReadyBadge(readiness, project.status);

  // Le Live ne montre des concurrents que s'il a un bien vendeur à leur comparer.
  const liveCompetitors = (presentation.live?.comparables ?? []).map((competitor) => ({
    id: competitor.id,
    energyRating: competitor.energyRating,
    durationKnown: isDurationKnown(competitor),
  }));
  // Mission 95 — le déroulé et la durée suivent le rythme choisi ; les deux estimations
  // s'affichent côte à côte. Le rythme ne se modifie plus une fois le Live commencé.
  const rhythm = presentation.project.liveRhythm;
  // Mission 131 — la façon de présenter : le déroulé suit le Live interactif ou la présentation
  // directe ; « Document seul » n'a pas de Live (le déroulé reste, à titre indicatif).
  const presentationMode = presentation.project.presentationMode;
  const sequenceMode = presentationMode === 'direct' ? 'direct' : 'interactive';
  const sequence = buildLiveSequence(liveCompetitors, property != null, rhythm, sequenceMode);
  const other = buildLiveSequence(
    liveCompetitors,
    property != null,
    rhythm === 'accelerated' ? 'complete' : 'accelerated',
    sequenceMode,
  );
  const bothEstimates = bothRhythmsLabel(
    rhythm === 'accelerated' ? sequence : other,
    rhythm === 'complete' ? sequence : other,
  );
  const rhythmLocked = !canChangeLiveRhythm({
    liveStartedAt: presentation.project.liveStartedAt,
    hasSellerAnswers: hasLiveStarted(presentation.live),
  });
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

  // Mission 110 — le mode expert masque les rappels d'entraînement, et choisit l'ordre du Live.
  const expert = profile?.expert_mode === true;
  const shortlist =
    launch && !launch.resume.started && retained.length > LIVE_SHORTLIST_SIZE
      ? await getLiveShortlist(projectId)
      : null;
  const priceOrSurfaceToVerify = competitorsWithPriceOrSurfaceToVerify(retained);
  const priceOrSurfaceLabel = priceOrSurfaceToVerifyLabel(priceOrSurfaceToVerify.length);
  const excludedOutliers = positioning?.dataset.excludedOutlierCount ?? 0;

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <PendingImportsBanner projectId={projectId} pending={pendingImports} />
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
          {/* Mission 97 — ce qui vient d'un import et n'a pas été relu : compté, jamais bloquant. */}
          {toVerifyLabel ? (
            <p
              data-testid="imported-to-verify"
              className="text-sm text-amber-700 stage:text-amber-300"
            >
              {toVerifyLabel} —{' '}
              <Link href={`/builder/${projectId}/property`} className={link}>
                le bien vendeur
              </Link>{' '}
              ou{' '}
              <Link href={`/builder/${projectId}/comparables`} className={link}>
                les concurrents
              </Link>
              .
            </p>
          ) : null}
          {priceOrSurfaceLabel ? (
            <p
              data-testid="price-surface-to-verify"
              className="text-sm text-amber-700 stage:text-amber-300"
            >
              {priceOrSurfaceLabel} :{' '}
              {priceOrSurfaceToVerify.map((competitor, index) => (
                <span key={competitor.id}>
                  {index > 0 ? ', ' : ''}
                  <Link
                    href={`/builder/${projectId}/comparables/${competitor.id}/edit`}
                    className={link}
                  >
                    {competitor.title?.trim() || `concurrent ${index + 1}`}
                  </Link>
                </span>
              ))}
              .
            </p>
          ) : null}
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
                <h2 className={sectionTitle}>Votre décision de prix</h2>
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
                locked={isDecisionLocked(project.status)}
                realSales={realSales}
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
            {/* Mission 141 — sans ventes réelles, le chemin vers le dossier d'adresse. */}
            {realSales == null ? (
              <p className={hintText} data-testid="real-sales-missing">
                {addressDossier.state === 'built'
                  ? 'Aucune vente réelle trouvée autour de l’adresse du bien.'
                  : 'Ventes réelles autour du bien : '}
                {addressDossier.state === 'built' ? null : (
                  <Link href={`/builder/${projectId}/property`} className={link}>
                    construisez le dossier d’adresse sur l’onglet Bien vendeur
                  </Link>
                )}
                {addressDossier.state === 'built' ? null : '.'}
              </p>
            ) : null}
            {/* Mission 104 — côté conseiller seulement : qui n'entre pas dans le calcul. */}
            {excludedOutliers > 0 ? (
              <p
                data-testid="excluded-outliers"
                className="text-sm text-zinc-600 stage:text-white/70"
              >
                {excludedOutliersLabel(excludedOutliers)}
              </p>
            ) : null}
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

      {buyers !== undefined ? <PropertyBuyersBlock result={buyers} proposeKey={null} /> : null}

      {/* Mission 110 — au-delà de 6 retenus : les concurrents montrés au Live, modifiables tant
          que le Live n'a pas commencé. */}
      {shortlist ? (
        <LiveShortlistPicker
          projectId={projectId}
          shortlist={shortlist}
          pending={shortlist.pending}
        />
      ) : null}

      {/* Mission 110 — mode expert : le comparatif en tableur, pour le conseiller seul. */}
      {expert && retained.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3">
          <a
            href={`/builder/${projectId}/export-comparatif`}
            download
            className={`${btnSecondary} px-3 py-1.5 text-sm`}
            data-testid="export-comparison"
          >
            {EXPORT_COMPARISON_LABEL}
          </a>
          <span className="text-xs text-zinc-500 stage:text-white/55">
            {EXPORT_COMPARISON_HINT}
          </span>
        </div>
      ) : null}

      {/* Mission 110 — mode expert : l'ordre de passage des concurrents au Live, par
          glisser-déposer, tant que le Live n'a pas commencé. */}
      {expert && retained.length > 1 ? (
        <LiveOrderEditor
          projectId={projectId}
          frozen={rhythmLocked}
          entries={retained.map((comparable) => ({
            id: comparable.id,
            label: neutralComparableLabel({
              propertyType: comparable.property_type,
              roomsCount: comparable.rooms_count,
              surfaceArea: comparable.surface_area,
              city: comparable.city,
              district: comparable.district,
            }),
            shown: comparable.excluded_from_live !== true,
          }))}
        />
      ) : null}

      <SellerSequenceCard
        sequence={sequence}
        notes={notes}
        launch={
          presentationMode === 'document' ? (
            // Mission 131 — « Document seul » : pas de Live à lancer ; l'Étude de marché, puis la
            // conclusion du rendez-vous depuis le dossier.
            <div className="flex flex-wrap items-center justify-end gap-2" data-document-only>
              <Link href={`/builder/${projectId}/etude-de-marche`} className={btnPrimary}>
                Ouvrir l’Étude de marché
              </Link>
              <Link href={`/builder/${projectId}/conclusion`} className={btnSecondary}>
                Conclure le rendez-vous
              </Link>
            </div>
          ) : launch ? (
            <div className="flex flex-col items-end gap-1.5">
              <LiveLaunchActions
                projectId={projectId}
                competitorCount={launch.competitorCount}
                resume={launch.resume}
                isExample={launch.isExample}
                toVerifyCount={launch.toVerifyCount}
                decisionOutdated={launch.decisionOutdated}
                decisionMissing={launch.decisionMissing}
                shortlistPending={launch.shortlistPending}
                pendingImportCount={launch.pendingImportCount}
                secondary
              />
              {/* Mission 104 — avant le clic : devant le vendeur, ses réponses sont figées. */}
              {!launch.isExample && !launch.resume.started && !expert ? (
                <p
                  data-testid="real-dossier-note"
                  className="max-w-xs text-right text-xs text-zinc-500 stage:text-white/55"
                >
                  {REAL_DOSSIER_NOTE}
                </p>
              ) : null}
            </div>
          ) : null
        }
        rhythmSetting={
          <div className="flex flex-col gap-5">
            <PresentationModeSetting
              projectId={projectId}
              mode={presentationMode}
              liveStarted={rhythmLocked}
              concluded={
                presentation.project.status === 'meeting_completed' ||
                presentation.project.status === 'archived'
              }
            />
            {presentation.project.status === 'archived' ? null : (
              <ClientLanguageSetting
                projectId={projectId}
                language={presentation.project.language}
              />
            )}
            {presentationMode === 'document' ? null : (
              <LiveRhythmSetting
                rhythm={rhythm}
                locked={rhythmLocked}
                bothEstimates={bothEstimates}
                action={setLiveRhythm.bind(null, projectId)}
              />
            )}
            <Link
              href={`/builder/${projectId}/etude-de-marche`}
              className={`${link} w-fit text-sm`}
              data-testid="market-study-link"
            >
              Télécharger l’Étude de marché
            </Link>
          </div>
        }
      />
    </div>
  );
}
