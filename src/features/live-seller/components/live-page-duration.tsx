'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useEffect } from 'react';

import { SubmitButton } from '@/components/submit-button';
import {
  initialLiveActionState,
  type LiveActionState,
} from '@/features/live-seller/actions/live-action-state';
import { LiveComparableHeader } from '@/features/live-seller/components/live-comparable-header';
import { LiveFeatureComparison } from '@/features/live-seller/components/live-feature-comparison';
import { LiveGallery } from '@/features/live-seller/components/live-gallery';
import {
  bigInput,
  bigInputUnit,
  bigValue,
  choice,
  ctaPrimary,
  errorText,
  fieldInput,
  fieldLabel,
  okText,
  panel,
  panelSoft,
  question,
  questionHint,
  revealValue,
  statLabel,
  statValue,
} from '@/features/live-seller/components/live-stage';
import {
  MARKET_DURATION_REASONS,
  MARKET_DURATION_REASON_LABELS,
  SERIOUS_COMPETITOR_LABELS,
  type SeriousCompetitor,
} from '@/features/live-seller/constants';
import type { LiveComparableEntry } from '@/features/seller-presentation/types/seller-presentation';

const euro = (value: number | null): string =>
  value != null ? `${Math.round(value).toLocaleString('fr-FR')}\u00A0€` : '—';

