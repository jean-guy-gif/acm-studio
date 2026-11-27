'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { btnSecondary, errorText, fieldLabel, hintText } from '@/components/ui/styles';
import { markBuyerContacted, setBuyerFinancing } from '@/features/buyers/actions/buyers';
import { buyerDateLabel } from '@/features/buyers/services/buyer-criteria';
import {
  BUYER_FINANCINGS,
  BUYER_FINANCING_HINT,
  BUYER_FINANCING_LABELS,
  type BuyerFinancing,
} from '@/features/buyers/types';

// Mission 132 — « Prêt à visiter » se nourrit de deux gestes du conseiller, sur la fiche : son
// financement (validé, en cours, inconnu), et « J'ai eu l'acquéreur aujourd'hui », qui date le
// dernier contact à l'heure du serveur. Chacun s'enregistre seul, sans toucher à sa recherche.
export function BuyerReadinessActions({
  buyerId,
  financing,
  financingChangedAt,
  contactedToday,
}: {
  buyerId: string;
  financing: BuyerFinancing;
  financingChangedAt: string | null;
  contactedToday: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState({ financing, changedAt: financingChangedAt });
  const [contacted, setContacted] = useState(contactedToday);

  const choose = (next: BuyerFinancing) => {
    if (next === current.financing) return;
    setError(null);
    startTransition(async () => {
      const result = await setBuyerFinancing(buyerId, next).catch(() => ({
        ok: false as const,
        error: 'Le financement n’a pas pu être enregistré\u00a0: réessayez.',
      }));
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCurrent({ financing: result.buyer.financing, changedAt: result.buyer.financingChangedAt });
      router.refresh();
    });
  };

  const contact = () => {
    setError(null);
    startTransition(async () => {
      const result = await markBuyerContacted(buyerId).catch(() => ({
        ok: false as const,
        error: 'Le contact n’a pas pu être noté\u00a0: réessayez.',
      }));
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setContacted(true);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-3" data-testid="buyer-readiness-actions">
      <div className="flex flex-col gap-1.5">
        <span className={fieldLabel}>Financement</span>
        <div className="flex flex-wrap gap-2" data-testid="buyer-financing">
          {BUYER_FINANCINGS.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={current.financing === value}
              disabled={pending}
              onClick={() => choose(value)}
              className={`min-h-10 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                current.financing === value
                  ? 'border-emerald-600 bg-emerald-600 text-white'
                  : 'border-zinc-300 bg-white text-zinc-700 hover:border-emerald-600 stage:border-white/20 stage:bg-white/5 stage:text-white/85'
              }`}
            >
              {BUYER_FINANCING_LABELS[value]}
            </button>
          ))}
        </div>
        <span className={hintText}>
          {BUYER_FINANCING_HINT}
          {current.changedAt ? ` Posé le ${buyerDateLabel(current.changedAt)}.` : ''}
        </span>
      </div>
      <button
        type="button"
        onClick={contact}
        disabled={pending || contacted}
        className={`${btnSecondary} w-full`}
        data-testid="buyer-contacted"
      >
        {contacted ? 'Contact noté aujourd’hui ✓' : 'J’ai eu l’acquéreur aujourd’hui'}
      </button>
      {error ? (
        <p role="alert" className={errorText}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
