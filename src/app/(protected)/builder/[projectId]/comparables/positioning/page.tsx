import Link from 'next/link';
import { notFound } from 'next/navigation';

import { pricePerSquareMeter } from '@/features/comparables/services/calculate-comparable-summary';
import { getComparables } from '@/features/comparables/queries/get-comparables';
import { getMainPhotoUrl } from '@/features/comparables/utils/comparable-photos';
import type { InfluentialComparableDisplay } from '@/features/price-positioning/components/influential-comparables';
import { PositioningReasons } from '@/features/price-positioning/components/positioning-reasons';
import { PricePositioningView } from '@/features/price-positioning/components/price-positioning-view';
import { calculatePricePositioning } from '@/features/price-positioning/services/calculate-price-positioning';
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

  const [comparables, subjectProperty] = await Promise.all([
    getComparables(projectId),
    getSubjectProperty(projectId),
  ]);

  // Single business entry point — computed on the fly, nothing persisted.
  const positioning = calculatePricePositioning({
    comparables,
    sellerProperty: { surfaceArea: subjectProperty?.surface_area ?? null },
  });

  // Enrich the influential comparables (official set) for display only.
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={`/builder/${projectId}/comparables/analysis`} className="underline">
          Retour à l’analyse
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Positionnement du prix</h1>
      </div>

      {positioning.status === 'ready' && positioning.recommendedRange ? (
        <PricePositioningView
          positioning={positioning}
          range={positioning.recommendedRange}
          influential={influential}
        />
      ) : (
        <section className="flex flex-col gap-2">
          <p className="text-zinc-500">
            Données insuffisantes pour calculer un positionnement fiable.
          </p>
          <PositioningReasons reasons={positioning.reasons} />
        </section>
      )}
    </div>
  );
}