// Page 3 — "Pourquoi est-il toujours sur le marché ?" The seller first GUESSES
// how long the property has been for sale; the observed duration and the price
// drops are only revealed once that estimate is SAVED (M27 invariant), and only
// then comes the "why" discussion.
export function LivePageDuration({
  entry,
  saveAction,
}: {
  entry: LiveComparableEntry;
  saveAction: (state: LiveActionState, formData: FormData) => Promise<LiveActionState>;
}) {
  const [state, formAction] = useActionState(saveAction, initialLiveActionState);
  const router = useRouter();
  const response = entry.response;
  const currentReason =
    state.values?.seller_market_duration_reason ?? response?.seller_market_duration_reason ?? '';
  const currentComment =
    state.values?.seller_market_duration_comment ?? response?.seller_market_duration_comment ?? '';
  const savedEstimatedDays = response?.seller_estimated_days_on_market ?? null;
  const currentEstimatedDays =
    state.values?.seller_estimated_days_on_market ?? savedEstimatedDays ?? '';
  const durationRevealed = savedEstimatedDays != null;

  useEffect(() => {
    if (state.ok) {
      router.refresh();
    }
  }, [router, state]);

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <div className="flex flex-col gap-3">
        <h2 className={question}>Pourquoi est-il toujours sur le marché ?</h2>
        <p className={questionHint}>
          {durationRevealed
            ? 'La durée observée est révélée — qu’est-ce qui retient ce bien sur le marché ?'
            : 'D’abord votre intuition : depuis combien de temps ce bien est-il en vente ?'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_1fr] lg:gap-8">
        <div className="flex flex-col gap-4">
          <LiveGallery photos={entry.photoUrls} alt={entry.title ?? 'Bien concurrent'} />
          <LiveComparableHeader entry={entry} />

          <div className={`${panelSoft} grid grid-cols-2 gap-4 sm:grid-cols-3`}>
            <div>
              <div className={statLabel}>Prix affiché</div>
              <div className={statValue}>{euro(entry.price)}</div>
            </div>
            <div>
              <div className={statLabel}>Prix au m²</div>
              <div className={statValue}>
                {entry.pricePerSquareMeter != null
                  ? `${entry.pricePerSquareMeter.toLocaleString('fr-FR')}\u00A0€/m²`
                  : '—'}
              </div>
            </div>
            <div>
              <div className={statLabel}>Estimation du vendeur</div>
              <div className={statValue}>
                {euro(response?.seller_estimated_listing_price ?? null)}
              </div>
            </div>
            <div className="col-span-2 sm:col-span-3">
              <div className={statLabel}>Sérieux concurrent ?</div>
              <div className={statValue}>
                {response?.seller_serious_competitor
                  ? SERIOUS_COMPETITOR_LABELS[
                      response.seller_serious_competitor as SeriousCompetitor
                    ]
                  : 'Non renseigné'}
              </div>
            </div>
          </div>
        </div>

        <form action={formAction} className={`${panel} flex h-fit flex-col gap-4`}>
          <label className="flex flex-col gap-2">
            <span className={statLabel}>Durée imaginée par le vendeur</span>
            <div className="flex items-center gap-3">
              <input
                type="number"
                name="seller_estimated_days_on_market"
                min={0}
                step={1}
                placeholder="90"
                defaultValue={currentEstimatedDays}
                className={bigInput}
              />
              <span className={bigInputUnit}>jours</span>
            </div>
            {state.fieldErrors.seller_estimated_days_on_market ? (
              <span role="alert" className={errorText}>
                {state.fieldErrors.seller_estimated_days_on_market}
              </span>
            ) : null}
          </label>

          {durationRevealed ? (
            <div className="live-reveal-pop flex flex-col gap-4">
              <div>
                <div className={statLabel}>Durée observée sur le marché</div>
                <div className={revealValue}>
                  {entry.marketDuration.available && entry.marketDuration.days != null
                    ? `${entry.marketDuration.days.toLocaleString('fr-FR')}\u00A0jours`
                    : 'Non disponible'}
                </div>
                {entry.marketDuration.available ? (
                  <div className="mt-1 text-sm text-zinc-500 stage:text-white/60">
                    {entry.marketDuration.label}
                  </div>
                ) : null}
                {entry.marketDuration.available &&
                entry.marketDuration.days != null &&
                savedEstimatedDays != null &&
                entry.marketDuration.days !== savedEstimatedDays ? (
                  <div className="mt-1 text-sm font-medium text-zinc-600 stage:text-white/75">
                    {entry.marketDuration.days > savedEstimatedDays
                      ? `Soit ${(entry.marketDuration.days - savedEstimatedDays).toLocaleString('fr-FR')} jours de plus que l’estimation du vendeur (${savedEstimatedDays.toLocaleString('fr-FR')} jours).`
                      : `Soit ${(savedEstimatedDays - entry.marketDuration.days).toLocaleString('fr-FR')} jours de moins que l’estimation du vendeur (${savedEstimatedDays.toLocaleString('fr-FR')} jours).`}
                  </div>
                ) : null}
              </div>

              {entry.priceHistory.available ? (
                <div className={`${panelSoft} flex flex-wrap items-baseline gap-x-6 gap-y-2`}>
                  <div>
                    <div className={statLabel}>Prix initial</div>
                    <div className={bigValue}>{euro(entry.priceHistory.initialPrice)}</div>
                  </div>
                  <div>
                    <div className={statLabel}>Baisse constatée</div>
                    <div className={bigValue}>
                      {euro(entry.priceHistory.totalDropAmount)}
                      {entry.priceHistory.totalDropPercentage != null
                        ? ` (${entry.priceHistory.totalDropPercentage} %)`
                        : ''}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-zinc-400 stage:text-white/50">
                  Historique de prix non disponible.
                </p>
              )}

              <fieldset className="flex flex-col gap-3">
                <legend className={fieldLabel}>Selon le vendeur, pourquoi ?</legend>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {MARKET_DURATION_REASONS.map((reason) => (
                    <label
                      key={reason}
                      className={`${choice} min-h-11 px-3 py-2 text-base font-medium`}
                    >
                      <input
                        type="radio"
                        name="seller_market_duration_reason"
                        value={reason}
                        defaultChecked={currentReason === reason}
                        className="sr-only"
                      />
                      {MARKET_DURATION_REASON_LABELS[reason]}
                    </label>
                  ))}
                </div>
              </fieldset>

              <label className="flex flex-col gap-1.5">
                <span className={fieldLabel}>Commentaire (facultatif)</span>
                <textarea
                  name="seller_market_duration_comment"
                  rows={2}
                  defaultValue={currentComment}
                  className={fieldInput}
                />
              </label>
            </div>
          ) : (
            <p className="text-sm text-zinc-400 stage:text-white/50">
              Donnez d’abord votre estimation : la durée réellement observée s’affichera ensuite.
            </p>
          )}

          {state.error ? (
            <p role="alert" className={errorText}>
              {state.error}
            </p>
          ) : null}
          {state.ok ? <p className={okText}>Réponse enregistrée.</p> : null}
          <SubmitButton pendingLabel="Enregistrement…" className={ctaPrimary}>
            {durationRevealed ? 'Enregistrer' : 'Valider et révéler la durée observée'}
          </SubmitButton>
        </form>
      </div>

      <LiveFeatureComparison items={entry.featureComparison} />
    </div>
  );
}
