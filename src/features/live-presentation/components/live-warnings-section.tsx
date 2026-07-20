import type { SellerPresentationWarning } from '@/features/seller-presentation/types/seller-presentation';

// Read-only. Receives the already Live-filtered warnings.
export function LiveWarningsSection({ warnings }: { warnings: SellerPresentationWarning[] }) {
  if (warnings.length === 0) {
    return <p className="text-lg text-zinc-500">Aucun point de vigilance particulier.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {warnings.map((warning) => (
        <li
          key={warning.code}
          className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-lg text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
        >
          {warning.message}
        </li>
      ))}
    </ul>
  );
}
