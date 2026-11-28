'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { badgeBrand, btnSecondary, errorText } from '@/components/ui/styles';
import { moveBuyerStatus } from '@/features/buyers/actions/buyers';
import { buyerStatusActions, type BuyerStatusMove } from '@/features/buyers/services/buyer-status';
import { BUYER_STATUS_LABELS, type Buyer } from '@/features/buyers/types';
import { COMPROMISE_HOLDS_BUYER } from '@/features/mandate-life/queries/get-buyer-compromise';
import { formatRelativeSince } from '@/lib/format';

// Mission 117 — le statut, un cran à la fois, daté à chaque changement.
export function BuyerStatusActions({
  buyer,
  compromiseNoted = false,
}: {
  buyer: Buyer;
  // Lot C (question 18) — un compromis noté pour lui : il ne quitte pas la vente d'ici.
  compromiseNoted?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState({
    status: buyer.status,
    changedAt: buyer.statusChangedAt,
  });

  const move = (step: BuyerStatusMove) => {
    setError(null);
    startTransition(async () => {
      const result = await moveBuyerStatus(buyer.id, step).catch(() => ({
        ok: false as const,
        error: 'Le statut n’a pas pu être enregistré\u00a0: vérifiez la connexion, puis réessayez.',
      }));
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCurrent({ status: result.buyer.status, changedAt: result.buyer.statusChangedAt });
      router.refresh();
    });
  };

  // Mission 146 (partie B) — en contour : le seul plein de la fiche est sa prochaine étape.
  return (
    <div className="flex flex-col gap-2" data-testid="buyer-status">
      <div className="flex flex-wrap items-center gap-2">
        <span className={badgeBrand} data-testid="buyer-status-badge">
          {BUYER_STATUS_LABELS[current.status]}
        </span>
        <span className="text-xs text-zinc-500 stage:text-white/60">
          {formatRelativeSince(current.changedAt)}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {buyerStatusActions(current.status, { compromiseNoted }).map((action) => (
          <button
            key={action.move}
            type="button"
            disabled={pending}
            onClick={() => move(action.move)}
            className={`${btnSecondary} px-3 py-1.5 text-xs`}
          >
            {action.label}
          </button>
        ))}
      </div>
      {compromiseNoted ? (
        <p className="text-xs text-zinc-500 stage:text-white/60" data-testid="buyer-status-held">
          {COMPROMISE_HOLDS_BUYER}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className={errorText}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
