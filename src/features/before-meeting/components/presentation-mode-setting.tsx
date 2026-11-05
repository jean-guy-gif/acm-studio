'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { alertError, fieldLabel, hintText } from '@/components/ui/styles';
import { setLivePresentationMode } from '@/features/live-seller/actions/set-live-presentation-mode';
import {
  LIVE_PRESENTATION_MODE_HINTS,
  LIVE_PRESENTATION_MODE_LABELS,
  LIVE_PRESENTATION_MODES,
  PRESENTATION_MODE_CONCLUDED_MESSAGE,
  PRESENTATION_MODE_STARTED_MESSAGE,
  type LivePresentationMode,
} from '@/features/live-seller/services/presentation-mode';

const option =
  'flex cursor-pointer items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-colors has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:checked]:text-brand-deep has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 border-zinc-200 text-zinc-700 stage:border-white/15 stage:text-white/80 stage:has-[:checked]:bg-brand/15 stage:has-[:checked]:text-white';

// Mission 131 — « Façon de présenter » : Live interactif (défaut), présentation directe, document
// seul ; enregistré sur le dossier dès qu'il change. « Document seul » n'est plus possible une fois
// le Live commencé, et rien ne change sur un dossier conclu (l'écran le dit, le serveur et la base
// le refusent). Pendant le Live, le conseiller en change par « Réglages ».
export function PresentationModeSetting({
  projectId,
  mode,
  liveStarted,
  concluded,
}: {
  projectId: string;
  mode: LivePresentationMode;
  liveStarted: boolean;
  concluded: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<LivePresentationMode>(mode);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const choose = (next: LivePresentationMode) => {
    if (next === selected || concluded) {
      return;
    }
    const previous = selected;
    setSelected(next);
    setError(null);
    startTransition(async () => {
      const result = await setLivePresentationMode(projectId, next);
      if (!result.ok) {
        setSelected(previous);
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <fieldset className="flex flex-col gap-2" data-presentation-mode>
      <legend className={`${fieldLabel} mb-2`}>Façon de présenter</legend>
      <div className="flex flex-wrap gap-2">
        {LIVE_PRESENTATION_MODES.map((value) => (
          <label key={value} className={option}>
            <input
              type="radio"
              name="live_presentation_mode"
              value={value}
              checked={selected === value}
              disabled={concluded || pending || (value === 'document' && liveStarted)}
              onChange={() => choose(value)}
              className="accent-brand"
            />
            {LIVE_PRESENTATION_MODE_LABELS[value]}
          </label>
        ))}
      </div>
      <p className={hintText}>{LIVE_PRESENTATION_MODE_HINTS[selected]}</p>
      {concluded ? (
        <p className={hintText}>{PRESENTATION_MODE_CONCLUDED_MESSAGE}</p>
      ) : liveStarted && selected !== 'document' ? (
        <p className={hintText}>{PRESENTATION_MODE_STARTED_MESSAGE}</p>
      ) : null}
      {error ? (
        <p role="alert" className={alertError}>
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
