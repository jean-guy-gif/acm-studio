'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { errorText, link } from '@/components/ui/styles';
import { keepFollowUpDate } from '@/features/today/actions/keep-follow-up-date';

// Mission 145 (partie B) — « Garder la date » : la ligne « Relancer plus tôt ? » se cache jusqu'à la
// date de relance prévue, pour toute l'agence.
export function KeepDateButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="flex flex-col items-end gap-1">
      <button
        type="button"
        className={`${link} text-sm`}
        disabled={pending}
        data-testid="today-keep-date"
        onClick={() =>
          start(async () => {
            setError(null);
            const result = await keepFollowUpDate(projectId);
            if (!result.ok) setError(result.error);
            else router.refresh();
          })
        }
      >
        {pending ? 'Enregistrement…' : 'Garder la date'}
      </button>
      {error ? (
        <span role="alert" className={errorText}>
          {error}
        </span>
      ) : null}
    </span>
  );
}
