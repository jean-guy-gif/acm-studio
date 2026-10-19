'use client';

import { useState, useTransition } from 'react';

import { alertError, card, hintText } from '@/components/ui/styles';
import { setExpertMode } from '@/features/expert-mode/actions/set-expert-mode';

export const EXPERT_MODE_LABEL = 'Mode expert';
export const EXPERT_MODE_HINT =
  'Pour qui connaît déjà l’outil : l’écran « Bienvenue » et les rappels d’entraînement sont masqués, l’ordre des concurrents au Live se choisit en les déplaçant, et « Exporter le comparatif » ouvre un tableur pour votre propre usage. La question « devant le vendeur ? » reste.';

// Mission 110 — « Mon profil » : le mode expert, allumé ou éteint d'un geste.
export function ExpertModeToggle({ initial }: { initial: boolean }) {
  const [expert, setExpert] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <section className={`${card} flex flex-col gap-2 p-5`} data-testid="expert-mode">
      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={expert}
          disabled={pending}
          onChange={(event) => {
            const next = event.target.checked;
            setError(null);
            startTransition(async () => {
              const result = await setExpertMode(next);
              if (result.ok) setExpert(result.expert);
              else setError(result.error);
            });
          }}
          className="h-5 w-5 accent-brand"
        />
        <span className="font-title text-lg font-semibold text-brand-deep">
          {EXPERT_MODE_LABEL}
        </span>
        {pending ? <span className={hintText}>Enregistrement…</span> : null}
      </label>
      <p className={hintText}>{EXPERT_MODE_HINT}</p>
      {error ? (
        <p role="alert" className={alertError}>
          {error}
        </p>
      ) : null}
    </section>
  );
}
