import type {
  EnergyClass,
  EnergyDistribution,
} from '@/features/comparable-analysis/types/comparable-analysis';

const ENERGY_CLASSES: EnergyClass[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

function Distribution({ title, data }: { title: string; data: EnergyDistribution }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-medium">{title}</h2>
      <div className="flex flex-wrap gap-2 text-sm">
        {ENERGY_CLASSES.map((rating) => (
          <span
            key={rating}
            className="rounded border border-zinc-200 px-2 py-1 dark:border-zinc-800"
          >
            {rating} : {data.distribution[rating]}
          </span>
        ))}
        <span className="rounded border border-zinc-200 px-2 py-1 text-zinc-500 dark:border-zinc-800">
          Non renseigné : {data.unknown}
        </span>
      </div>
    </section>
  );
}

export function ComparableAnalysisEnergy({
  dpeAnalysis,
  gesAnalysis,
}: {
  dpeAnalysis: EnergyDistribution;
  gesAnalysis: EnergyDistribution;
}) {
  return (
    <>
      <Distribution title="Répartition DPE" data={dpeAnalysis} />
      <Distribution title="Répartition GES" data={gesAnalysis} />
    </>
  );
}
