'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { btnPrimary, errorText, inputBase, link } from '@/components/ui/styles';
import { recordVisitDone } from '@/features/buyer-presentation/actions/visit-requests';
import { FEEDBACK_MAX } from '@/features/buyer-presentation/services/visit-request-row';
import { VISIT_OUTCOME_LABELS } from '@/features/buyer-presentation/types';

// Mission 119 — « Visite faite » : le retour libre de l'acquéreur et l'issue, datés par le serveur.
export function VisitDoneForm({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        className={`${btnPrimary} px-3 py-1.5 text-xs`}
        onClick={() => setOpen(true)}
      >
        Visite faite
      </button>
    );
  }
  return (
    <form
      className="flex w-full flex-col gap-2"
      data-testid="visit-done-form"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setError(null);
        startTransition(async () => {
          const result = await recordVisitDone(
            requestId,
            data.get('feedback'),
            data.get('outcome'),
          ).catch(() => ({ ok: false as const, error: 'Connexion perdue — réessayez.' }));
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setOpen(false);
          router.refresh();
        });
      }}
    >
      <textarea
        name="feedback"
        rows={2}
        maxLength={FEEDBACK_MAX}
        placeholder="Ce que l’acquéreur a dit après la visite"
        aria-label="Retour de visite"
        className={`${inputBase} w-full`}
      />
      <div className="flex flex-wrap items-center gap-2">
        <select
          name="outcome"
          defaultValue="visited"
          aria-label="Issue de la visite"
          className={inputBase}
        >
          {(['visited', 'declined', 'offer'] as const).map((outcome) => (
            <option key={outcome} value={outcome}>
              {VISIT_OUTCOME_LABELS[outcome]}
            </option>
          ))}
        </select>
        <button type="submit" disabled={pending} className={`${btnPrimary} px-3 py-1.5 text-xs`}>
          {pending ? 'Enregistrement…' : 'Enregistrer la visite'}
        </button>
        <button type="button" className={`${link} text-xs`} onClick={() => setOpen(false)}>
          Annuler
        </button>
      </div>
      {error ? (
        <p role="alert" className={errorText}>
          {error}
        </p>
      ) : null}
    </form>
  );
}
