import { neutralComparableLabel } from '@/features/live-seller/utils/neutral-comparable-label';
import type { LiveComparableEntry } from '@/features/seller-presentation/types/seller-presentation';

// Read-only identity facts shown under the photos. Never editable.
//
// `hidePrice` : sur les étapes AVANT la révélation du prix, on n'affiche PAS le titre
// du portail (qui contient souvent le prix) — on compose un libellé neutre à partir des
// champs structurés. Sur les étapes d'après la révélation, le titre réel est permis.
export function LiveComparableHeader({
  entry,
  hidePrice = false,
}: {
  entry: LiveComparableEntry;
  hidePrice?: boolean;
}) {
  const heading = hidePrice ? neutralComparableLabel(entry) : (entry.title ?? 'Bien concurrent');
  const location =
    [entry.district, entry.city].filter(Boolean).join(', ') || 'Localisation inconnue';
  return (
    <div className="flex flex-col gap-0.5">
      <h3 className="font-title text-2xl leading-snug font-semibold text-zinc-900 stage:text-white">
        {heading}
      </h3>
      <p className="text-base text-zinc-500 stage:text-white/60">{location}</p>
    </div>
  );
}
