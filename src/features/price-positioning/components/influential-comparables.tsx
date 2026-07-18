export type InfluentialComparableDisplay = {
  comparableId: string;
  title: string | null;
  city: string | null;
  district: string | null;
  price: number;
  surfaceArea: number;
  pricePerSquareMeter: number | null;
  photoUrl: string | null;
  surfaceDeviationPercentage: number;
  proximityScore: number;
};

function euro(value: number | null): string {
  return value != null ? `${value.toLocaleString('fr-FR')} €` : '—';
}

export function InfluentialComparablesView({
  comparables,
}: {
  comparables: InfluentialComparableDisplay[];
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-medium">Comparables influents</h2>
      {comparables.length === 0 ? (
        <p className="text-zinc-500">Aucun comparable influent disponible.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {comparables.map((comparable) => (
            <li
              key={comparable.comparableId}
              className="flex flex-col gap-3 rounded border border-zinc-200 p-3 sm:flex-row dark:border-zinc-800"
            >
              <div className="h-24 w-full shrink-0 overflow-hidden rounded bg-zinc-100 sm:w-32 dark:bg-zinc-800">
                {comparable.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={comparable.photoUrl}
                    alt={comparable.title ?? 'Bien concurrent'}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">
                    Pas de photo
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {comparable.title?.trim() || 'Bien concurrent'}
                </span>
                <span>
                  {comparable.city?.trim() || 'Ville inconnue'}
                  {comparable.district?.trim() ? ` · ${comparable.district.trim()}` : ''}
                </span>
                <span>
                  {euro(comparable.price)} · {comparable.surfaceArea} m² ·{' '}
                  {euro(comparable.pricePerSquareMeter)}/m²
                </span>
                <span>
                  Écart de surface : {comparable.surfaceDeviationPercentage} % · Score de proximité
                  : {comparable.proximityScore}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
