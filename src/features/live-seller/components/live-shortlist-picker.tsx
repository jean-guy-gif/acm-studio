'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { btnPrimary, btnSecondary, card, hintText, sectionTitle } from '@/components/ui/styles';
import { saveLiveShortlist } from '@/features/live-seller/actions/save-live-shortlist';
import type { LiveShortlistView } from '@/features/live-seller/queries/get-live-shortlist';
import { LIVE_SHORTLIST_SIZE } from '@/features/live-seller/services/live-shortlist';
import { formatPercent } from '@/lib/format';

// Mission 110 — au-delà de 6 concurrents retenus, « Lancer le Live » propose les 6 plus
// pertinents (le % de correspondance), cochés d'avance et modifiables ; « Garder tout le monde »
// reste possible. Les concurrents décochés restent retenus : ils ne sont simplement pas montrés.
export function LiveShortlistPicker({
  projectId,
  shortlist,
  pending: initiallyPending,
}: {
  projectId: string;
  shortlist: LiveShortlistView;
  pending: boolean;
}) {
  const router = useRouter();
  const [checked, setChecked] = useState<Set<string>>(
    () =>
      new Set(
        shortlist.entries
          .filter((entry) => (initiallyPending ? entry.proposed : entry.shown))
          .map((entry) => entry.id),
      ),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, startTransition] = useTransition();

  const save = (ids: string[]) =>
    startTransition(async () => {
      setError(null);
      const result = await saveLiveShortlist(projectId, ids);
      if (result.ok) router.refresh();
      else setError(result.error);
    });

  return (
    <section className={`${card} flex flex-col gap-3 p-5`} data-testid="live-shortlist">
      <h2 className={sectionTitle}>
        {shortlist.retainedCount} concurrents retenus&nbsp;: lesquels montrer au vendeur&#x202f;?
      </h2>
      <p className={hintText}>
        Nous vous proposons les {LIVE_SHORTLIST_SIZE} plus proches de son bien. Ceux que vous
        décochez restent retenus&nbsp;: ils comptent dans le prix des concurrents et la Prospection,
        ils ne passent simplement pas pendant le Live.
      </p>
      <ul className="flex flex-col gap-1.5">
        {shortlist.entries.map((entry) => (
          <li key={entry.id}>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="accent-brand"
                checked={checked.has(entry.id)}
                onChange={(event) =>
                  setChecked((current) => {
                    const next = new Set(current);
                    if (event.target.checked) next.add(entry.id);
                    else next.delete(entry.id);
                    return next;
                  })
                }
              />
              <span>{entry.label}</span>
              {entry.percent != null ? (
                <span className="text-zinc-500">
                  · {formatPercent(entry.percent)} de correspondance
                </span>
              ) : null}
            </label>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className={btnPrimary}
          disabled={saving || checked.size === 0}
          onClick={() => save([...checked])}
        >
          Garder ces {checked.size} concurrents
        </button>
        <button
          type="button"
          className={btnSecondary}
          disabled={saving}
          onClick={() => save(shortlist.entries.map((entry) => entry.id))}
        >
          Garder tout le monde
        </button>
      </div>
      {error ? <p className="text-sm text-amber-700">{error}</p> : null}
    </section>
  );
}
