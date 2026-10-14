'use client';

import { LiveDurationReveal } from '@/features/live-seller/components/live-duration-reveal';
import { LiveComparableHeader } from '@/features/live-seller/components/live-comparable-header';
import { LiveFeatureComparison } from '@/features/live-seller/components/live-feature-comparison';
import { LiveGallery } from '@/features/live-seller/components/live-gallery';
import { LiveLockedAnswer } from '@/features/live-seller/components/live-locked-answer';
import {
  bigInput,
  bigInputUnit,
  choice,
  fieldInput,
  fieldLabel,
  panel,
  panelSoft,
  question,
  questionHint,
  statLabel,
  statValue,
} from '@/features/live-seller/components/live-stage';
import {
  MARKET_DURATION_REASONS,
  MARKET_DURATION_REASON_LABELS,
  SERIOUS_COMPETITOR_LABELS,
  type SeriousCompetitor,
} from '@/features/live-seller/constants';
import type { AuthorizedSellerComparable } from '@/features/live-seller/services/project-live-for-seller';
import { formatEuro, formatEuroPerSquareMeter, formatNumber } from '@/lib/format';

const euro = (value: number | null): string => (value != null ? formatEuro(value) : '—');

// Page 3 — "Pourquoi est-il toujours sur le marché ?" The seller first GUESSES
// how long the property has been for sale; the observed duration and the price
// drops are only revealed once that estimate is SAVED (M27 invariant), and only
// then comes the "why" discussion.
export function LivePageDuration({
  entry,
  durationRevealed,
}: {
  entry: AuthorizedSellerComparable;
  // Révélée par le shell une fois les jours estimés PERSISTÉS (devine-puis-révèle).
  durationRevealed: boolean;
}) {
  const response = entry.response;
  const currentReason = response?.seller_market_duration_reason ?? '';
  const currentComment = response?.seller_market_duration_comment ?? '';
  const savedEstimatedDays = response?.seller_estimated_days_on_market ?? null;
  // Mission 95 — la durée observée n'arrive du serveur qu'une fois la durée devinée enregistrée.
  const marketDuration = entry.marketDuration;

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
          <LiveComparableHeader
            heading={entry.title ?? 'Bien concurrent'}
            city={entry.city}
            district={entry.district}
          />

          <div className={`${panelSoft} grid grid-cols-2 gap-4 sm:grid-cols-3`}>
            <div>
              <div className={statLabel}>Prix affiché</div>
              <div className={statValue}>{euro(entry.price)}</div>
            </div>
            <div>
              <div className={statLabel}>Prix au m²</div>
              <div className={statValue}>
                {entry.pricePerSquareMeter != null
                  ? formatEuroPerSquareMeter(entry.pricePerSquareMeter)
                  : '—'}
              </div>
            </div>
            <div>
              <div className={statLabel}>Votre réponse</div>
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

        <form onSubmit={(e) => e.preventDefault()} className={`${panel} flex h-fit flex-col gap-4`}>
          {/* Mission 92 — la durée devinée ne se donne qu'une fois : révélée, elle se relit. */}
          {savedEstimatedDays != null ? (
            <LiveLockedAnswer
              value={`${formatNumber(savedEstimatedDays)}\u00A0jour${savedEstimatedDays > 1 ? 's' : ''}`}
            />
          ) : (
            <label className="flex flex-col gap-2">
              <span className={statLabel}>La durée que vous imaginez</span>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  name="seller_estimated_days_on_market"
                  min={0}
                  step={1}
                  placeholder="90"
                  className={bigInput}
                />
                <span className={bigInputUnit}>jours</span>
              </div>
            </label>
          )}

          {durationRevealed && marketDuration ? (
            <div className="live-reveal-pop flex flex-col gap-4">
              <LiveDurationReveal
                marketDuration={marketDuration}
                priceHistory={entry.priceHistory}
                estimatedDays={savedEstimatedDays}
              />

              <fieldset className="flex flex-col gap-3">
                <legend className={fieldLabel}>Selon vous, pourquoi ?</legend>
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
              Donnez d’abord votre réponse : la durée réellement observée s’affichera ensuite.
            </p>
          )}
        </form>
      </div>

      <LiveFeatureComparison items={entry.featureComparison} />
    </div>
  );
}
