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
  bigValue,
  choice,
  ctaPrimary,
  errorText,
  fieldInput,
  fieldLabel,
  okText,
  panel,
  question,
  questionHint,
  revealValue,
  statLabel,
  statValue,
} from '@/features/live-seller/components/live-stage';
import { PRICE_COHERENCE_VALUES, PRICE_COHERENCE_LABELS } from '@/features/live-seller/constants';
import type { LiveComparableEntry } from '@/features/seller-presentation/types/seller-presentation';

const euro = (value: number | null): string =>
  value != null ? `${Math.round(value).toLocaleString('fr-FR')} €` : '—';

// Screen 3 — "Ce prix vous paraît-il cohérent ?" The real price is revealed here,
// against the seller's own guess (never the seller's property price, never the
// advisor range — Mission 39 guarantee), and the seller reacts. The REVEAL LOCK
// is enforced twice: navigation cannot reach this screen without the persisted
// guess (canAdvanceLivePage), AND this component refuses to show the price if the
// guess is somehow absent (e.g. a deep-link) — defense in depth.
export function LivePagePriceReveal({
  entry,
  saveAction,
}: {
  entry: LiveComparableEntry;
  saveAction: (state: LiveActionState, formData: FormData) => Promise<LiveActionState>;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(saveAction, initialLiveActionState);
  const response = entry.response;

  useEffect(() => {
    if (state.ok) {
      router.refresh();
    }
  }, [state.ok, router]);

  const savedEstimate = response?.seller_estimated_listing_price ?? null;
  const reveal = entry.priceReveal;
  const currentCoherence =
    state.values?.seller_price_coherence ?? response?.seller_price_coherence ?? '';
  const currentComment =
    state.values?.seller_price_coherence_comment ?? response?.seller_price_coherence_comment ?? '';

  // Deep-link / out-of-order guard: never reveal a price the seller has not yet
  // guessed. This mirrors the navigation gate so the invariant holds even if this
  // screen is reached directly.
  if (savedEstimate == null) {
    return (
      <div className="flex flex-col gap-6 sm:gap-8">
        <div className="flex flex-col gap-3">
          <h2 className={question}>Ce prix vous paraît-il cohérent ?</h2>
          <p className={questionHint}>
            Donnez d’abord votre estimation à l’écran précédent : le prix réel s’affichera ensuite.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_1fr] lg:gap-8">
          <div className="flex flex-col gap-4">
            <LiveGallery photos={entry.photoUrls} alt={entry.title ?? 'Bien concurrent'} />
            <LiveComparableHeader entry={entry} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <div className="flex flex-col gap-3">
        <h2 className={question}>Ce prix vous paraît-il cohérent ?</h2>
        <p className={questionHint}>
          Voici le prix réellement affiché. Qu’en pense le vendeur, face à son estimation ?
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_1fr] lg:gap-8">
        <div className="flex flex-col gap-4">
          <LiveGallery photos={entry.photoUrls} alt={entry.title ?? 'Bien concurrent'} />
          <LiveComparableHeader entry={entry} />
        </div>

        <div className="flex h-fit flex-col gap-4">
          <div className={`${panel} live-reveal-pop flex flex-col gap-5`}>
            <div>
              <div className={statLabel}>Prix affiché sur le marché</div>
              <div className={revealValue}>{euro(reveal.currentPrice)}</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className={statLabel}>Prix imaginé</div>
                <div className={bigValue}>{euro(savedEstimate)}</div>
              </div>
              <div>
                <div className={statLabel}>Écart</div>
                <div className={bigValue}>
                  {reveal.gapAmount != null
                    ? `${reveal.gapAmount >= 0 ? '+' : ''}${reveal.gapAmount.toLocaleString('fr-FR')} €`
                    : '—'}
                </div>
                {reveal.gapPercentage != null ? (
                  <div className="text-sm text-zinc-500 stage:text-white/60">
                    {reveal.gapPercentage >= 0 ? '+' : ''}
                    {reveal.gapPercentage} %
                  </div>
                ) : null}
              </div>
              <div>
                <div className={statLabel}>Prix au m²</div>
                <div className={statValue}>
                  {reveal.pricePerSquareMeter != null
                    ? `${reveal.pricePerSquareMeter.toLocaleString('fr-FR')} €/m²`
                    : '—'}
                </div>
              </div>
              <div>
                <div className={statLabel}>Position (prix/m²)</div>
                <div className={statValue}>
                  {reveal.relativePosition
                    ? `${reveal.relativePosition.rank} / ${reveal.relativePosition.total}`
                    : '—'}
                </div>
              </div>
            </div>
          </div>

          <form action={formAction} className={`${panel} flex flex-col gap-4`}>
            <fieldset className="flex flex-col gap-3">
              <legend className={fieldLabel}>Selon le vendeur, ce prix est…</legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {PRICE_COHERENCE_VALUES.map((value) => (
                  <label
                    key={value}
                    className={`${choice} min-h-11 px-3 py-2 text-base font-medium`}
                  >
                    <input
                      type="radio"
                      name="seller_price_coherence"
                      value={value}
                      defaultChecked={currentCoherence === value}
                      className="sr-only"
                    />
                    {PRICE_COHERENCE_LABELS[value]}
                  </label>
                ))}
              </div>
              {state.fieldErrors.seller_price_coherence ? (
                <span role="alert" className={errorText}>
                  {state.fieldErrors.seller_price_coherence}
                </span>
              ) : null}
            </fieldset>

            <label className="flex flex-col gap-1.5">
              <span className={fieldLabel}>Commentaire (facultatif)</span>
              <textarea
                name="seller_price_coherence_comment"
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
            {state.ok ? <p className={okText}>Réaction enregistrée.</p> : null}
            <SubmitButton pendingLabel="Enregistrement…" className={ctaPrimary}>
              Enregistrer
            </SubmitButton>
          </form>
        </div>
      </div>
    </div>
  );
}
