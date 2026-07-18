import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getComparables } from '@/features/comparables/queries/get-comparables';
import { deletePricePositioning } from '@/features/price-positioning/actions/delete-price-positioning';
import { savePricePositioning } from '@/features/price-positioning/actions/save-price-positioning';
import { ConfidenceCard } from '@/features/price-positioning/components/confidence-card';
import { InfluentialComparablesView } from '@/features/price-positioning/components/influential-comparables';
import type { InfluentialComparableDisplay } from '@/features/price-positioning/components/influential-comparables';
import { PositioningDecisionForm } from '@/features/price-positioning/components/positioning-decision-form';
import { PositioningReasons } from '@/features/price-positioning/components/positioning-reasons';
import { RecommendedRangeView } from '@/features/price-positioning/components/recommended-range';
import { SavedPositioningCard } from '@/features/price-positioning/components/saved-positioning-card';
import { calculatePricePositioning } from '@/features/price-positioning/services/calculate-price-positioning';
import {
  comparePositioningFreshness,
  currentComparisonKey,
  savedComparisonKey,
} from '@/features/price-positioning/services/compare-positioning-snapshots';
import { getSavedPricePositioning } from '@/features/price-positioning/services/get-saved-price-positioning';
import { pricePerSquareMeter } from '@/features/comparables/services/calculate-comparable-summary';
import { getMainPhotoUrl } from '@/features/comparables/utils/comparable-photos';
import type { PositioningFreshness } from '@/features/price-positioning/types/saved-price-positioning';
import { getProject } from '@/features/projects/queries/get-project';
import { getSubjectProperty } from '@/features/subject-property/queries/get-subject-property';

type PositioningPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function PricePositioningPage({ params }: PositioningPageProps) {
  const { projectId } = await params;

  const project = await getProject(projectId);
  if (!project) {
    notFound();
  }

  const [comparables, subjectProperty, saved] = await Promise.all([
    getComparables(projectId),
    getSubjectProperty(projectId),
    getSavedPricePositioning(projectId),
  ]);

  // Current calculation — always recomputed on the fly, never persisted here.
  const positioning = calculatePricePositioning({
    comparables,
    sellerProperty: { surfaceArea: subjectProperty?.surface_area ?? null },
  });

  const byId = new Map(comparables.map((comparable) => [comparable.id, comparable]));
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

  // Freshness: compare the current calculation to the saved decision (never the
  // reason texts). Defaults to up_to_date when either side is unavailable.
  let freshness: PositioningFreshness = 'up_to_date';
  const currentKey = currentComparisonKey(positioning);
  if (saved && currentKey) {
    freshness = comparePositioningFreshness(currentKey, savedComparisonKey(saved));
  }

  const saveAction = savePricePositioning.bind(null, projectId);
  const deleteAction = deletePricePositioning.bind(null, projectId);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href={`/builder/${projectId}/comparables/analysis`} className="underline">
          Retour à l’analyse
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Positionnement du prix</h1>
        <Link
          href={`/builder/${projectId}/presentation`}
          className="mt-2 inline-block rounded border border-zinc-300 px-3 py-1.5 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Préparer la présentation vendeur
        </Link>
      </div>

      {positioning.status === 'ready' && positioning.recommendedRange ? (
        <>
          {/* 1. Current calculation */}
          <div className="flex flex-col gap-6">
            <h2 className="text-xl font-semibold">Calcul courant</h2>
            <RecommendedRangeView
              range={positioning.recommendedRange}
              usedCount={positioning.dataset.usedCount}
            />
            <ConfidenceCard confidence={positioning.confidence} />
            <InfluentialComparablesView comparables={influential} />
            <PositioningReasons reasons={positioning.reasons} />
          </div>

          {/* 2 + 3. Decision + actions */}
          <PositioningDecisionForm
            range={positioning.recommendedRange}
            defaultAdvisorPrice={
              positioning.defaultAdvisorPrice ?? positioning.recommendedRange.central
            }
            hasSaved={saved != null}
            isOutdated={freshness === 'outdated'}
            initialAdvisorPrice={saved?.advisorPrice ?? positioning.recommendedRange.central}
            initialSellerPrice={saved?.sellerPrice ?? null}
            initialJustification={saved?.justification ?? ''}
            saveAction={saveAction}
            deleteAction={deleteAction}
          />

          {/* 4. Saved decision */}
          {saved ? <SavedPositioningCard saved={saved} freshness={freshness} /> : null}
        </>
      ) : (
        <section className="flex flex-col gap-2">
          <p className="text-zinc-500">
            Données insuffisantes pour calculer un positionnement fiable.
          </p>
          <PositioningReasons reasons={positioning.reasons} />
          {saved ? <SavedPositioningCard saved={saved} freshness="up_to_date" /> : null}
        </section>
      )}
    </div>
  );
}
