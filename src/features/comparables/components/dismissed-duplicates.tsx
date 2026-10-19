'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { btnSecondary } from '@/components/ui/styles';
import { retainCompetitor } from '@/features/comparables/actions/retain-competitor';

// Mission 108 — une annonce déjà dans le dossier, mais écartée : jamais avalée en silence.
export const DISMISSED_DUPLICATE_QUESTION = 'Déjà dans le dossier (écartée) : la retenir ?';
export const RETAIN_LABEL = 'La retenir';

export type DismissedDuplicate = { id: string; label: string };

export function DismissedDuplicates({
  projectId,
  items,
}: {
  projectId: string;
  items: DismissedDuplicate[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  if (items.length === 0) {
    return null;
  }

  async function retain(item: DismissedDuplicate) {
    setBusyId(item.id);
    try {
      const result = await retainCompetitor(projectId, item.id);
      setNotes((current) => ({ ...current, [item.id]: result.ok ? 'Retenue.' : result.error }));
      if (result.ok) router.refresh();
    } catch {
      setNotes((current) => ({ ...current, [item.id]: 'Le concurrent n’a pas pu être retenu.' }));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <ul
      data-testid="dismissed-duplicates"
      className="flex flex-col gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 stage:border-amber-300/40 stage:bg-amber-300/10 stage:text-amber-100"
    >
      {items.map((item) => (
        <li key={item.id} className="flex flex-wrap items-center justify-between gap-2">
          <span>
            {item.label ? <span className="font-medium">{item.label} — </span> : null}
            {notes[item.id] ?? DISMISSED_DUPLICATE_QUESTION}
          </span>
          {notes[item.id] === 'Retenue.' ? null : (
            <button
              type="button"
              className={btnSecondary}
              disabled={busyId != null}
              onClick={() => void retain(item)}
            >
              {busyId === item.id ? '…' : RETAIN_LABEL}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
