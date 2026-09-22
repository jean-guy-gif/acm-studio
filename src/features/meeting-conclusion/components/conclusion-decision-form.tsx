'use client';

import { useState, useTransition } from 'react';

import { btnPrimary, errorText, fieldLabel, inputBase } from '@/components/ui/styles';
import { concludeMeeting } from '@/features/meeting-conclusion/actions/conclude-meeting';
import type { ConclusionOutcome } from '@/features/meeting-conclusion/types';

const choiceBase =
  'flex cursor-pointer items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium transition-colors';
const choiceIdle =
  'border-zinc-200 text-zinc-600 hover:border-brand hover:text-zinc-900 stage:border-white/15 stage:text-white/70';
const choiceActive =
  'border-brand bg-brand-soft text-brand-deep stage:bg-brand/15 stage:text-white';

// Mission 53 §2 — écran conseiller, jamais vu du vendeur : « Comment s'est conclu ce
// rendez-vous ? ». L'issue + le passage en Suivi sont écrits en une transaction (action
// concludeMeeting → fonction conclude_meeting). Succès → redirection vers /suivi.
export function ConclusionDecisionForm({
  projectId,
  initialOutcome,
  initialReason,
}: {
  projectId: string;
  initialOutcome: ConclusionOutcome | null;
  initialReason: string | null;
}) {
  const [outcome, setOutcome] = useState<ConclusionOutcome | null>(initialOutcome);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        setError(null);
        startTransition(async () => {
          const result = await concludeMeeting(projectId, formData);
          // En cas de succès, l'action redirige vers /suivi ; on ne reçoit qu'une erreur.
          if (result && !result.ok) {
            setError(result.error);
          }
        });
      }}
    >
      <fieldset className="flex flex-col gap-2">
        <legend className={`${fieldLabel} mb-1`}>Comment s’est conclu ce rendez-vous&nbsp;?</legend>
        <div className="flex flex-wrap gap-3">
          <label className={`${choiceBase} ${outcome === 'signed' ? choiceActive : choiceIdle}`}>
            <input
              type="radio"
              name="outcome"
              value="signed"
              checked={outcome === 'signed'}
              onChange={() => setOutcome('signed')}
              className="accent-brand"
            />
            Mandat signé
          </label>
          <label className={`${choiceBase} ${outcome === 'follow_up' ? choiceActive : choiceIdle}`}>
            <input
              type="radio"
              name="outcome"
              value="follow_up"
              checked={outcome === 'follow_up'}
              onChange={() => setOutcome('follow_up')}
              className="accent-brand"
            />
            À relancer
          </label>
        </div>
      </fieldset>

      {outcome === 'follow_up' ? (
        <label className="flex flex-col gap-2">
          <span className={fieldLabel}>
            Qu’est-ce qui retient le vendeur&nbsp;? (note de travail — jamais montrée au vendeur)
          </span>
          <textarea
            name="follow_up_reason"
            rows={3}
            maxLength={2000}
            defaultValue={initialReason ?? ''}
            className={inputBase}
          />
        </label>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className={btnPrimary} disabled={pending || outcome === null}>
          {pending ? 'Enregistrement…' : 'Conclure le rendez-vous'}
        </button>
        {error ? <span className={errorText}>{error}</span> : null}
      </div>
    </form>
  );
}
