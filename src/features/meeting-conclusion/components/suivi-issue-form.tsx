'use client';

import { useState, useTransition } from 'react';

import { btnSecondary, errorText, link } from '@/components/ui/styles';
import { changeMeetingOutcome } from '@/features/meeting-conclusion/actions/change-meeting-outcome';
import { OutcomeChoice } from '@/features/meeting-conclusion/components/outcome-choice';
import type {
  ConclusionOutcome,
  FollowUpMotive,
  MandateType,
} from '@/features/meeting-conclusion/types';

// Mission 54 §1 — changer l'issue depuis le Suivi, l'acte NORMAL du suivi. Replié par
// défaut (« Changer l'issue ») ; ouvert, il propose les quatre issues + motif. Le
// changement ne touche ni les montants figés, ni le statut (action changeMeetingOutcome).
export function SuiviIssueForm({
  projectId,
  currentOutcome,
  currentReason,
  currentMandateType = null,
  currentMotive = null,
  currentMotiveDetail = null,
  knownPrice = null,
  openLabel = 'Changer l’issue',
}: {
  projectId: string;
  currentOutcome: ConclusionOutcome | null;
  currentReason: string | null;
  // Mission 90 — le type et le prix déjà enregistrés ; et le libellé du bouton (« Compléter »
  // pour un mandat signé sans type).
  currentMandateType?: MandateType | null;
  // Mission 96 — le motif de relance déjà enregistré.
  currentMotive?: FollowUpMotive | null;
  currentMotiveDetail?: string | null;
  knownPrice?: number | null;
  openLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [outcome, setOutcome] = useState<ConclusionOutcome | null>(currentOutcome);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button type="button" className={`${link} text-xs`} onClick={() => setOpen(true)}>
        {openLabel}
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
        initialMandateType={currentMandateType}
        initialMotive={currentMotive}
        initialMotiveDetail={currentMotiveDetail}
        knownPrice={knownPrice}
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
