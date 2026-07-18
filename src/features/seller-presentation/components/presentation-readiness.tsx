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
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold">État de préparation</h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Statut : <span className="font-medium">{STATUS_LABEL[status]}</span> · Sections disponibles
        : {availableCount} / {sections.length}
      </p>

      {blocking.length > 0 ? (
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-medium">Alertes bloquantes</h3>
          <ul className="flex flex-col gap-1">
            {blocking.map((warning) => (
              <li
                key={warning.code}
                role="alert"
                className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
              >
                {warning.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {vigilance.length > 0 ? (
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-medium">Points de vigilance</h3>
          <ul className="flex flex-col gap-1">
            {vigilance.map((warning) => (
              <li
                key={warning.code}
                className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
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
