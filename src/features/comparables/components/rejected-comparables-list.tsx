import { ComparableCard } from '@/features/comparables/components/comparable-card';
import type { Comparable } from '@/features/comparables/types';

type ServerAction = (formData: FormData) => void | Promise<void>;

// Rejected comparables (is_selected = false): kept in the project but excluded
// from the analysis. No reordering — their order carries no meaning.
export function RejectedComparablesList({
  comparables,
  projectId,
  subjectSurfaceArea,
  toggleAction,
  deleteAction,
}: {
  comparables: Comparable[];
  projectId: string;
  subjectSurfaceArea: number | null;
  toggleAction: ServerAction;
  deleteAction: ServerAction;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-medium">Biens écartés ({comparables.length})</h2>
      {comparables.length === 0 ? (
        <p className="text-zinc-500">Aucun bien écarté.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {comparables.map((comparable) => (
            <ComparableCard
              key={comparable.id}
              comparable={comparable}
              editHref={`/builder/${projectId}/comparables/${comparable.id}/edit`}
              subjectSurfaceArea={subjectSurfaceArea}
              toggleAction={toggleAction}
              deleteAction={deleteAction}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
