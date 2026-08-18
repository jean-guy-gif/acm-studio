'use client';

import { useActionState } from 'react';

import { SubmitButton } from '@/components/submit-button';
import {
  initialLiveActionState,
  type LiveActionState,
} from '@/features/live-seller/actions/live-action-state';
import { LiveComparableHeader } from '@/features/live-seller/components/live-comparable-header';
import { LiveFeatureComparison } from '@/features/live-seller/components/live-feature-comparison';
import { LiveGallery } from '@/features/live-seller/components/live-gallery';
import {
  choice,
  ctaPrimary,
  errorText,
  fieldInput,
  fieldLabel,
  okText,
  panel,
  question,
  questionHint,
} from '@/features/live-seller/components/live-stage';
import {
  SERIOUS_COMPETITOR_LABELS,
  SERIOUS_COMPETITOR_VALUES,
} from '@/features/live-seller/constants';
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
    <div className="flex flex-col gap-6 sm:gap-8">
      <div className="flex flex-col gap-3">
        <h2 className={question}>Est-il un sérieux concurrent pour votre bien ?</h2>
        <p className={questionHint}>
          Observez le bien comme le ferait un acheteur — son prix viendra ensuite.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_1fr] lg:gap-8">
        <div className="flex flex-col gap-4">
          <LiveGallery photos={entry.photoUrls} alt={entry.title ?? 'Bien concurrent'} />
          <LiveComparableHeader entry={entry} />
        </div>

        <form action={formAction} className={`${panel} flex h-fit flex-col gap-4`}>
          <fieldset className="flex flex-col gap-3">
            <legend className={fieldLabel}>La réponse du vendeur</legend>
            <div className="flex flex-col gap-3">
              {SERIOUS_COMPETITOR_VALUES.map((value) => (
                <label key={value} className={choice}>
                  <input
                    type="radio"
                    name="seller_serious_competitor"
                    value={value}
                    defaultChecked={currentAnswer === value}
                    className="sr-only"
                  />
                  {SERIOUS_COMPETITOR_LABELS[value]}
                </label>
              ))}
            </div>
            {state.fieldErrors.seller_serious_competitor ? (
              <span role="alert" className={errorText}>
                {state.fieldErrors.seller_serious_competitor}
              </span>
            ) : null}
          </fieldset>

          <label className="flex flex-col gap-1.5">
            <span className={fieldLabel}>Commentaire (facultatif)</span>
            <textarea
              name="seller_serious_competitor_comment"
              rows={2}
              defaultValue={currentComment}
              className={fieldInput}
            />
          </label>

          {state.error ? (
            <p role="alert" className={errorText}>
              {state.error}
            </p>
          ) : null}
          {state.ok ? <p className={okText}>Réponse enregistrée.</p> : null}
          <SubmitButton pendingLabel="Enregistrement…" className={ctaPrimary}>
            Enregistrer la réponse
          </SubmitButton>
        </form>
      </div>

      <LiveFeatureComparison items={entry.featureComparison} />
    </div>
  );
}
