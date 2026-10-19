'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { btnSecondary } from '@/components/ui/styles';
import {
  DismissedDuplicates,
  type DismissedDuplicate,
} from '@/features/comparables/components/dismissed-duplicates';
import { dismissPendingImport } from '@/features/competitor-search/actions/pending-imports';
import type { PendingImportView } from '@/features/competitor-search/queries/get-pending-imports';
import {
  importListing,
  READ_FAILURE_LABELS,
} from '@/features/competitor-search/services/import-listing';
import { listingImportDeps } from '@/features/competitor-search/services/listing-import-deps';
import {
  PENDING_DISMISS_LABEL,
  PENDING_IMPORTS_HINT,
  PENDING_RETRY_LABEL,
  pendingImportsTitle,
} from '@/features/competitor-search/services/pending-import-labels';

// Mission 101 — le bandeau rouge des biens RETENUS dont l'import n'a pas abouti. Ils sont
// enregistrés côté serveur : le bandeau les retrouve après un rechargement ou une fermeture
// d'onglet. « Réessayer » rejoue tout l'enchaînement (trois lectures, puis les données de la
// recherche). Côté conseiller seulement : jamais monté dans le Live.
export function PendingImportsBanner({
  projectId,
  pending,
}: {
  projectId: string;
  pending: PendingImportView[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  // Mission 108 — déjà dans le dossier, écartée : la question reste après le rafraîchissement.
  const [dismissed, setDismissed] = useState<DismissedDuplicate[]>([]);

  if (pending.length === 0) {
    return dismissed.length > 0 ? (
      <DismissedDuplicates projectId={projectId} items={dismissed} />
    ) : null;
  }

  const note = (id: string, text: string) => setNotes((current) => ({ ...current, [id]: text }));

  async function retry(item: PendingImportView) {
    setBusyId(item.id);
    note(item.id, 'Lecture de l’annonce en cours…');
    try {
      const outcome = await importListing(
        item.url,
        listingImportDeps({
          projectId,
          propertyType: item.propertyType,
          fromStreamEstate: item.fromStreamEstate,
          robotsCache: new Map(),
        }),
      );
      if (outcome.status === 'pending') {
        note(item.id, `Toujours en attente : ${READ_FAILURE_LABELS[outcome.cause]}.`);
      } else if (outcome.status === 'already_dismissed') {
        const comparableId = outcome.comparableId;
        setDismissed((current) =>
          current.some((entry) => entry.id === comparableId)
            ? current
            : [...current, { id: comparableId, label: item.label }],
        );
      }
    } catch {
      note(item.id, 'Toujours en attente : l’import a été interrompu.');
    } finally {
      setBusyId(null);
      router.refresh();
    }
  }

  async function dismiss(item: PendingImportView) {
    setBusyId(item.id);
    try {
      const result = await dismissPendingImport(projectId, item.id);
      if (!result.ok) note(item.id, result.error);
    } catch {
      note(item.id, 'Le retrait n’a pas abouti. Réessayez.');
    } finally {
      setBusyId(null);
      router.refresh();
    }
  }

  return (
    <div
      role="alert"
      data-testid="pending-imports-banner"
      className="flex flex-col gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900 stage:border-red-400/40 stage:bg-red-500/10 stage:text-red-100"
    >
      <div className="flex flex-col gap-1">
        <p className="font-title text-base font-semibold">{pendingImportsTitle(pending.length)}</p>
        <p>{PENDING_IMPORTS_HINT}</p>
      </div>
      <DismissedDuplicates projectId={projectId} items={dismissed} />
      <ul className="flex flex-col gap-2">
        {pending.map((item) => (
          <li
            key={item.id}
            data-testid="pending-import"
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-red-200 pt-2 stage:border-red-400/25"
          >
            <span className="flex min-w-0 flex-col">
              <span className="font-medium break-words">
                {item.label} · {item.site}
              </span>
              <span className="text-xs">{notes[item.id] ?? item.cause ?? 'Pas encore lu.'}</span>
            </span>
            <span className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void retry(item)}
                disabled={busyId != null}
                className={btnSecondary}
              >
                {busyId === item.id ? 'En cours…' : PENDING_RETRY_LABEL}
              </button>
              <button
                type="button"
                onClick={() => void dismiss(item)}
                disabled={busyId != null}
                className="text-xs font-medium underline underline-offset-2 disabled:opacity-50"
              >
                {PENDING_DISMISS_LABEL}
              </button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
