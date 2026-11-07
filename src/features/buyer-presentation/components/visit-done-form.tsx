'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { btnPrimary, btnSecondary, errorText, inputBase } from '@/components/ui/styles';
import {
  DISLIKED_LABELS,
  LIKED_LABELS,
  NEXT_STEP_LABELS,
  OPINION_LABELS,
} from '@/features/buyer-messages/report';
import {
  VISIT_NEXT_STEPS,
  VISIT_OPINIONS,
  VISIT_TAGS,
  type VisitNextStep,
  type VisitOpinion,
  type VisitTag,
} from '@/features/buyer-messages/templates/types';
import { recordVisitDone } from '@/features/buyer-presentation/actions/visit-requests';
import { FEEDBACK_MAX } from '@/features/buyer-presentation/services/visit-request-row';

// Mission 119 — « Visite faite », datée par le serveur. Mission 139 — un écran court, au pouce :
// l'avis en boutons, ce qui a plu et déplu en étiquettes, une note libre facultative, la suite ;
// puis les deux messages prêts (à l'acquéreur, au vendeur d'un bien de l'agence), ouverts aussitôt
// sur Visites (la visite quitte « À planifier » : le formulaire disparaît avec elle).
const chip = (on: boolean) =>
  `rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
    on
      ? 'border-brand bg-brand-deep text-white'
      : 'border-zinc-300 bg-white text-zinc-700 hover:border-brand stage:border-white/20 stage:bg-transparent stage:text-white/80'
  }`;

export function VisitDoneForm({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [opinion, setOpinion] = useState<VisitOpinion | null>(null);
  const [liked, setLiked] = useState<VisitTag[]>([]);
  const [disliked, setDisliked] = useState<VisitTag[]>([]);
  const [note, setNote] = useState('');
  const [nextStep, setNextStep] = useState<VisitNextStep | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        className={`${btnSecondary} self-start px-3 py-1.5 text-xs`}
        data-testid="visit-done-open"
        onClick={() => setOpen(true)}
      >
        Visite faite
      </button>
    );
  }
  const toggle = (list: VisitTag[], tag: VisitTag) =>
    list.includes(tag) ? list.filter((entry) => entry !== tag) : [...list, tag];
  const steps = VISIT_NEXT_STEPS.filter((step) => !(opinion === 'not_for_me' && step === 'offer'));

  return (
    <form
      className="flex w-full flex-col gap-3"
      data-testid="visit-done-form"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await recordVisitDone(requestId, {
            opinion,
            liked,
            disliked,
            nextStep,
            note,
          }).catch(() => ({ ok: false as const, error: 'Connexion perdue — réessayez.' }));
          if (!result.ok) {
            setError(result.error);
            return;
          }
          // La page se rafraîchit avec la visite faite : ses deux messages s'ouvrent sur Visites.
          router.push(`/visites?messages=${requestId}#visite-${requestId}`);
        });
      }}
    >
      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-sm font-semibold text-zinc-800 stage:text-white">Son avis</legend>
        <div className="flex flex-wrap gap-2">
          {VISIT_OPINIONS.map((value) => (
            <button
              key={value}
              type="button"
              className={chip(opinion === value)}
              aria-pressed={opinion === value}
              data-testid={`visit-opinion-${value}`}
              onClick={() => {
                setOpinion(value);
                if (value === 'not_for_me' && nextStep === 'offer') setNextStep(null);
              }}
            >
              {OPINION_LABELS[value]}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-sm font-semibold text-zinc-800 stage:text-white">
          Ce qui a plu
        </legend>
        <div className="flex flex-wrap gap-2">
          {VISIT_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              className={chip(liked.includes(tag))}
              aria-pressed={liked.includes(tag)}
              data-testid={`visit-liked-${tag}`}
              onClick={() => setLiked((current) => toggle(current, tag))}
            >
              {LIKED_LABELS[tag]}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-sm font-semibold text-zinc-800 stage:text-white">
          Ce qui a déplu
        </legend>
        <div className="flex flex-wrap gap-2">
          {VISIT_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              className={chip(disliked.includes(tag))}
              aria-pressed={disliked.includes(tag)}
              data-testid={`visit-disliked-${tag}`}
              onClick={() => setDisliked((current) => toggle(current, tag))}
            >
              {DISLIKED_LABELS[tag]}
            </button>
          ))}
        </div>
      </fieldset>
      <textarea
        rows={2}
        maxLength={FEEDBACK_MAX}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Une note pour vous (facultative)"
        aria-label="Note de visite"
        data-testid="visit-note"
        className={`${inputBase} w-full`}
      />
      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-sm font-semibold text-zinc-800 stage:text-white">La suite</legend>
        <div className="flex flex-wrap gap-2">
          {steps.map((value) => (
            <button
              key={value}
              type="button"
              className={chip(nextStep === value)}
              aria-pressed={nextStep === value}
              data-testid={`visit-next-${value}`}
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
          className={btnPrimary}
          disabled={pending || !opinion || !nextStep}
          data-testid="visit-done-save"
        >
          {pending ? 'Enregistrement…' : 'Enregistrer le compte rendu'}
        </button>
        <button type="button" className={btnSecondary} onClick={() => setOpen(false)}>
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
