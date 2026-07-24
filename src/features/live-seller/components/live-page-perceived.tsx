'use client';

import { useActionState } from 'react';

import { SubmitButton } from '@/components/submit-button';
import {
  initialLiveActionState,
  type LiveActionState,
} from '@/features/live-seller/actions/live-action-state';
import type { LiveSellerSummary } from '@/features/live-seller/types';
import type { LiveComparativeData } from '@/features/seller-presentation/types/seller-presentation';

const euro = (value: number | null): string =>
  value != null ? `${Math.round(value).toLocaleString('fr-FR')} €` : '—';

// "1. Valeur perçue par le vendeur" — a manual seller input. The observed market
// positioning is shown for context (never as "vraie valeur du marché").
export function LivePagePerceived({
  live,
  summary,
  saveAction,
}: {
  live: LiveComparativeData;
  summary: LiveSellerSummary | null;
  saveAction: (state: LiveActionState, formData: FormData) => Promise<LiveActionState>;
}) {
  const [state, formAction] = useActionState(saveAction, initialLiveActionState);
  const perceived =
    state.values?.seller_perceived_property_price ?? summary?.seller_perceived_property_price ?? '';

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-semibold">
        À quel prix positionneriez-vous aujourd’hui votre bien ?
      </h2>

      <div className="rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800">
        <div className="text-xs text-zinc-500">
          Positionnement observé sur le marché concurrentiel
        </div>
        <div className="font-medium">{euro(live.competitiveMarketCentral)}</div>
      </div>

      <form
        action={formAction}
        className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
      >
        <input
          type="hidden"
          name="seller_most_dangerous_comparable_id"
          value={summary?.seller_most_dangerous_comparable_id ?? ''}
        />
        <input
          type="hidden"
          name="seller_most_dangerous_reason"
          value={summary?.seller_most_dangerous_reason ?? ''}
        />
        <input
          type="hidden"
          name="seller_most_dangerous_comment"
          value={summary?.seller_most_dangerous_comment ?? ''}
        />
        <input
          type="hidden"
          name="advisor_comparative_market_price"
          value={summary?.advisor_comparative_market_price ?? ''}
        />
        <label className="flex flex-col gap-1 text-sm font-medium">
          Valeur perçue par le vendeur (€)
          <input
            type="number"
            name="seller_perceived_property_price"
            min={0}
            step="any"
            defaultValue={perceived}
            className="max-w-xs rounded border px-2 py-1 font-normal"
          />
          {state.fieldErrors.seller_perceived_property_price ? (
            <span role="alert" className="text-sm text-red-600">
              {state.fieldErrors.seller_perceived_property_price}
            </span>
          ) : null}
        </label>
        {state.error ? (
          <p role="alert" className="text-sm text-red-600">
            {state.error}
          </p>
        ) : null}
        {state.ok ? <p className="text-sm text-emerald-600">Enregistré.</p> : null}
        <SubmitButton pendingLabel="Enregistrement…">Enregistrer</SubmitButton>
      </form>
    </div>
  );
}
