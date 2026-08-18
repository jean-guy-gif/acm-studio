import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  DEMO_AT,
  demoComparables,
  demoProject,
  demoProperty,
  demoSavedPositioning,
} from '@/app/design-preview/demo-data';
import { AppShell } from '@/components/app-shell/app-shell';
import type { AppTheme } from '@/components/theme/theme';
import {
  alertError,
  backLink,
  badgeBrand,
  badgeNeutral,
  badgeSelected,
  btnDangerGhost,
  btnPrimary,
  btnSecondary,
  card,
  emptyState,
  kickerLabel,
  pageSubtitle,
  pageTitle,
  sectionTitle,
} from '@/components/ui/styles';
import { ComparableAnalysisEnergy } from '@/features/comparable-analysis/components/comparable-analysis-energy';
import { ComparableAnalysisFeatures } from '@/features/comparable-analysis/components/comparable-analysis-features';
import { ComparableAnalysisLocation } from '@/features/comparable-analysis/components/comparable-analysis-location';
import { ComparableAnalysisOutliers } from '@/features/comparable-analysis/components/comparable-analysis-outliers';
import { ComparableAnalysisOverview } from '@/features/comparable-analysis/components/comparable-analysis-overview';
import { ComparableAnalysisPrices } from '@/features/comparable-analysis/components/comparable-analysis-prices';
import { ComparableAnalysisSurfaces } from '@/features/comparable-analysis/components/comparable-analysis-surfaces';
import { calculateComparableAnalysis } from '@/features/comparable-analysis/services/calculate-comparable-analysis';
import { ComparableFormFields } from '@/features/comparables/comparable-form-fields';
import { ComparableSelectionSummaryView } from '@/features/comparables/components/comparable-selection-summary';
import { ComparableSelectionWarningsView } from '@/features/comparables/components/comparable-selection-warnings';
import { RejectedComparablesList } from '@/features/comparables/components/rejected-comparables-list';
import { SelectedComparablesList } from '@/features/comparables/components/selected-comparables-list';
import { calculateComparableSummary } from '@/features/comparables/services/calculate-comparable-summary';
import { pricePerSquareMeter } from '@/features/comparables/services/calculate-comparable-summary';
import { getMainPhotoUrl } from '@/features/comparables/utils/comparable-photos';
import { CompetitorSearchPanel } from '@/features/competitor-search/components/competitor-search-panel';
import { ConfidenceCard } from '@/features/price-positioning/components/confidence-card';
import { InfluentialComparablesView } from '@/features/price-positioning/components/influential-comparables';
import type { InfluentialComparableDisplay } from '@/features/price-positioning/components/influential-comparables';
import { PositioningDecisionForm } from '@/features/price-positioning/components/positioning-decision-form';
import { PositioningReasons } from '@/features/price-positioning/components/positioning-reasons';
import { RecommendedRangeView } from '@/features/price-positioning/components/recommended-range';
import { SavedPositioningCard } from '@/features/price-positioning/components/saved-positioning-card';
import { calculatePricePositioning } from '@/features/price-positioning/services/calculate-price-positioning';
import { statusLabel } from '@/features/projects/status-label';
import { PresentationComparables } from '@/features/seller-presentation/components/presentation-comparables';
import { PresentationMarketAnalysis } from '@/features/seller-presentation/components/presentation-market-analysis';
import { PresentationPositioning } from '@/features/seller-presentation/components/presentation-positioning';
import { PresentationProperty } from '@/features/seller-presentation/components/presentation-property';
import { PresentationReadiness } from '@/features/seller-presentation/components/presentation-readiness';
import { PresentationSectionCard } from '@/features/seller-presentation/components/presentation-section-card';
import { PresentationWarnings } from '@/features/seller-presentation/components/presentation-warnings';
import { buildSellerPresentation } from '@/features/seller-presentation/services/build-seller-presentation';
import { CondominiumForm } from '@/features/subject-property-condominium/components/condominium-form';
import { DiagnosticsForm } from '@/features/subject-property-diagnostics/components/diagnostics-form';
import { SubjectPropertyForm } from '@/features/subject-property/components/subject-property-form';
import { NewComparablePanel } from '@/app/(protected)/builder/[projectId]/comparables/new/new-comparable-panel';

