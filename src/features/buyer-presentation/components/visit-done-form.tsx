'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { btnPrimary, btnSecondary, errorText, inputBase, link } from '@/components/ui/styles';
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

// Mission 119 — « Visite faite », datée par le serveur. Mission 139 — l'avis en boutons, ce qui a
// plu et déplu en étiquettes, une note libre facultative, la suite ; puis les deux messages prêts
// (à l'acquéreur, au vendeur d'un bien de l'agence).
// Lancement, mission 7 (Jean-Guy, 23/11) — saisi en trente secondes, au pouce, après la visite :
// son avis et la suite d'abord, en grands boutons — deux touchers et « Enregistrer » suffisent — ;
// ce qui a plu, ce qui a gêné et la note sont facultatifs, repliés ; et l'on reste sur la page d'où
// l'on vient (Visites ou la fiche acquéreur), ses messages ouverts aussitôt.
const big = (on: boolean) =>
  `flex min-h-12 items-center justify-center rounded-xl border px-3 py-2.5 text-center text-base font-semibold transition-colors ${
    on
      ? 'border-brand bg-brand-deep text-white'
      : 'border-zinc-300 bg-white text-zinc-800 hover:border-brand stage:border-white/20 stage:bg-transparent stage:text-white/85'
  }`;
const chip = (on: boolean) =>
  `rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
    on
      ? 'border-brand bg-brand-deep text-white'
      : 'border-zinc-300 bg-white text-zinc-700 hover:border-brand stage:border-white/20 stage:bg-transparent stage:text-white/80'
  }`;
const legend = 'text-sm font-semibold text-zinc-800 stage:text-white';

// Mission 146 (partie B) — le formulaire seul : « Visite faite », l'étape ou le lien de la carte
// (`VisitActions`), l'ouvre ; « Annuler » le referme.
export function VisitDoneForm({
  requestId,
  onCancel,
}: {
  requestId: string;
  onCancel: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [opinion, setOpinion] = useState<VisitOpinion | null>(null);
  const [liked, setLiked] = useState<VisitTag[]>([]);
  const [disliked, setDisliked] = useState<VisitTag[]>([]);
  const [note, setNote] = useState('');
  const [nextStep, setNextStep] = useState<VisitNextStep | null>(null);
  // Ce qui a plu, ce qui a gêné, la note : facultatifs, ouverts d'un toucher.
  const [more, setMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toggle = (list: VisitTag[], tag: VisitTag) =>
    list.includes(tag) ? list.filter((entry) => entry !== tag) : [...list, tag];
  const steps = VISIT_NEXT_STEPS.filter((step) => !(opinion === 'not_for_me' && step === 'offer'));
  const details = liked.length + disliked.length + (note.trim() ? 1 : 0);

  return (
    <form
      className="flex w-full flex-col gap-4"
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
          // On reste sur la page d'où l'on vient : la visite y passe « faite », ses deux messages
          // ouverts aussitôt (M139).
          router.push(`${pathname}?messages=${requestId}#visite-${requestId}`);
        });
      }}
    >
      <fieldset className="flex flex-col gap-2">
        <legend className={legend}>Son avis</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {VISIT_OPINIONS.map((value) => (
            <button
              key={value}
              type="button"
              className={big(opinion === value)}
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
      <fieldset className="flex flex-col gap-2">
        <legend className={legend}>La suite</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {steps.map((value) => (
            <button
              key={value}
              type="button"
              className={big(nextStep === value)}
              aria-pressed={nextStep === value}
              data-testid={`visit-next-${value}`}
              onClick={() => setNextStep(value)}
            >
              {NEXT_STEP_LABELS[value]}
            </button>
          ))}
        </div>
      </fieldset>
      <button
        type="button"
        className={`${link} self-start text-sm hover:underline`}
        aria-expanded={more}
        data-testid="visit-more-open"
        onClick={() => setMore((open) => !open)}
      >
        {more ? '− ' : '+ '}Ce qui a plu, ce qui a gêné, une note (facultatif)
        {!more && details > 0 ? ` · ${details} noté${details > 1 ? 's' : ''}` : ''}
      </button>
      {more ? (
        <div className="flex flex-col gap-3" data-testid="visit-more">
          <fieldset className="flex flex-col gap-1.5">
            <legend className={legend}>Ce qui a plu</legend>
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
            <legend className={legend}>Ce qui a déplu</legend>
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
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          className={`${btnPrimary} min-h-12 px-5 text-base`}
          disabled={pending || !opinion || !nextStep}
          data-testid="visit-done-save"
        >
          {pending ? 'Enregistrement…' : 'Enregistrer le compte rendu'}
        </button>
        <button type="button" className={btnSecondary} onClick={onCancel}>
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
