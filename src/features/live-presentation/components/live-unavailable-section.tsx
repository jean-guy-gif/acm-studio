import type { SellerPresentationSection } from '@/features/seller-presentation/types/seller-presentation';

// Shown when an unavailable section is opened directly from the summary.
export function LiveUnavailableSection({ section }: { section: SellerPresentationSection }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <span className="rounded border border-zinc-300 bg-zinc-50 px-3 py-1 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
        Section indisponible
      </span>
      <p className="max-w-xl text-lg text-zinc-500">
        {section.reasonUnavailable ?? 'Cette section n’est pas disponible.'}
      </p>
    </div>
  );
}
