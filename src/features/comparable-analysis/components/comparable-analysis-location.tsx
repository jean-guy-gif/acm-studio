import { card, hintText, sectionTitle } from '@/components/ui/styles';
import type { LocationAnalysis } from '@/features/comparable-analysis/types/comparable-analysis';

export function ComparableAnalysisLocation({
  locationAnalysis,
}: {
  locationAnalysis: LocationAnalysis;
}) {
  return (
    <section className={`${card} flex flex-col gap-3 p-5 sm:p-6`}>
      <h2 className={sectionTitle}>Répartition géographique</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold text-zinc-700 stage:text-white/80">Par ville</h3>
          {locationAnalysis.byCity.length === 0 ? (
            <p className={hintText}>Aucune ville renseignée.</p>
          ) : (
            <ul className="text-sm text-zinc-600 stage:text-white/65">
              {locationAnalysis.byCity.map((entry) => (
                <li key={entry.label}>
                  {entry.label} : {entry.count}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-zinc-700 stage:text-white/80">Par quartier</h3>
          {locationAnalysis.byDistrict.length === 0 ? (
            <p className={hintText}>Aucun quartier renseigné.</p>
          ) : (
            <ul className="text-sm text-zinc-600 stage:text-white/65">
              {locationAnalysis.byDistrict.map((entry) => (
                <li key={entry.label}>
                  {entry.label} : {entry.count}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <p className="text-sm text-zinc-600 stage:text-white/65">
        Origine — Manuel : {locationAnalysis.sources.manual} · Import URL:{' '}
        {locationAnalysis.sources.url}
      </p>
    </section>
  );
}
