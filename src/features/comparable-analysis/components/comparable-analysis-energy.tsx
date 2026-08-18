import { card, sectionTitle } from '@/components/ui/styles';
import type {
  EnergyClass,
  EnergyDistribution,
} from '@/features/comparable-analysis/types/comparable-analysis';

const ENERGY_CLASSES: EnergyClass[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

function Distribution({ title, data }: { title: string; data: EnergyDistribution }) {
  return (
    <section className={`${card} flex flex-col gap-3 p-5 sm:p-6`}>
      <h2 className={sectionTitle}>{title}</h2>
      <div className="flex flex-wrap gap-2 text-sm">
        {ENERGY_CLASSES.map((rating) => (
          <span
            key={rating}
            className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-zinc-700 stage:border-white/15 stage:bg-white/5 stage:text-white/80"
          >
            {rating} : {data.distribution[rating]}
          </span>
        ))}
        <span className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-zinc-400 stage:border-white/15 stage:bg-white/5 stage:text-white/45">
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
