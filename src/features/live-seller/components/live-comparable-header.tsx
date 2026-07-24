import type { LiveComparableEntry } from '@/features/seller-presentation/types/seller-presentation';

// Read-only identity facts shown above the comparison. Never editable.
export function LiveComparableHeader({ entry }: { entry: LiveComparableEntry }) {
  const location =
    [entry.district, entry.city].filter(Boolean).join(', ') || 'Localisation inconnue';
  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-xl font-semibold">{entry.title ?? 'Bien concurrent'}</h3>
      <p className="text-sm text-zinc-500">{location}</p>
    </div>
  );
}