import {
  previewCreateComparable,
  previewDeletePositioning,
  previewImport,
  previewImportSearchResults,
  previewSaveCondominium,
  previewSaveDiagnostics,
  previewSaveProperty,
  previewSavePositioning,
  previewSearchCompetitors,
  previewVoid,
} from './preview-actions';

// ---------------------------------------------------------------------------
// Aperçu design du SHELL APPLICATIF — OUTIL DE DÉVELOPPEMENT UNIQUEMENT.
// Données 100 % fictives (« Démo »), actions serveur factices qui n'écrivent
// rien. Inaccessible en production sauf ACM_DESIGN_PREVIEW=1.
//
//   /design-preview/app?screen=dashboard&theme=dark
//     screen : dashboard | hub | property | comparables | new | find | edit |
//              analysis | positioning | presentation | live-index | admin
//     theme  : light (défaut) | dark
//
// Les en-têtes de page sont volontairement re-déclarés ici (mêmes jetons de
// style que les vraies pages) ; les blocs riches réutilisent les VRAIS
// composants et les VRAIS services de calcul sur les fixtures.
// ---------------------------------------------------------------------------

const demoProjects = [
  { ...demoProject, id: 'demo-1', seller_name: 'M. et Mme Démo', status: 'preparation' },
  {
    ...demoProject,
    id: 'demo-2',
    seller_name: 'Mme Exemple',
    seller_email: 'exemple@demo.fr',
    status: 'ready_for_meeting',
  },
  { ...demoProject, id: 'demo-3', seller_name: 'M. Spécimen', status: 'draft' },
];

const statusBadge = (status: string): string => {
  if (status === 'ready_for_meeting') return badgeSelected;
  if (status === 'meeting_completed') return badgeBrand;
  return badgeNeutral;
};

