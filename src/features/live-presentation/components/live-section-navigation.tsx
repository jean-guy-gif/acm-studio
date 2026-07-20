import { LiveSectionProgress } from '@/features/live-presentation/components/live-section-progress';

const buttonClass =
  'rounded border border-zinc-300 px-4 py-2 text-base hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800';

// Presentational navigation bar. All behaviour is driven by the shell via
// callbacks — this component holds no state.
export function LiveSectionNavigation({
  title,
  position,
  total,
  canGoPrevious,
  canGoNext,
  onPrevious,
  onNext,
  onSummary,
  fullscreenButton,
}: {
  title: string;
  position: number | null;
  total: number;
  canGoPrevious: boolean;
  canGoNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSummary: () => void;
  fullscreenButton: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold">{title}</h2>
        <div className="flex items-center gap-2">
          <button type="button" className={buttonClass} onClick={onSummary}>
            Sommaire
          </button>
          {fullscreenButton}
        </div>
      </div>

      <LiveSectionProgress position={position} total={total} />

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className={buttonClass}
          onClick={onPrevious}
          disabled={!canGoPrevious}
        >
          ← Précédent
        </button>
        <button type="button" className={buttonClass} onClick={onNext} disabled={!canGoNext}>
          Suivant →
        </button>
      </div>
    </div>
  );
}
