'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { btnPrimary, btnSecondary, errorText } from '@/components/ui/styles';
import { changeVisitNextStep } from '@/features/buyer-presentation/actions/visit-requests';

// Correctif du 13/11 (essai de Jean-Guy) — l'acquéreur veut faire une offre après une visite notée
// autrement : l'offre d'achat passe elle-même la visite en « Offre envisagée », puis s'ouvre sur
// elle. Le compte rendu et la date de la visite ne changent pas.
export function OfferSwitchButton({
  buyerId,
  visitId,
  primary,
}: {
  buyerId: string;
  visitId: string;
  primary: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        className={`${primary ? btnPrimary : btnSecondary} self-start`}
        disabled={pending}
        data-testid="offer-switch"
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await changeVisitNextStep(visitId, 'offer').catch(() => ({
              ok: false as const,
              error: 'Connexion perdue — réessayez.',
            }));
            if (!result.ok) {
              setError(result.error);
              return;
            }
            router.replace(`/acquereurs/${buyerId}/offre?visite=${visitId}`);
            router.refresh();
          });
        }}
      >
        {pending
          ? 'Enregistrement…'
          : 'Passer la visite en «\u00a0Offre envisagée\u00a0» et faire l’offre'}
      </button>
      {error ? (
        <p role="alert" className={errorText}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
