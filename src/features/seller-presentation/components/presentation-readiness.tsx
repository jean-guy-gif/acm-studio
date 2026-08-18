import { card, sectionTitle } from '@/components/ui/styles';
import type {
  SellerPresentationSection,
  SellerPresentationStatus,
  SellerPresentationWarning,
} from '@/features/seller-presentation/types/seller-presentation';

const STATUS_LABEL: Record<SellerPresentationStatus, string> = {
  ready: 'Prête',
  incomplete: 'Incomplète',
};

export function PresentationReadiness({
  status,
  sections,
  warnings,
}: {
  status: SellerPresentationStatus;
  sections: SellerPresentationSection[];
  warnings: SellerPresentationWarning[];
}) {
  const availableCount = sections.filter((section) => section.status === 'available').length;
  const blocking = warnings.filter((warning) => warning.severity === 'blocking');
  const vigilance = warnings.filter((warning) => warning.severity === 'warning');

  return (
    <section className={`${card} flex flex-col gap-3 p-5 sm:p-6`}>
      <h2 className={sectionTitle}>État de préparation</h2>
      <p className="text-sm text-zinc-600 stage:text-white/65">
        Statut : <span className="font-medium">{STATUS_LABEL[status]}</span> · Sections disponibles
        : {availableCount} / {sections.length}
      </p>

      {blocking.length > 0 ? (
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold text-zinc-700 stage:text-white/80">
            Alertes bloquantes
          </h3>
          <ul className="flex flex-col gap-1.5">
            {blocking.map((warning) => (
              <li
                key={warning.code}
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700 stage:border-red-400/30 stage:bg-red-500/10 stage:text-red-300"
              >
                {warning.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {vigilance.length > 0 ? (
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold text-zinc-700 stage:text-white/80">
            Points de vigilance
          </h3>
          <ul className="flex flex-col gap-1.5">
            {vigilance.map((warning) => (
              <li
                key={warning.code}
                className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm font-medium text-amber-800 stage:border-amber-400/30 stage:bg-amber-500/10 stage:text-amber-300"
              >
                {warning.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
