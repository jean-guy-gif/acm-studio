import type { SellerPresentationComparable } from '@/features/seller-presentation/types/seller-presentation';

function euro(value: number | null): string {
  return value != null ? `${value.toLocaleString('fr-FR')} €` : '—';
}

// Read-only comparables grid, in the order provided by the contract (display_order).
export function LiveComparablesSection({
  comparables,
}: {
  comparables: SellerPresentationComparable[];
}) {
  if (comparables.length === 0) {
    return <p className="text-lg text-zinc-500">Aucun comparable retenu.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {comparables.map((comparable) => (
        <article
          key={comparable.id}
          className="flex flex-col gap-2 rounded-card border border-zinc-200 p-4 dark:border-zinc-800"
        >
          <div className="h-40 w-full overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800">
            {comparable.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={comparable.photoUrl}
                alt={comparable.title ?? 'Comparable'}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-zinc-400">
                Pas de photo
              </div>
            )}
          </div>

          <div className="flex items-start justify-between gap-2">
            <h3 className="text-lg font-medium">
              {comparable.position}. {comparable.title?.trim() || 'Bien concurrent'}
            </h3>
            {comparable.isOutlier ? (
              <span className="shrink-0 rounded border border-amber-300 px-2 py-0.5 text-xs text-amber-700 dark:border-amber-800 dark:text-amber-300">
                Atypique
              </span>
            ) : null}
          </div>

          <p className="text-zinc-600 dark:text-zinc-400">
            {comparable.city?.trim() || 'Ville inconnue'}
            {comparable.district?.trim() ? ` · ${comparable.district.trim()}` : ''}
          </p>

          <p className="text-lg font-medium">
            {euro(comparable.price)}
            {comparable.surfaceArea != null ? ` · ${comparable.surfaceArea} m²` : ''} ·{' '}
            {euro(comparable.pricePerSquareMeter)}/m²
          </p>

          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {comparable.roomsCount ?? '—'} pièces · {comparable.bedroomsCount ?? '—'} chambres · DPE{' '}
            {comparable.energyRating ?? '—'} · GES {comparable.gesRating ?? '—'}
          </p>

          <p className="text-xs text-zinc-500">
            {comparable.source === 'url' ? 'Import URL' : 'Saisie manuelle'}
            {comparable.influenceScore != null ? ` · Proximité ${comparable.influenceScore}` : ''}
          </p>
        </article>
      ))}
    </div>
  );
}
