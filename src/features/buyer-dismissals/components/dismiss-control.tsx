'use client';

import { useState } from 'react';

import { errorText, link } from '@/components/ui/styles';
import { dismissForBuyer } from '@/features/buyer-dismissals/actions/dismiss';
import { DISMISS_REASON_LABELS } from '@/features/buyer-messages/report';
import { DISMISS_REASONS } from '@/features/buyer-messages/templates/types';

// Mission 139 — « Écarter pour lui », à côté de « Retenir » : la raison en un geste ; le bien sort
// aussitôt de la liste et ne lui sera plus proposé (veille comprise). « Annuler » est offert juste
// après, en tête de la page.
export function DismissControl({
  buyerId,
  target,
  label,
  onDismissed,
}: {
  buyerId: string;
  target: { source: string; reference: string };
  label: string;
  onDismissed: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        type="button"
        className={`${link} shrink-0 text-xs`}
        data-testid="dismiss-open"
        onClick={() => setOpen(true)}
      >
        Écarter pour lui
      </button>
    );
  }
  return (
    <div className="flex w-full flex-col gap-1.5" data-testid="dismiss-reasons">
      <span className="text-xs font-semibold text-zinc-700 stage:text-white/80">
        Pourquoi l’écarter ?
      </span>
      <div className="flex flex-wrap gap-1.5">
        {DISMISS_REASONS.map((reason) => (
          <button
            key={reason}
            type="button"
            disabled={pending}
            data-testid={`dismiss-reason-${reason}`}
            className="rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-medium text-zinc-700 hover:border-brand stage:border-white/20 stage:bg-transparent stage:text-white/80"
            onClick={() => {
              setError(null);
              setPending(true);
              void dismissForBuyer(buyerId, target, label, reason)
                .then((result) => {
                  setPending(false);
                  if (!result.ok) {
                    setError(result.error);
                    return;
                  }
                  onDismissed(result.key);
                })
                .catch(() => {
                  setPending(false);
                  setError('Connexion perdue : réessayez.');
                });
            }}
          >
            {DISMISS_REASON_LABELS[reason]}
          </button>
        ))}
        <button type="button" className={`${link} text-xs`} onClick={() => setOpen(false)}>
          Garder
        </button>
      </div>
      {error ? (
        <p role="alert" className={errorText}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
