import { RemoteImage } from '@/components/ui/remote-image';
import { card, hintText, sectionTitle, softPanel } from '@/components/ui/styles';
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
    <section className={`${card} flex flex-col gap-3 p-5 sm:p-6`}>
      <h2 className={sectionTitle}>Comparables retenus ({comparables.length})</h2>
      {comparables.length === 0 ? (
        <p className={hintText}>Aucun comparable retenu.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {comparables.map((comparable) => (
            <li key={comparable.id} className={`${softPanel} flex flex-col gap-3 p-3 sm:flex-row`}>
              <div className="h-20 w-full shrink-0 overflow-hidden rounded-lg bg-zinc-100 sm:w-28 stage:bg-white/10">
                {comparable.photoUrl ? (
                  <RemoteImage
                    src={comparable.photoUrl}
                    alt={comparable.title ?? 'Comparable'}
                    className="h-full w-full object-cover"
                    fallbackClassName="h-full w-full"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400 stage:text-white/40">
                    Pas de photo
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-1 text-sm text-zinc-600 stage:text-white/65">
                <span className="font-title text-base font-semibold text-zinc-900 stage:text-white">
                  {comparable.position}. {comparable.title?.trim() || 'Bien concurrent'}
                  {comparable.isOutlier ? (
                    <span className="ml-2 rounded-full border border-amber-300 px-1.5 text-xs font-medium text-amber-700 stage:border-amber-400/40 stage:text-amber-300">
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
