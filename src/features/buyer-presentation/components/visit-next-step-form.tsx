'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import {
  chipNeutral,
  chipSelected,
  errorText,
  socleBtnFilled,
  socleBtnQuiet,
} from '@/components/ui/styles';
import { NEXT_STEP_LABELS } from '@/features/buyer-messages/report';
import { VISIT_NEXT_STEPS, type VisitNextStep } from '@/features/buyer-messages/templates/types';
import { changeVisitNextStep } from '@/features/buyer-presentation/actions/visit-requests';

// La refonte, lot F — les pastilles à toucher du socle (44 px) : choisie, pleine.
const chip = (on: boolean) => (on ? chipSelected : chipNeutral);

// Correctif du 13/11 (essai de Jean-Guy) — l'acquéreur change d'avis après la visite : la suite se
// change sur place, depuis Visites et la fiche acquéreur ; le compte rendu reste. Ouvert, le
// formulaire porte le seul bouton plein (M147 A).
export function VisitNextStepForm({
  visitId,
  current,
  offerAllowed,
  onCancel,
}: {
  visitId: string;
  current: VisitNextStep | null;
  // « Pas pour moi » ne passe pas en « Offre envisagée » (`canTurnIntoOffer`).
  offerAllowed: boolean;
  onCancel: () => void;
}) {
  const router = useRouter();
  const [nextStep, setNextStep] = useState<VisitNextStep | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const steps = VISIT_NEXT_STEPS.filter(
    (step) => step !== current && (offerAllowed || step !== 'offer'),
  );
  return (
    <form
      className="flex w-full flex-col gap-3"
      data-testid="visit-next-step-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (!nextStep) return;
        setError(null);
        startTransition(async () => {
          const result = await changeVisitNextStep(visitId, nextStep).catch(() => ({
            ok: false as const,
            error: 'Connexion perdue — réessayez.',
          }));
          if (!result.ok) {
            setError(result.error);
            return;
          }
          onCancel();
          router.refresh();
        });
      }}
    >
      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-sm font-semibold text-zinc-800 stage:text-white">
          La nouvelle suite
        </legend>
        <div className="flex flex-wrap gap-2">
          {steps.map((value) => (
            <button
              key={value}
              type="button"
              className={chip(nextStep === value)}
              aria-pressed={nextStep === value}
              data-testid={`visit-change-${value}`}
              onClick={() => setNextStep(value)}
            >
              {NEXT_STEP_LABELS[value]}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          className={socleBtnFilled}
          disabled={pending || !nextStep}
          data-testid="visit-change-save"
        >
          {pending ? 'Enregistrement…' : 'Enregistrer la suite'}
        </button>
        <button type="button" className={socleBtnQuiet} onClick={onCancel}>
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
