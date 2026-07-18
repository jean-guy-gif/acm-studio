import type { SellerPresentationSection } from '@/features/seller-presentation/types/seller-presentation';

export function PresentationSectionCard({ section }: { section: SellerPresentationSection }) {
  const available = section.status === 'available';
  return (
    <div className="flex items-start justify-between gap-4 rounded border border-zinc-200 p-3 dark:border-zinc-800">
      <div>
        <span className="text-xs text-zinc-500">Section {section.order}</span>
        <p className="font-medium">{section.title}</p>
        {!available && section.reasonUnavailable ? (
          <p className="text-sm text-zinc-500">{section.reasonUnavailable}</p>
        ) : null}
      </div>
      <span
        className={
          available
            ? 'shrink-0 rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
            : 'shrink-0 rounded border border-zinc-300 bg-zinc-50 px-2 py-1 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400'
        }
      >
        {available ? 'Disponible' : 'Indisponible'}
      </span>
    </div>
  );
}
