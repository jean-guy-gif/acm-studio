'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { alertError, fieldLabel, hintText } from '@/components/ui/styles';
import { RHYTHM_LABELS } from '@/features/before-meeting/services/live-sequence';
import type { LiveRhythm } from '@/features/live-seller/services/build-live-pages';
import { RHYTHM_LOCKED_MESSAGE } from '@/features/live-seller/services/live-timing';

const option =
  'flex cursor-pointer items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-colors has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:checked]:text-brand-deep has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 border-zinc-200 text-zinc-700 stage:border-white/15 stage:text-white/80 stage:has-[:checked]:bg-brand/15 stage:has-[:checked]:text-white';

// Mission 95 — « Rythme du Live » : le choix du conseiller, enregistré sur le dossier dès qu'il
// change. Une fois le Live commencé, il ne se modifie plus (l'écran le dit, le serveur et la
// base le refusent).
export function LiveRhythmSetting({
  rhythm,
  locked,
  bothEstimates,
  action,
}: {
  rhythm: LiveRhythm;
  locked: boolean;
  // « Accéléré : environ 40 min · Complet : environ 49 min »
  bothEstimates: string;
  action: (formData: FormData) => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<LiveRhythm>(rhythm);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const choose = (next: LiveRhythm) => {
    if (next === selected || locked) {
      return;
    }
    const previous = selected;
    setSelected(next);
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set('live_rhythm', next);
      const result = await action(formData);
      if (!result.ok) {
        setSelected(previous);
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <fieldset className="flex flex-col gap-2" data-live-rhythm>
      <legend className={`${fieldLabel} mb-2`}>Rythme du Live</legend>
      <div className="flex flex-wrap gap-2">
        {(['accelerated', 'complete'] as const).map((value) => (
          <label key={value} className={option}>
            <input
              type="radio"
              name="live_rhythm"
              value={value}
              checked={selected === value}
              disabled={locked || pending}
              onChange={() => choose(value)}
              className="accent-brand"
            />
            {RHYTHM_LABELS[value]}
          </label>
        ))}
      </div>
      <p className={hintText}>{bothEstimates}</p>
      {locked ? <p className={hintText}>{RHYTHM_LOCKED_MESSAGE}</p> : null}
      {error ? (
        <p role="alert" className={alertError}>
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
