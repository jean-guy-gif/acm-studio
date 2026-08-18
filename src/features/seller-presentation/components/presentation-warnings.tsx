import { card, hintText, sectionTitle } from '@/components/ui/styles';
import type { SellerPresentationWarning } from '@/features/seller-presentation/types/seller-presentation';

const SEVERITY_CLASS: Record<SellerPresentationWarning['severity'], string> = {
  blocking:
    'border-red-200 bg-red-50 text-red-700 stage:border-red-400/30 stage:bg-red-500/10 stage:text-red-300',
  warning:
    'border-amber-200 bg-amber-50 text-amber-800 stage:border-amber-400/30 stage:bg-amber-500/10 stage:text-amber-300',
  info: 'border-zinc-200 bg-zinc-50 text-zinc-700 stage:border-white/15 stage:bg-white/5 stage:text-white/70',
};

export function PresentationWarnings({ warnings }: { warnings: SellerPresentationWarning[] }) {
  return (
    <section className={`${card} flex flex-col gap-3 p-5 sm:p-6`}>
      <h2 className={sectionTitle}>Points de vigilance</h2>
      {warnings.length === 0 ? (
        <p className={hintText}>Aucun point de vigilance.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {warnings.map((warning) => (
            <li
              key={warning.code}
              className={`rounded-xl border px-3.5 py-2.5 text-sm font-medium ${SEVERITY_CLASS[warning.severity]}`}
            >
              {warning.message}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
