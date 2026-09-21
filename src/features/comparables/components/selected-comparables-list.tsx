'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import {
  alertError,
  btnDangerGhost,
  btnPrimary,
  btnSecondary,
  card,
  hintText,
  sectionTitle,
} from '@/components/ui/styles';
import type { BulkComparableResult } from '@/features/comparables/actions/bulk-comparable-actions';
import { ComparableCard } from '@/features/comparables/components/comparable-card';
import type { Comparable } from '@/features/comparables/types';

type ServerAction = (formData: FormData) => void | Promise<void>;
type BulkAction = (ids: string[]) => Promise<BulkComparableResult>;

// Biens retenus (is_selected = true), en display_order. Le réordonnancement reste ici.
//
// Sélection de LOT (même modèle que la recherche §8) : une case à cocher par bien, une
// barre d'action qui apparaît dès qu'un bien est coché, des boutons qui DISENT le compte.
// Deux actions. La mécanique de sélection est générique — `runBulk(action)` accepte
// n'importe quelle action de lot (ids → résultat) — de sorte qu'une troisième s'ajoute
// par un simple bouton de plus, sans toucher la sélection :
//   · Écarter — geste COURANT, en premier et en évidence ; le bien passe dans « Biens
//     écartés », la trace reste ;
//   · Supprimer — geste RARE et IRRÉVERSIBLE, discret et en retrait ; confirmation qui
//     NOMME le compte avant d'exécuter, pas un « Êtes-vous sûr ? » générique.
// Le motif d'écartement reste facultatif, jamais réclamé pour chacun des N (comme §8).
export function SelectedComparablesList({
  comparables,
  projectId,
  subjectSurfaceArea,
  toggleAction,
  moveAction,
  deleteAction,
  rejectSelectedAction,
  deleteSelectedAction,
}: {
  comparables: Comparable[];
  projectId: string;
  subjectSurfaceArea: number | null;
  toggleAction: ServerAction;
  moveAction: ServerAction;
  deleteAction: ServerAction;
  rejectSelectedAction: BulkAction;
  deleteSelectedAction: BulkAction;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Une sélection ne survit pas à une liste qui change : on ne garde que les ids
  // encore présents (un bien écarté/supprimé ne doit pas rester « coché » fantôme).
  const present = new Set(comparables.map((comparable) => comparable.id));
  const selectedIds = [...selected].filter((id) => present.has(id));
  const count = selectedIds.length;

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

  const runBulk = (action: BulkAction) => {
    if (count === 0) {
      return;
    }
    setError(null);
    const ids = selectedIds;
    startTransition(async () => {
      const result = await action(ids);
      if (result.ok) {
        setSelected(new Set());
        setConfirmingDelete(false);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  const noun = (n: number) => `${n} bien${n > 1 ? 's' : ''} sélectionné${n > 1 ? 's' : ''}`;

  return (
    <section className="flex flex-col gap-3">
      <h2 className={sectionTitle}>Biens retenus ({comparables.length})</h2>

      {count > 0 ? (
        // La barre d'action : n'apparaît qu'avec une sélection. Écarter d'abord (courant),
        // Supprimer en retrait (rare, irréversible).
        <div className={`${card} flex flex-col gap-2 p-3`}>
          {error ? (
            <p role="alert" className={alertError}>
              {error}
            </p>
          ) : null}
          {confirmingDelete ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-zinc-800 stage:text-white">
                Supprimer définitivement {noun(count)} ? Cette action est irréversible.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => runBulk(deleteSelectedAction)}
                  className={`${btnDangerGhost} px-3 py-1.5 text-sm`}
                >
                  Supprimer {noun(count)}
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setConfirmingDelete(false)}
                  className={`${btnSecondary} px-3 py-1.5 text-sm`}
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className={hintText}>{noun(count)}</span>
              <div className="flex-1" />
              <button
                type="button"
                disabled={pending}
                onClick={() => runBulk(rejectSelectedAction)}
                className={`${btnPrimary} px-3 py-1.5 text-sm`}
              >
                Écarter les {noun(count)}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => setConfirmingDelete(true)}
                className="px-2 py-1.5 text-xs text-zinc-500 underline underline-offset-2 hover:text-red-700 stage:text-white/50 stage:hover:text-red-300"
              >
                Supprimer les {noun(count)}
              </button>
            </div>
          )}
        </div>
      ) : null}

      {comparables.length === 0 ? (
        <p className={hintText}>Aucun bien retenu. Retenez les biens pertinents ci-dessous.</p>
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
              selection={{
                checked: selected.has(comparable.id),
                onToggle: () => toggle(comparable.id),
                disabled: pending,
              }}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
