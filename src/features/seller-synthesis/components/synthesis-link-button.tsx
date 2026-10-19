'use client';

import { useState, useTransition } from 'react';

import { btnSecondary, hintText } from '@/components/ui/styles';
import { createSynthesisLink } from '@/features/seller-synthesis/actions/create-synthesis-link';

// Mission 110 — « Créer un lien pour le vendeur » : valable 30 jours, jamais indexé. Le lien
// s'affiche ici, à copier ; rien n'est envoyé par l'outil.
export function SynthesisLinkButton({ projectId }: { projectId: string }) {
  const [pending, startTransition] = useTransition();
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-2 print:hidden">
      <button
        type="button"
        className={`${btnSecondary} self-start`}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await createSynthesisLink(projectId);
            if (result.ok) setUrl(result.url);
            else setError(result.error);
          })
        }
      >
        {pending ? 'Création…' : 'Créer un lien pour le vendeur (30 jours)'}
      </button>
      {url ? (
        <p className="text-sm break-all" data-testid="synthesis-link">
          {url}
        </p>
      ) : null}
      {url ? (
        <p className={hintText}>
          Copiez ce lien pour l’envoyer au vendeur. Il expire dans 30 jours ; l’outil n’envoie rien.
        </p>
      ) : null}
      {error ? <p className="text-sm text-amber-700">{error}</p> : null}
    </div>
  );
}