function Header({
  back,
  kicker,
  title,
  subtitle,
  action,
}: {
  back?: string;
  kicker: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-2">
        {back ? (
          <Link href="/design-preview/app" className={backLink}>
            ← {back}
          </Link>
        ) : null}
        <span className={kickerLabel}>{kicker}</span>
        <h1 className={pageTitle}>{title}</h1>
        {subtitle ? <p className={pageSubtitle}>{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

function DashboardScreen() {
  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <Header
        kicker="Dossiers vendeurs"
        title="Préparation"
        subtitle="3 dossiers en cours dans votre agence."
        action={<span className={btnPrimary}>Nouveau dossier vendeur</span>}
      />
      <ul className="flex flex-col gap-3">
        {demoProjects.map((project) => (
          <li
            key={project.id}
            className={`${card} flex flex-col gap-4 p-4 transition-colors hover:border-brand sm:flex-row sm:items-center sm:justify-between sm:p-5 stage:hover:border-brand`}
          >
            <div className="flex min-w-0 flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-title text-xl font-semibold text-zinc-900 stage:text-white">
                  {project.seller_name}
                </span>
                <span className={statusBadge(project.status)}>{statusLabel(project.status)}</span>
              </div>
              <span className="truncate text-sm text-zinc-500 stage:text-white/55">
                {project.seller_email || 'E-mail non renseigné'} · Téléphone non renseigné
              </span>
              <span className="text-xs text-zinc-400 stage:text-white/40">
                Créé le {new Date(project.created_at).toLocaleDateString('fr-FR')}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className={btnSecondary}>Ouvrir le dossier</span>
              <span className={btnDangerGhost}>Supprimer</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

const HUB_STEPS = [
  {
    title: 'Bien vendeur',
    description: 'Caractéristiques, diagnostics et copropriété du bien à vendre.',
  },
  {
    title: 'Biens concurrents',
    description: 'Importer depuis les portails, rechercher, accepter ou écarter.',
  },
  {
    title: 'Analyse comparative',
    description: 'Le bien face à ses concurrents, critère par critère.',
  },
  {
    title: 'Positionnement prix',
    description: 'Fourchette issue du marché, décision validée par le conseiller.',
  },
  {
    title: 'Présentation vendeur',
    description: 'Vérifier la matière préparée avant le rendez-vous.',
  },
];

function HubScreen() {
  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <Header
        back="Retour aux dossiers"
        kicker="Dossier vendeur"
        title="M. et Mme Démo"
        subtitle="E-mail non renseigné · Téléphone non renseigné · Créé le 01/08/2026"
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {HUB_STEPS.map((step, index) => (
          <span
            key={step.title}
            className={`${card} group flex items-start gap-4 p-5 transition-all hover:-translate-y-0.5 hover:border-brand hover:shadow-lg hover:shadow-brand/10 stage:hover:border-brand stage:hover:shadow-none`}
          >
            <span className="font-title text-3xl leading-none font-bold text-brand/35 transition-colors group-hover:text-brand stage:text-brand/40">
              {index + 1}
            </span>
            <span className="flex min-w-0 flex-col gap-1">
              <span className="font-title text-lg leading-snug font-semibold text-zinc-900 stage:text-white">
                {step.title}
              </span>
              <span className="text-sm text-zinc-500 stage:text-white/55">{step.description}</span>
            </span>
          </span>
        ))}
        <span className="group flex items-start gap-4 rounded-2xl bg-gradient-to-br from-brand-deep via-[#013a58] to-[#01283b] p-5 text-white shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand/25">
          <span className="font-title text-3xl leading-none font-bold text-brand transition-transform group-hover:translate-x-0.5">
            →
          </span>
          <span className="flex min-w-0 flex-col gap-1">
            <span className="font-title text-lg leading-snug font-semibold">Lancer le Live</span>
            <span className="text-sm text-white/65">
              Le rendez-vous vendeur en mode présentation, plein écran.
            </span>
          </span>
        </span>
      </div>
    </div>
  );
}

function PropertyScreen() {
  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <Header back="Retour au dossier" kicker="Dossier · M. et Mme Démo" title="Bien vendeur" />
      <SubjectPropertyForm property={demoProperty} saveAction={previewSaveProperty} />
      <DiagnosticsForm diagnostics={null} saveAction={previewSaveDiagnostics} />
      <CondominiumForm condominium={null} saveAction={previewSaveCondominium} />
    </div>
  );
}

function ComparablesScreen() {
  const summary = calculateComparableSummary(demoComparables);
  const selected = demoComparables.filter((comparable) => comparable.is_selected);
  const rejected = demoComparables.filter((comparable) => !comparable.is_selected);
  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <Header
        back="Retour au dossier"
        kicker="Dossier · M. et Mme Démo"
        title="Biens concurrents"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <span className={btnPrimary}>Ajouter un bien</span>
            <span className={btnSecondary}>Trouver des concurrents</span>
            <span className={btnSecondary}>Voir l’analyse</span>
          </div>
        }
      />
      <ComparableSelectionSummaryView summary={summary} />
      <ComparableSelectionWarningsView warnings={summary.warnings} />
      <SelectedComparablesList
        comparables={selected}
        projectId="design-preview"
        subjectSurfaceArea={demoProperty.surface_area}
        toggleAction={previewVoid}
        moveAction={previewVoid}
        deleteAction={previewVoid}
      />
      <RejectedComparablesList
        comparables={rejected}
        projectId="design-preview"
        subjectSurfaceArea={demoProperty.surface_area}
        toggleAction={previewVoid}
        deleteAction={previewVoid}
      />
    </div>
  );
}

function NewComparableScreen() {
  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <Header
        back="Retour aux biens concurrents"
        kicker="Dossier · M. et Mme Démo"
        title="Ajouter un bien concurrent"
      />
      <NewComparablePanel
        createAction={previewCreateComparable}
        importAction={previewImport}
        importHtmlAction={previewImport}
      />
    </div>
  );
}

function FindScreen() {
  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <Header
        back="Retour aux biens concurrents"
        kicker="Dossier · M. et Mme Démo"
        title="Trouver des concurrents"
      />
      <CompetitorSearchPanel
        projectId="design-preview"
        criteriaLabel="Nice 06000"
        searchAction={previewSearchCompetitors}
        importResultsHtmlAction={previewImportSearchResults}
      />
    </div>
  );
}

function EditScreen() {
  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <Header
        back="Retour aux biens concurrents"
        kicker="Bien concurrent"
        title="Modifier le bien"
      />
      <div className={`${card} grid w-full max-w-3xl grid-cols-1 gap-4 p-5 sm:grid-cols-2 sm:p-6`}>
        <ComparableFormFields comparable={demoComparables[0]} />
        <span className={`${btnPrimary} mt-2 justify-self-start sm:col-span-2`}>
          Enregistrer les modifications
        </span>
      </div>
    </div>
  );
}

function AnalysisScreen() {
  const analysis = calculateComparableAnalysis(demoComparables, demoProperty.surface_area);
  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <Header
        back="Retour aux biens concurrents"
        kicker="Dossier · M. et Mme Démo"
        title="Analyse des comparables"
        action={<span className={btnSecondary}>Voir le positionnement →</span>}
      />
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
    </div>
  );
}

