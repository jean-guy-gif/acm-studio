'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useEffect } from 'react';

import { SubmitButton } from '@/components/submit-button';
import {
  initialLiveActionState,
  type LiveActionState,
} from '@/features/live-seller/actions/live-action-state';
import { LiveComparableHeader } from '@/features/live-seller/components/live-comparable-header';
import { LiveGallery } from '@/features/live-seller/components/live-gallery';
import {
  bigInput,
  bigInputUnit,
  ctaPrimary,
  errorText,
  okText,
  panel,
  question,
  questionHint,
  statLabel,
} from '@/features/live-seller/components/live-stage';
import type { LiveComparableEntry } from '@/features/seller-presentation/types/seller-presentation';

// Screen 2 — "À quel prix ?" The seller commits a guess. The real price stays
// MASKED here: it is revealed only on the next screen ("Ce prix vous paraît-il
// cohérent ?"). Splitting the guess from the reveal (Mission 41) preserves the
// beat between the two — the moment the seller corrects himself. The reveal lock
// lives in navigation (canAdvanceLivePage gates this screen on the saved guess).
export function LivePagePrice({
  entry,
  saveAction,
}: {
  entry: LiveComparableEntry;
  saveAction: (state: LiveActionState, formData: FormData) => Promise<LiveActionState>;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(saveAction, initialLiveActionState);
  const response = entry.response;

  // Refresh server data once after a save so the persisted estimate unlocks
  // navigation to the reveal screen (and the recomputed gap it will show).
  useEffect(() => {
    if (state.ok) {
      router.refresh();
    }
  }, [state.ok, router]);

  const savedEstimate = response?.seller_estimated_listing_price ?? null;
  const saved = savedEstimate != null;

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <div className="flex flex-col gap-3">
        <h2 className={question}>À quel prix pensez-vous que ce bien est proposé ?</h2>
        <p className={questionHint}>
          Donnez votre estimation : le prix réel s’affichera à l’écran suivant.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_1fr] lg:gap-8">
        <div className="flex flex-col gap-4">
          <LiveGallery photos={entry.photoUrls} alt={entry.title ?? 'Bien concurrent'} />
          <LiveComparableHeader entry={entry} />
        </div>

        <div className="flex h-fit flex-col gap-4">
          <form action={formAction} className={`${panel} flex flex-col gap-4`}>
            <label className="flex flex-col gap-2">
              <span className={statLabel}>Le prix imaginé par le vendeur</span>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  name="seller_estimated_listing_price"
                  min={0}
                  step="any"
                  placeholder="0"
                  defaultValue={state.values?.seller_estimated_listing_price ?? savedEstimate ?? ''}
                  className={bigInput}
                />
                <span className={bigInputUnit}>€</span>
              </div>
              {state.fieldErrors.seller_estimated_listing_price ? (
                <span role="alert" className={errorText}>
                  {state.fieldErrors.seller_estimated_listing_price}
                </span>
              ) : null}
            </label>
            {state.error ? (
              <p role="alert" className={errorText}>
                {state.error}
              </p>
            ) : null}
            {state.ok ? <p className={okText}>Estimation enregistrée.</p> : null}
            <SubmitButton pendingLabel="Validation…" className={ctaPrimary}>
              {saved ? 'Mettre à jour l’estimation' : 'Valider mon estimation'}
            </SubmitButton>
            <p className="text-sm text-zinc-400 stage:text-white/50">
              Le prix réel n’apparaît pas ici. Passez à l’écran suivant pour le découvrir.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
