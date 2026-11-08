'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import {
  alertError,
  btnDangerGhost,
  btnSecondary,
  card,
  hintText,
  sectionTitle,
} from '@/components/ui/styles';
import type { BulkComparableResult } from '@/features/comparables/actions/bulk-comparable-actions';
import { ComparableCard } from '@/features/comparables/components/comparable-card';
import type { Comparable } from '@/features/comparables/types';
import { reorderLiveCompetitors } from '@/features/live-seller/actions/reorder-live-competitors';
import { LIVE_ORDER_FROZEN } from '@/features/live-seller/services/live-timing';
import { LocatorNotice } from '@/features/competitor-locator/components/locator-notice';
import { useCompetitorLocator } from '@/features/competitor-locator/use-competitor-locator';

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
  oppositionNotes = {},
  toggleAction,
  moveAction,
  deleteAction,
  rejectSelectedAction,
  deleteSelectedAction,
  orderFrozen = false,
}: {
  comparables: Comparable[];
  projectId: string;
  subjectSurfaceArea: number | null;
  // Mission 98 — « Ne plus solliciter (demandé le JJ/MM) », par concurrent dont l'adresse est
  // sur la liste d'opposition de l'agence.
  oppositionNotes?: Record<string, string>;
  toggleAction: ServerAction;
  moveAction: ServerAction;
  deleteAction: ServerAction;
  rejectSelectedAction: BulkAction;
  deleteSelectedAction: BulkAction;
  // Mission 110 — le Live a commencé : l'ordre des concurrents ne bouge plus.
  orderFrozen?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Mission 146 (I5) — l'ordre du Live en glissant la poignée ⋮⋮ des cartes : le glisser-déposer du
  // mode expert (M110, `reorder_retained_comparables`), pour tous. L'ordre affiché suit le dépôt
  // tout de suite, et revient en arrière si l'enregistrement est refusé.
  const [order, setOrder] = useState(comparables);
  const [source, setSource] = useState(comparables);
  if (source !== comparables) {
    setSource(comparables);
    setOrder(comparables);
  }
  const [dragged, setDragged] = useState<number | null>(null);
  const [orderSaved, setOrderSaved] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [reordering, startReorder] = useTransition();
  const canDrag = !orderFrozen && order.length > 1;
  const drop = (target: number) => {
    if (dragged == null || dragged === target) return;
    const previous = order;
    const next = [...order];
    const [item] = next.splice(dragged, 1);
    next.splice(target, 0, item);
    setOrder(next);
    setOrderSaved(false);
    setOrderError(null);
    startReorder(async () => {
      const result = await reorderLiveCompetitors(
        projectId,
        next.map((comparable) => comparable.id),
      );
      if (result.ok) {
        setOrderSaved(true);
        router.refresh();
      } else {
        setOrder(previous);
        setOrderError(result.error);
      }
    });
  };
  // Mission 75 — à l'ouverture, ACM demande au Localisateur les adresses qui manquent.
  const { availability: locatorAvailability } = useCompetitorLocator(projectId);

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
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className={sectionTitle}>Concurrents retenus ({comparables.length})</h2>
        {canDrag ? (
          <p className={`${hintText} hidden sm:block`}>Glissez ⋮⋮ pour changer l’ordre du Live</p>
        ) : null}
      </div>
      {orderFrozen && comparables.length > 1 ? (
        <p className={hintText} data-testid="order-frozen">
          {LIVE_ORDER_FROZEN}
        </p>
      ) : null}
      {reordering ? <p className={hintText}>Enregistrement de l’ordre…</p> : null}
      {orderSaved && !reordering ? (
        <p role="status" className={hintText} data-testid="order-saved">
          Ordre enregistré.
        </p>
      ) : null}
      {orderError ? (
        <p role="alert" className={alertError}>
          {orderError}
        </p>
      ) : null}
      {comparables.length > 0 ? <LocatorNotice availability={locatorAvailability} /> : null}

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
                // Mission 146 — en contour : jamais deux boutons pleins à l'écran (M143).
                className={`${btnSecondary} px-3 py-1.5 text-sm`}
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
        <p className={hintText}>
          Aucun concurrent retenu. Retenez les concurrents pertinents ci-dessous.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {order.map((comparable, index) => (
            <ComparableCard
              key={comparable.id}
              comparable={comparable}
              editHref={`/builder/${projectId}/comparables/${comparable.id}/edit`}
              subjectSurfaceArea={subjectSurfaceArea}
              toggleAction={toggleAction}
              moveAction={moveAction}
              deleteAction={deleteAction}
              isFirst={index === 0}
              isLast={index === order.length - 1}
              orderFrozen={orderFrozen}
              locatorAvailability={locatorAvailability}
              oppositionNote={oppositionNotes[comparable.id]}
              selection={{
                checked: selected.has(comparable.id),
                onToggle: () => toggle(comparable.id),
                disabled: pending,
              }}
              drag={
                canDrag
                  ? {
                      dragging: dragged === index,
                      handle: {
                        draggable: !reordering,
                        onDragStart: (event) => {
                          // Une donnée posée : sans elle, certains navigateurs ne lancent pas le
                          // glisser-déposer.
                          event.dataTransfer.effectAllowed = 'move';
                          event.dataTransfer.setData('text/plain', comparable.id);
                          setDragged(index);
                        },
                        onDragEnd: () => setDragged(null),
                      },
                      target: {
                        onDragOver: (event) => event.preventDefault(),
                        onDrop: (event) => {
                          event.preventDefault();
                          drop(index);
                          setDragged(null);
                        },
                      },
                    }
                  : null
              }
            />
          ))}
        </ul>
      )}
    </section>
  );
}