function PositioningScreen() {
  const positioning = calculatePricePositioning({
    comparables: demoComparables,
    sellerProperty: { surfaceArea: demoProperty.surface_area },
  });
  const byId = new Map(demoComparables.map((comparable) => [comparable.id, comparable]));
  const influential: InfluentialComparableDisplay[] = positioning.influentialComparables.flatMap(
    (entry) => {
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
    },
  );
  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <Header
        back="Retour à l’analyse"
        kicker="Dossier · M. et Mme Démo"
        title="Positionnement du prix"
        action={<span className={btnSecondary}>Préparer la présentation vendeur →</span>}
      />
      {positioning.status === 'ready' && positioning.recommendedRange ? (
        <>
          <div className="flex flex-col gap-4">
            <h2 className={sectionTitle}>Calcul courant</h2>
            <RecommendedRangeView
              range={positioning.recommendedRange}
              usedCount={positioning.dataset.usedCount}
            />
            <ConfidenceCard confidence={positioning.confidence} />
            <InfluentialComparablesView comparables={influential} />
            <PositioningReasons reasons={positioning.reasons} />
          </div>
          <PositioningDecisionForm
            range={positioning.recommendedRange}
            defaultAdvisorPrice={
              positioning.defaultAdvisorPrice ?? positioning.recommendedRange.central
            }
            hasSaved
            isOutdated={false}
            initialAdvisorPrice={demoSavedPositioning.advisorPrice}
            initialSellerPrice={demoSavedPositioning.sellerPrice}
            initialJustification={demoSavedPositioning.justification ?? ''}
            saveAction={previewSavePositioning}
            deleteAction={previewDeletePositioning}
          />
          <SavedPositioningCard saved={demoSavedPositioning} freshness="up_to_date" />
        </>
      ) : (
        <p className={alertError}>Fixtures insuffisantes pour le calcul (inattendu).</p>
      )}
    </div>
  );
}

