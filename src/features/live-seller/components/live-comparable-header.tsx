import type { LiveComparableEntry } from '@/features/seller-presentation/types/seller-presentation';

// Read-only identity facts shown under the photos. Never editable.
export function LiveComparableHeader({ entry }: { entry: LiveComparableEntry }) {
  const location =
    [entry.district, entry.city].filter(Boolean).join(', ') || 'Localisation inconnue';
  return (
    <div className="flex flex-col gap-0.5">
      <h3 className="font-title text-2xl leading-snug font-semibold text-zinc-900 stage:text-white">
        {entry.title ?? 'Bien concurrent'}
      </h3>
      <p className="text-base text-zinc-500 stage:text-white/60">{location}</p>
    </div>
  );
}
