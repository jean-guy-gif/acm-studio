import type { SellerPresentationWarning } from '@/features/seller-presentation/types/seller-presentation';

const SEVERITY_CLASS: Record<SellerPresentationWarning['severity'], string> = {
  blocking:
    'border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200',
  warning:
    'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200',
  info: 'border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300',
};

export function PresentationWarnings({ warnings }: { warnings: SellerPresentationWarning[] }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-medium">Points de vigilance</h2>
      {warnings.length === 0 ? (
        <p className="text-zinc-500">Aucun point de vigilance.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {warnings.map((warning) => (
            <li
              key={warning.code}
              className={`rounded border px-3 py-2 text-sm ${SEVERITY_CLASS[warning.severity]}`}
            >
              {warning.message}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
