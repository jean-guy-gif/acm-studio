'use client';

import { useState, useTransition } from 'react';

import { btnSecondary, errorText, link } from '@/components/ui/styles';
import { changeMeetingOutcome } from '@/features/meeting-conclusion/actions/change-meeting-outcome';
import { OutcomeChoice } from '@/features/meeting-conclusion/components/outcome-choice';
import type { ConclusionOutcome } from '@/features/meeting-conclusion/types';

// Mission 54 §1 — changer l'issue depuis le Suivi, l'acte NORMAL du suivi. Replié par
// défaut (« Changer l'issue ») ; ouvert, il propose les quatre issues + motif. Le
// changement ne touche ni les montants figés, ni le statut (action changeMeetingOutcome).
export function SuiviIssueForm({
  projectId,
  currentOutcome,
  currentReason,
}: {
  projectId: string;
  currentOutcome: ConclusionOutcome | null;
  currentReason: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [outcome, setOutcome] = useState<ConclusionOutcome | null>(currentOutcome);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button type="button" className={link} onClick={() => setOpen(true)}>
        Changer l’issue
      </button>
    );
  }

  return (
    <form
      className="flex w-full flex-col gap-4 rounded-xl border border-zinc-200 p-4 stage:border-white/10"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        setError(null);
        startTransition(async () => {
          const result = await changeMeetingOutcome(projectId, formData);
          if (result.ok) {
            setOpen(false);
          } else {
            setError(result.error);
          }
        });
      }}
    >
      <OutcomeChoice
        outcome={outcome}
        onOutcomeChange={setOutcome}
        initialReason={currentReason}
        legend="Nouvelle issue"
      />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className={btnSecondary} disabled={pending || outcome === null}>
          {pending ? 'Enregistrement…' : 'Enregistrer l’issue'}
        </button>
        <button
          type="button"
          className={link}
          onClick={() => {
            setOutcome(currentOutcome);
            setOpen(false);
          }}
        >
          Annuler
        </button>
        {error ? <span className={errorText}>{error}</span> : null}
      </div>
    </form>
  );
}
