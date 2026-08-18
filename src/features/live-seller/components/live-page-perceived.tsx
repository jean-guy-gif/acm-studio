'use client';

import { useActionState } from 'react';

import { SubmitButton } from '@/components/submit-button';
import {
  initialLiveActionState,
  type LiveActionState,
} from '@/features/live-seller/actions/live-action-state';
import {
  bigInput,
  bigInputUnit,
  ctaPrimary,
  errorText,
  okText,
  panel,
  panelSoft,
  question,
  questionHint,
  statLabel,
  statValue,
} from '@/features/live-seller/components/live-stage';
import type { LiveSellerSummary } from '@/features/live-seller/types';
import type { LiveComparativeData } from '@/features/seller-presentation/types/seller-presentation';

const euro = (value: number | null): string =>
  value != null ? `${Math.round(value).toLocaleString('fr-FR')}\u00A0€` : '—';

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
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 sm:gap-8">
      <div className="flex flex-col gap-3">
        <h2 className={question}>À quel prix positionneriez-vous aujourd’hui votre bien ?</h2>
        <p className={questionHint}>
          Après avoir observé le marché, votre intuition compte : c’est elle que nous notons ici.
        </p>
      </div>

      <form action={formAction} className={`${panel} flex flex-col gap-4`}>
        <label className="flex flex-col gap-2">
          <span className={statLabel}>Valeur perçue par le vendeur</span>
          <div className="flex items-center gap-3">
            <input
              type="number"
              name="seller_perceived_property_price"
              min={0}
              step="any"
              placeholder="0"
              defaultValue={perceived}
              className={bigInput}
            />
            <span className={bigInputUnit}>€</span>
          </div>
          {state.fieldErrors.seller_perceived_property_price ? (
            <span role="alert" className={errorText}>
              {state.fieldErrors.seller_perceived_property_price}
            </span>
          ) : null}
        </label>
        {state.error ? (
          <p role="alert" className={errorText}>
            {state.error}
          </p>
        ) : null}
        {state.ok ? <p className={okText}>Enregistré.</p> : null}
        <SubmitButton pendingLabel="Enregistrement…" className={ctaPrimary}>
          Enregistrer
        </SubmitButton>
      </form>

      <div className={panelSoft}>
        <div className={statLabel}>Positionnement observé sur le marché concurrentiel</div>
        <div className={statValue}>{euro(live.competitiveMarketCentral)}</div>
      </div>
    </div>
  );
}
