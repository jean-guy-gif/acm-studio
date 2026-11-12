'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { verifyAllBuyerFields } from '@/features/buyer-notes/actions/save-from-notes';

// Mission 151 — « À vérifier · 15 · Tout est juste » en tête d'une fiche née d'une lecture
// (planche 3) : un toucher retire toutes les pastilles (M97).
export function VerifyAllBadge({ buyerId, count }: { buyerId: string; count: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState(false);
  if (count === 0) return null;
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800"
      data-testid="buyer-to-verify"
    >
      À vérifier · {count}
      <button
        type="button"
        disabled={pending}
        className="underline underline-offset-2"
        onClick={() =>
          start(async () => {
            const result = await verifyAllBuyerFields(buyerId);
            setFailed(!result.ok);
            if (result.ok) router.refresh();
          })
        }
      >
        {pending ? 'Enregistrement…' : 'Tout est juste'}
      </button>
      {failed ? <span role="alert">Réessayez.</span> : null}
    </span>
  );
}
