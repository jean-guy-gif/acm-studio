'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { alertError, fieldLabel, hintText } from '@/components/ui/styles';
import { setProjectLanguage } from '@/features/projects/actions/set-project-language';
import {
  CLIENT_LANGUAGE_LABELS,
  offeredLanguages,
  type ClientLanguage,
} from '@/lib/client-language';

const option =
  'flex cursor-pointer items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-colors has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:checked]:text-brand-deep has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 border-zinc-200 text-zinc-700';

// Mission 140 — « Langue du vendeur » : le Live et les documents qu'il reçoit (synthèse, Point
// marché, Étude de marché, leurs liens et leurs messages) ; l'interface du conseiller reste en
// français. Enregistrée sur le dossier dès qu'elle change ; elle se change aussi pendant le Live
// (« Réglages »), ce qui a été répondu étant gardé.
export function ClientLanguageSetting({
  projectId,
  language,
}: {
  projectId: string;
  language: ClientLanguage;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<ClientLanguage>(language);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const choose = (next: ClientLanguage) => {
    if (next === selected) return;
    const previous = selected;
    setSelected(next);
    setError(null);
    startTransition(async () => {
      const result = await setProjectLanguage(projectId, next);
      if (!result.ok) {
        setSelected(previous);
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <fieldset className="flex flex-col gap-2" data-client-language>
      <legend className={`${fieldLabel} mb-2`}>Langue du vendeur</legend>
      <div className="flex flex-wrap gap-2">
        {offeredLanguages(language).map((value) => (
          <label key={value} className={option}>
            <input
              type="radio"
              name="project_language"
              value={value}
              checked={selected === value}
              disabled={pending}
              onChange={() => choose(value)}
              className="accent-brand"
            />
            {CLIENT_LANGUAGE_LABELS[value]}
          </label>
        ))}
      </div>
      <p className={hintText}>
        Le Live et les documents remis au vendeur suivent sa langue ; vos écrans restent en
        français.
      </p>
      {error ? (
        <p role="alert" className={alertError}>
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
