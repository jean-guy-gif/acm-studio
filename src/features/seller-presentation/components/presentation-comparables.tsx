import type { SellerPresentationComparable } from '@/features/seller-presentation/types/seller-presentation';

function euro(value: number | null): string {
  return value != null ? `${value.toLocaleString('fr-FR')} €` : '—';
}

export function PresentationComparables({
  comparables,
}: {
  comparables: SellerPresentationComparable[];
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-medium">Comparables retenus ({comparables.length})</h2>
      {comparables.length === 0 ? (
        <p className="text-zinc-500">Aucun comparable retenu.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {comparables.map((comparable) => (
            <li
              key={comparable.id}
              className="flex flex-col gap-2 rounded border border-zinc-200 p-3 sm:flex-row dark:border-zinc-800"
            >
              <div className="h-20 w-full shrink-0 overflow-hidden rounded bg-zinc-100 sm:w-28 dark:bg-zinc-800">
                {comparable.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={comparable.photoUrl}
                    alt={comparable.title ?? 'Comparable'}
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
                  {comparable.position}. {comparable.title?.trim() || 'Bien concurrent'}
                  {comparable.isOutlier ? (
                    <span className="ml-2 rounded border border-amber-300 px-1 text-xs text-amber-700 dark:border-amber-800 dark:text-amber-300">
                      ATYPIQUE
                    </span>
                  ) : null}
                </span>
                <span>
                  {comparable.city?.trim() || 'Ville inconnue'}
                  {comparable.district?.trim() ? ` · ${comparable.district.trim()}` : ''} ·{' '}
                  {comparable.source === 'url' ? 'Import URL' : 'Manuel'}
                </span>
                <span>
                  {euro(comparable.price)} ·{' '}
                  {comparable.surfaceArea != null ? `${comparable.surfaceArea} m²` : '—'} ·{' '}
                  {euro(comparable.pricePerSquareMeter)}/m² · {comparable.roomsCount ?? '—'} pièces
                  · DPE {comparable.energyRating ?? '—'} · GES {comparable.gesRating ?? '—'}
                </span>
                {comparable.influenceScore != null ? (
                  <span>Score de proximité : {comparable.influenceScore}</span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
