import type {
  SellerPresentationSection,
  SellerPresentationSectionKey,
  SellerPresentationStatus,
  SellerPresentationWarning,
} from '@/features/seller-presentation/types/seller-presentation';

const buttonClass =
  'rounded border border-zinc-300 px-4 py-2 text-base hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800';

// Overview mode: preparation status, the full section list (available + a way to
// open unavailable ones), the main business alerts, and the start button.
export function LiveOverview({
  status,
  sections,
  warnings,
  hasNavigable,
  onOpenSection,
  onStart,
}: {
  status: SellerPresentationStatus;
  sections: SellerPresentationSection[];
  warnings: SellerPresentationWarning[];
  hasNavigable: boolean;
  onOpenSection: (key: SellerPresentationSectionKey) => void;
  onStart: () => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      {status === 'incomplete' ? (
        <div className="rounded-card border border-amber-300 bg-amber-50 px-4 py-3 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          Préparation incomplète : certaines sections ne sont pas encore disponibles. Le rendez-vous
          reste possible avec les sections prêtes.
        </div>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Sections de la présentation</h2>
        <ul className="flex flex-col gap-2">
          {sections.map((section) => {
            const available = section.status === 'available';
            return (
              <li key={section.key}>
                <button
                  type="button"
                  onClick={() => onOpenSection(section.key)}
                  className="flex w-full items-start justify-between gap-4 rounded-card border border-zinc-200 p-4 text-left hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                >
                  <span>
                    <span className="text-xs text-zinc-500">Section {section.order}</span>
                    <span className="block text-lg font-medium">{section.title}</span>
                    {!available && section.reasonUnavailable ? (
                      <span className="block text-sm text-zinc-500">
                        {section.reasonUnavailable}
                      </span>
                    ) : null}
                  </span>
                  <span
                    className={
                      available
                        ? 'shrink-0 rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                        : 'shrink-0 rounded border border-zinc-300 bg-zinc-50 px-2 py-1 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400'
                    }
                  >
                    {available ? 'Disponible' : 'Indisponible'}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {warnings.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-medium">Points d’attention</h2>
          <ul className="flex flex-col gap-1">
            {warnings.map((warning) => (
              <li
                key={warning.code}
                className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
              >
                {warning.message}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div>
        <button type="button" className={buttonClass} onClick={onStart} disabled={!hasNavigable}>
          Démarrer la présentation
        </button>
        {!hasNavigable ? (
          <p className="mt-2 text-sm text-zinc-500">Aucune section disponible à présenter.</p>
        ) : null}
      </div>
    </div>
  );
}
