'use client';

import { useState, useTransition } from 'react';

import { btnSecondary, errorText, inputBase, link } from '@/components/ui/styles';
import { recordFollowUpContact } from '@/features/meeting-conclusion/actions/record-follow-up-contact';

// Mission 96 — « Relancé aujourd'hui » : la date du jour et une note facultative d'une ligne.
// L'outil n'envoie rien au vendeur : le conseiller consigne ce qu'il vient de faire.
export function FollowUpContactForm({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        type="button"
        className={`${btnSecondary} whitespace-nowrap`}
        onClick={() => setOpen(true)}
      >
        Relancé aujourd’hui
      </button>
    );
  }

  return (
    <form
      className="flex w-full flex-wrap items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        setError(null);
        startTransition(async () => {
          const result = await recordFollowUpContact(projectId, formData);
          if (result.ok) {
            setOpen(false);
          } else {
            setError(result.error);
          }
        });
      }}
    >
      <input
        type="text"
        name="note"
        maxLength={200}
        aria-label="Note de relance (facultative)"
        placeholder="Note (facultative)"
        className={`${inputBase} min-w-56 flex-1`}
      />
      <button type="submit" className={`${btnSecondary} whitespace-nowrap`} disabled={pending}>
        {pending ? 'Enregistrement…' : 'Enregistrer la relance'}
      </button>
      <button type="button" className={link} onClick={() => setOpen(false)}>
        Annuler
      </button>
      {error ? <span className={errorText}>{error}</span> : null}
    </form>
  );
}