function PresentationScreen() {
  const presentation = buildSellerPresentation({
    project: demoProject,
    property: demoProperty,
    diagnostics: null,
    condominium: null,
    comparables: demoComparables,
    savedPositioning: demoSavedPositioning,
    generatedAt: DEMO_AT,
  });
  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <Header
        back="Retour au positionnement"
        kicker="Dossier · M. et Mme Démo"
        title="Présentation vendeur"
        subtitle={`Aperçu de préparation (version ${presentation.version}) : vérifiez la matière avant le rendez-vous.`}
        action={<span className={btnPrimary}>Lancer le Live →</span>}
      />
      <PresentationReadiness
        status={presentation.status}
        sections={presentation.sections}
        warnings={presentation.warnings}
      />
      <section className="flex flex-col gap-3">
        <h2 className={sectionTitle}>Aperçu des sections</h2>
        <div className="flex flex-col gap-2">
          {presentation.sections.map((section) => (
            <PresentationSectionCard key={section.key} section={section} />
          ))}
        </div>
      </section>
      <PresentationProperty property={presentation.property} />
      <PresentationComparables comparables={presentation.comparables} />
      <PresentationMarketAnalysis analysis={presentation.marketAnalysis} />
      <PresentationPositioning
        current={presentation.currentPositioning}
        saved={presentation.savedPositioning}
        positioningStatus={presentation.positioningStatus}
      />
      <PresentationWarnings warnings={presentation.warnings} />
    </div>
  );
}

function LiveIndexScreen() {
  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <Header
        kicker="Rendez-vous vendeur"
        title="Live"
        subtitle="Choisissez un dossier : la présentation s’ouvre en plein cadre, prête à animer le rendez-vous (bascule Clair/Sombre et plein écran sur place)."
      />
      <ul className="flex flex-col gap-3">
        {demoProjects.map((project) => (
          <li
            key={project.id}
            className={`${card} flex flex-col gap-4 p-4 transition-colors hover:border-brand sm:flex-row sm:items-center sm:justify-between sm:p-5 stage:hover:border-brand`}
          >
            <div className="flex min-w-0 flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-title text-xl font-semibold text-zinc-900 stage:text-white">
                  {project.seller_name}
                </span>
                <span className={badgeNeutral}>{statusLabel(project.status)}</span>
              </div>
              <span className="text-xs text-zinc-400 stage:text-white/40">
                Dossier créé le {new Date(project.created_at).toLocaleDateString('fr-FR')}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className={btnPrimary}>Lancer le Live →</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AdminScreen() {
  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <Header
        kicker="Agence"
        title="Administration"
        subtitle="Gestion de l’agence et des utilisateurs."
      />
      <div className={emptyState}>
        <p className="font-title text-lg font-semibold text-zinc-700 stage:text-white/85">
          Bientôt disponible.
        </p>
        <p>
          La gestion des conseillers et des réglages de l’agence arrivera dans une prochaine
          version.
        </p>
      </div>
    </div>
  );
}

type PreviewSearchParams = { screen?: string; theme?: string };

export default async function AppDesignPreviewPage({
  searchParams,
}: {
  searchParams: Promise<PreviewSearchParams>;
}) {
  if (process.env.NODE_ENV === 'production' && process.env.ACM_DESIGN_PREVIEW !== '1') {
    notFound();
  }

  const { screen, theme } = await searchParams;
  const initialTheme: AppTheme = theme === 'dark' ? 'dark' : 'light';

  const content = (() => {
    switch (screen) {
      case 'hub':
        return <HubScreen />;
      case 'property':
        return <PropertyScreen />;
      case 'comparables':
        return <ComparablesScreen />;
      case 'new':
        return <NewComparableScreen />;
      case 'find':
        return <FindScreen />;
      case 'edit':
        return <EditScreen />;
      case 'analysis':
        return <AnalysisScreen />;
      case 'positioning':
        return <PositioningScreen />;
      case 'presentation':
        return <PresentationScreen />;
      case 'live-index':
        return <LiveIndexScreen />;
      case 'admin':
        return <AdminScreen />;
      default:
        return <DashboardScreen />;
    }
  })();

  return (
    <AppShell
      profileName="Conseiller Démo"
      profileEmail="conseiller@agence-demo.fr"
      agencyName="Agence Démo"
      initialTheme={initialTheme}
      signOutAction={previewVoid}
    >
      {content}
    </AppShell>
  );
}
