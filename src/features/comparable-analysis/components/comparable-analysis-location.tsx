import type { LocationAnalysis } from '@/features/comparable-analysis/types/comparable-analysis';

export function ComparableAnalysisLocation({
  locationAnalysis,
}: {
  locationAnalysis: LocationAnalysis;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-medium">Répartition géographique</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <h3 className="text-sm font-medium">Par ville</h3>
          {locationAnalysis.byCity.length === 0 ? (
            <p className="text-sm text-zinc-500">Aucune ville renseignée.</p>
          ) : (
            <ul className="text-sm text-zinc-600 dark:text-zinc-400">
              {locationAnalysis.byCity.map((entry) => (
                <li key={entry.label}>
                  {entry.label} : {entry.count}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h3 className="text-sm font-medium">Par quartier</h3>
          {locationAnalysis.byDistrict.length === 0 ? (
            <p className="text-sm text-zinc-500">Aucun quartier renseigné.</p>
          ) : (
            <ul className="text-sm text-zinc-600 dark:text-zinc-400">
              {locationAnalysis.byDistrict.map((entry) => (
                <li key={entry.label}>
                  {entry.label} : {entry.count}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Origine — Manuel : {locationAnalysis.sources.manual} · Import URL:{' '}
        {locationAnalysis.sources.url}
      </p>
    </section>
  );
}
