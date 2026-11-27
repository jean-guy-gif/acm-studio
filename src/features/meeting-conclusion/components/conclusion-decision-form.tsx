'use client';

import { useState, useTransition } from 'react';

import { btnPrimary, errorText } from '@/components/ui/styles';
import { concludeMeeting } from '@/features/meeting-conclusion/actions/conclude-meeting';
import { OutcomeChoice } from '@/features/meeting-conclusion/components/outcome-choice';
import type {
  ConclusionOutcome,
  FollowUpMotive,
  MandateType,
  Objection,
} from '@/features/meeting-conclusion/types';

// Mission 53/54 — écran conseiller, jamais vu du vendeur : « Comment s'est conclu ce
// rendez-vous ? ». L'issue + le passage en Suivi sont écrits en une transaction
// (concludeMeeting → conclude_meeting). Succès → redirection vers /suivi.
export function ConclusionDecisionForm({
  projectId,
  initialOutcome,
  initialReason,
  initialMandateType,
  initialMotive,
  initialMotiveDetail,
  initialObjections = [],
  initialObjectionNote = null,
  knownPrice,
}: {
  projectId: string;
  initialOutcome: ConclusionOutcome | null;
  initialReason: string | null;
  // Mission 90 — le type déjà enregistré et le prix déjà enregistré (saisi au Live).
  initialMandateType: MandateType | null;
  // Mission 96 — le motif de relance déjà enregistré.
  initialMotive: FollowUpMotive | null;
  initialMotiveDetail: string | null;
  initialObjections?: Objection[];
  initialObjectionNote?: string | null;
  knownPrice: number | null;
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
      <OutcomeChoice
        outcome={outcome}
        onOutcomeChange={setOutcome}
        initialReason={initialReason}
        initialMandateType={initialMandateType}
        initialMotive={initialMotive}
        initialMotiveDetail={initialMotiveDetail}
        initialObjections={initialObjections}
        initialObjectionNote={initialObjectionNote}
        knownPrice={knownPrice}
        legend={'Comment s’est conclu ce rendez-vous\u202f?'}
      />

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className={btnPrimary} disabled={pending || outcome === null}>
          {pending ? 'Enregistrement…' : 'Conclure le rendez-vous'}
        </button>
        {error ? <span className={errorText}>{error}</span> : null}
      </div>
    </form>
  );
}
