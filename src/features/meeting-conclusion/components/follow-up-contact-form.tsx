'use client';

import { useState, useTransition } from 'react';

import { btnSecondary, errorText, inputBase, link } from '@/components/ui/styles';
import { recordFollowUpContact } from '@/features/meeting-conclusion/actions/record-follow-up-contact';
import {
  defaultNextFollowUpOn,
  NEXT_FOLLOW_UP_MAX_DAYS,
  parisDay,
} from '@/features/meeting-conclusion/services/follow-up-contacts';
import type { FollowUpMotive } from '@/features/meeting-conclusion/types';

// Mission 96 — « Relancé aujourd'hui » : la date du jour et une note facultative d'une ligne.
// L'outil n'envoie rien au vendeur : le conseiller consigne ce qu'il vient de faire.
// Mission 105 — avec la date de prochaine relance, pré-remplie selon le motif (1 mois si le
// vendeur réfléchit au prix, 7 jours sinon) et modifiable : le dossier ne revient dans la pastille
// qu'à cette date.
export function FollowUpContactForm({
  projectId,
  motive,
}: {
  projectId: string;
  motive: FollowUpMotive | null;
}) {
  const [open, setOpen] = useState(false);
  const [today] = useState(() => parisDay(new Date()));
  const [lastDay] = useState(() =>
    parisDay(new Date(Date.now() + NEXT_FOLLOW_UP_MAX_DAYS * 86_400_000)),
  );
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
      <label className="flex items-center gap-2 text-sm text-zinc-600 stage:text-white/70">
        Prochaine relance
        <input
          type="date"
          name="next_follow_up_on"
          required
          min={today}
          max={lastDay}
          defaultValue={defaultNextFollowUpOn(motive, new Date())}
          className={`${inputBase} w-auto`}
        />
      </label>
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
