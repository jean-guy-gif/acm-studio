import { badgeBrand, badgeNeutral, card } from '@/components/ui/styles';
import { PropertySheetButton } from '@/features/property-sheet/components/property-sheet-button';
import { buyerDateLabel } from '@/features/buyers/services/buyer-criteria';
import { seenOnLabel } from '@/features/ideal-properties/services/ideal-selection';
import {
  SELECTION_CATEGORY_LABELS,
  SELECTION_SOURCE_LABELS,
  type IdealSelection,
} from '@/features/ideal-properties/types';
import { formatEuro } from '@/lib/format';
import { displayPhotoUrl } from '@/lib/photo-url';

// Mission 118 — la sélection retenue pour l'acquéreur : jusqu'à trois biens, dans l'ordre, avec leur
// source, leur catégorie, leurs écarts nommés et le prix « affiché le » (jamais « disponible »).
// Réservé au conseiller : le dossier remis à l'acquéreur est la M119.
export function IdealSelectionList({ selection }: { selection: IdealSelection }) {
  return (
    <section className={`${card} flex flex-col gap-3 p-5`} data-testid="ideal-selection">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-title text-lg font-semibold text-brand-deep stage:text-white">
          Sélection retenue
        </h2>
        <span className="text-xs text-zinc-500 stage:text-white/60">
          le {buyerDateLabel(selection.createdAt)} · {selection.items.length} bien
          {selection.items.length > 1 ? 's' : ''}
        </span>
      </div>
      <ol className="flex flex-col gap-2">
        {selection.items.map((item) => {
          const seen = seenOnLabel(item.priceSeenOn);
          return (
            <li
              key={item.id}
              data-testid="ideal-selection-item"
              className="flex flex-wrap items-start gap-3 rounded-xl border border-zinc-200 px-4 py-3 stage:border-white/10"
            >
              {item.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={displayPhotoUrl(item.photoUrl)}
                  alt=""
                  className="h-16 w-24 shrink-0 rounded-lg bg-zinc-100 object-cover"
                />
              ) : null}
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <PropertySheetButton
                    target={{ kind: 'selection-item', id: item.id }}
                    backLabel="Sa sélection"
                    className="text-left font-title text-base font-bold text-zinc-900 underline-offset-2 hover:text-brand-deep hover:underline stage:text-white"
                  >
                    {item.position}. {item.label}
                  </PropertySheetButton>
                  {item.category ? (
                    <span className={badgeBrand}>{SELECTION_CATEGORY_LABELS[item.category]}</span>
                  ) : null}
                  <span className={badgeNeutral}>{SELECTION_SOURCE_LABELS[item.source]}</span>
                </div>
                <p className="text-sm text-zinc-600 stage:text-white/70">
                  {[
                    item.listedPrice != null ? formatEuro(item.listedPrice) : null,
                    seen,
                    item.source === 'listing'
                      ? item.imported
                        ? 'Annonce importée'
                        : 'Données de la recherche'
                      : null,
                  ]
                    .filter((part): part is string => part != null)
                    .join(' · ')}
                </p>
                {item.gaps.length > 0 ? (
                  <p className="text-xs text-amber-800 stage:text-amber-200">
                    {item.gaps.join(' · ')}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
