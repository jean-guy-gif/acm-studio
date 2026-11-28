'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { card, errorText, hintText } from '@/components/ui/styles';
import { setBuyerFinancingMode } from '@/features/buyers/actions/buyers';
import { financingPill } from '@/features/buyers/components/buyer-readiness-actions';
import { BUYER_FINANCING_MODE_LABELS, type BuyerFinancingMode } from '@/features/buyers/types';
import { OFFER_MODE_FIRST } from '@/features/purchase-offer/services/offer-gate';

const CHOICES = ['cash', 'loan'] as const;

// Lot B (Jean-Guy, 27/11) — « Pas encore dit », ou lu dans ses notes et encore « À vérifier » :
// l'offre d'achat demande d'abord comment il finance, avant tout champ. Le choix s'écrit sur sa
// fiche, par le geste de la fiche (`setBuyerFinancingMode`) ; la page se relit : comptant, l'offre
// d'aujourd'hui ; avec prêt, le message qui la bloque.
export function OfferModeQuestion({
  buyerId,
  mode,
  toVerify,
}: {
  buyerId: string;
  mode: BuyerFinancingMode;
  toVerify: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const read = toVerify && mode !== 'not_said' ? BUYER_FINANCING_MODE_LABELS[mode] : null;

  const choose = (next: (typeof CHOICES)[number]) => {
    setError(null);
    startTransition(async () => {
      const result = await setBuyerFinancingMode(buyerId, { mode: next }).catch(() => ({
        ok: false as const,
        error: 'Le mode de financement n’a pas pu être enregistré\u00a0: réessayez.',
      }));
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className={`${card} flex flex-col gap-3 p-5`} data-testid="offer-ask-mode">
      <h2 className="font-title text-lg font-semibold text-brand-deep">
        Comment finance-t-il&#x202f;?
      </h2>
      <p className="text-sm text-zinc-700">
        {read
          ? `Lu dans ses notes\u00a0: «\u00a0${read}\u00a0». Confirmez-le, ou corrigez\u00a0: l’offre en dépend.`
          : OFFER_MODE_FIRST}
      </p>
      <div className="flex flex-wrap gap-2">
        {CHOICES.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={read != null && mode === value}
            disabled={pending}
            onClick={() => choose(value)}
            className={financingPill(read != null && mode === value)}
          >
            {BUYER_FINANCING_MODE_LABELS[value]}
          </button>
        ))}
      </div>
      <p className={hintText}>Le choix s’écrit sur sa fiche.</p>
      {error ? (
        <p role="alert" className={errorText}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
