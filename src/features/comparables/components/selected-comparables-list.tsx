import { ComparableCard } from '@/features/comparables/components/comparable-card';
import type { Comparable } from '@/features/comparables/types';

type ServerAction = (formData: FormData) => void | Promise<void>;

// Retained comparables (is_selected = true), kept in display_order. Reordering is
// enabled here only, reusing the Mission 13 move mechanism.
export function SelectedComparablesList({
  comparables,
  projectId,
  subjectSurfaceArea,
  toggleAction,
  moveAction,
  deleteAction,
}: {
  comparables: Comparable[];
  projectId: string;
  subjectSurfaceArea: number | null;
  toggleAction: ServerAction;
  moveAction: ServerAction;
  deleteAction: ServerAction;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-medium">Biens retenus ({comparables.length})</h2>
      {comparables.length === 0 ? (
        <p className="text-zinc-500">Aucun bien retenu. Retenez les biens pertinents ci-dessous.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {comparables.map((comparable, index) => (
            <ComparableCard
              key={comparable.id}
              comparable={comparable}
              editHref={`/builder/${projectId}/comparables/${comparable.id}/edit`}
              subjectSurfaceArea={subjectSurfaceArea}
              toggleAction={toggleAction}
              moveAction={moveAction}
              deleteAction={deleteAction}
              isFirst={index === 0}
              isLast={index === comparables.length - 1}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
