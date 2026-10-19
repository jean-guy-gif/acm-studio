'use client';

import { useState, useTransition } from 'react';

import { alertError, btnSecondary, card, sectionTitle, hintText } from '@/components/ui/styles';
import { reorderLiveCompetitors } from '@/features/live-seller/actions/reorder-live-competitors';

export type LiveOrderEntry = { id: string; label: string; shown: boolean };

export const LIVE_ORDER_TITLE = 'Ordre des concurrents au Live';

function move<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

// MISSION 110 — mode expert : l'ordre de passage des concurrents au Live, par glisser-déposer (et
// par flèches, au clavier ou sur tablette). Chaque déplacement s'enregistre aussitôt ; il ne se
// modifie plus une fois le Live commencé. Un concurrent se nomme par son libellé neutre (M107).
export function LiveOrderEditor({
  projectId,
  entries,
}: {
  projectId: string;
  entries: LiveOrderEntry[];
}) {
  const [order, setOrder] = useState(entries);
  const [dragged, setDragged] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function commit(next: LiveOrderEntry[]) {
    const previous = order;
    setOrder(next);
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await reorderLiveCompetitors(
        projectId,
        next.map((entry) => entry.id),
      );
      if (result.ok) {
        setSaved(true);
      } else {
        setOrder(previous);
        setError(result.error);
      }
    });
  }

  return (
    <section className={`${card} flex flex-col gap-3 p-5`} data-testid="live-order">
      <h2 className={sectionTitle}>{LIVE_ORDER_TITLE}</h2>
      <p className={hintText}>Faites glisser un concurrent, ou utilisez les flèches.</p>
      <ol className="flex flex-col gap-2">
        {order.map((entry, index) => (
          <li
            key={entry.id}
            draggable={!pending}
            onDragStart={() => setDragged(index)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              if (dragged != null && dragged !== index) commit(move(order, dragged, index));
              setDragged(null);
            }}
            onDragEnd={() => setDragged(null)}
            data-testid="live-order-entry"
            className={`flex cursor-grab items-center gap-3 rounded-xl border px-3 py-2 text-sm ${
              dragged === index ? 'border-brand bg-brand-soft' : 'border-zinc-200 bg-white'
            }`}
          >
            <span aria-hidden="true" className="text-zinc-400">
              ⋮⋮
            </span>
            <span className="w-6 font-semibold text-brand-deep">{index + 1}</span>
            <span className="flex-1 text-zinc-800">
              <span data-testid="live-order-label">{entry.label}</span>
              {entry.shown ? null : <span className={`${hintText} ml-2`}>(hors Live)</span>}
            </span>
            <button
              type="button"
              aria-label={`Monter ${entry.label}`}
              disabled={pending || index === 0}
              onClick={() => commit(move(order, index, index - 1))}
              className={`${btnSecondary} px-2 py-0.5 text-xs`}
            >
              ↑
            </button>
            <button
              type="button"
              aria-label={`Descendre ${entry.label}`}
              disabled={pending || index === order.length - 1}
              onClick={() => commit(move(order, index, index + 1))}
              className={`${btnSecondary} px-2 py-0.5 text-xs`}
            >
              ↓
            </button>
          </li>
        ))}
      </ol>
      {pending ? <p className={hintText}>Enregistrement…</p> : null}
      {saved && !pending ? (
        <p role="status" className={hintText}>
          Ordre enregistré.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className={alertError}>
          {error}
        </p>
      ) : null}
    </section>
  );
}
