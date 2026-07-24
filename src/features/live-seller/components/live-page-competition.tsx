'use client';

import { useActionState } from 'react';

import { SubmitButton } from '@/components/submit-button';
import type { LiveActionState } from '@/features/live-seller/actions/live-action-state';
import { LiveComparableHeader } from '@/features/live-seller/components/live-comparable-header';
import { LiveFeatureComparison } from '@/features/live-seller/components/live-feature-comparison';
import { LiveGallery } from '@/features/live-seller/components/live-gallery';
import {
  SERIOUS_COMPETITOR_LABELS,
  SERIOUS_COMPETITOR_VALUES,
} from '@/features/live-seller/constants';
import { initialLiveActionState } from '@/features/live-seller/actions/live-action-state';
import type { LiveComparableEntry } from '@/features/seller-presentation/types/seller-presentation';

// Page 1 — "Est-il un sérieux concurrent ?" NO price, no price/m², no duration,
// no history. The seller judges the product before knowing its price.
export function LivePageCompetition({
  entry,
  saveAction,
}: {
  entry: LiveComparableEntry;
  saveAction: (state: LiveActionState, formData: FormData) => Promise<LiveActionState>;
}) {
  const [state, formAction] = useActionState(saveAction, initialLiveActionState);
  const response = entry.response;
  const currentAnswer =
    state.values?.seller_serious_competitor ?? response?.seller_serious_competitor ?? '';
  const currentComment =
    state.values?.seller_serious_competitor_comment ??
    response?.seller_serious_competitor_comment ??
    '';

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-semibold">Est-il un sérieux concurrent pour votre bien ?</h2>
      <LiveGallery photos={entry.photoUrls} alt={entry.title ?? 'Bien concurrent'} />
      <LiveComparableHeader entry={entry} />
      <LiveFeatureComparison items={entry.featureComparison} />

      <form
        action={formAction}
        className="flex flex-col gap-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
      >
        {/* Preserve the other persisted answers on this comparable. */}
        <input
          type="hidden"
          name="seller_estimated_listing_price"
          value={response?.seller_estimated_listing_price ?? ''}
        />
        <input
          type="hidden"
          name="seller_market_duration_reason"
          value={response?.seller_market_duration_reason ?? ''}
        />
        <input
          type="hidden"
          name="seller_market_duration_comment"
          value={response?.seller_market_duration_comment ?? ''}
        />

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium">Votre réponse</legend>
          <div className="flex flex-wrap gap-2">
            {SERIOUS_COMPETITOR_VALUES.map((value) => (
              <label
                key={value}
                className="flex items-center gap-2 rounded border border-zinc-300 px-3 py-1.5 dark:border-zinc-700"
              >
                <input
                  type="radio"
                  name="seller_serious_competitor"
                  value={value}
                  defaultChecked={currentAnswer === value}
                />
                {SERIOUS_COMPETITOR_LABELS[value]}
              </label>
            ))}
          </div>
          {state.fieldErrors.seller_serious_competitor ? (
            <span role="alert" className="text-sm text-red-600">
              {state.fieldErrors.seller_serious_competitor}
            </span>
          ) : null}
        </fieldset>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Commentaire (facultatif)
          <textarea
            name="seller_serious_competitor_comment"
            rows={2}
            defaultValue={currentComment}
            className="rounded border px-2 py-1 font-normal"
          />
        </label>

        {state.error ? (
          <p role="alert" className="text-sm text-red-600">
            {state.error}
          </p>
        ) : null}
        {state.ok ? <p className="text-sm text-emerald-600">Réponse enregistrée.</p> : null}
        <SubmitButton pendingLabel="Enregistrement…">Enregistrer</SubmitButton>
      </form>
    </div>
  );
}
