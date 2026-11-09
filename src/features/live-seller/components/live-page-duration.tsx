'use client';

import { useLiveTexts } from '@/features/live-seller/components/live-texts';

import { LiveDurationReveal } from '@/features/live-seller/components/live-duration-reveal';
import { LiveComparableHeader } from '@/features/live-seller/components/live-comparable-header';
import { LiveCommentField } from '@/features/live-seller/components/live-comment-field';
import { LiveFeatureComparison } from '@/features/live-seller/components/live-feature-comparison';
import { LiveGallery } from '@/features/live-seller/components/live-gallery';
import { LiveGuessGap } from '@/features/live-seller/components/live-guess-gap';
import { LiveLockedAnswer } from '@/features/live-seller/components/live-locked-answer';
import {
  answerColumn,
  bigInput,
  bigInputUnit,
  choiceCompact,
  fieldLabel,
  panel,
  photoColumn,
  question,
  questionHint,
  screen,
  screenBody,
  screenHead,
  statLabel,
} from '@/features/live-seller/components/live-stage';
import { MARKET_DURATION_REASONS, type SeriousCompetitor } from '@/features/live-seller/constants';
import type { AuthorizedSellerComparable } from '@/features/live-seller/services/project-live-for-seller';
import { neutralComparableLabel } from '@/features/live-seller/utils/neutral-comparable-label';
import { formatEuro, formatEuroPerSquareMeter } from '@/lib/format';

// Page 3 — "Pourquoi est-il toujours sur le marché ?" The seller first GUESSES
// how long the property has been for sale; the observed duration and the price
// drops are only revealed once that estimate is SAVED (M27 invariant), and only
// then comes the "why" discussion.
// Mission 148 — l'écran le plus long du Live tient sur la tablette (planche 4) : le rappel des
// prix en une ligne sous le libellé (la réponse au prix en couleur), la grille en pastilles sous la
// photo ; à droite les deux durées côte à côte, les raisons en boutons compacts.
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
  const { language, texts } = useLiveTexts();
  const t = texts.live.duration;
  const label = neutralComparableLabel(entry, language);
  const serious = response?.seller_serious_competitor
    ? texts.live.competition.serious[response.seller_serious_competitor as SeriousCompetitor]
    : t.notGiven;

  return (
    <div className={screen}>
      <div className={screenHead}>
        <h2 className={question}>{t.question}</h2>
        <p className={questionHint}>{durationRevealed ? t.revealedHint : t.hint}</p>
      </div>

      <div className={screenBody}>
        <div className={photoColumn}>
          <LiveGallery photos={entry.photoUrls} alt={label} fill />
          <LiveComparableHeader heading={label} city={entry.city} district={entry.district} />
          {/* Le rappel du prix : affiché, au m², la réponse du vendeur en couleur, son « sérieux ». */}
          <div className="flex shrink-0 flex-col gap-0.5 text-sm text-zinc-600 stage:text-white/75">
            <span className="flex flex-wrap gap-x-3">
              <span>
                <span className={statLabel}>{t.listed}</span>{' '}
                <b className="font-title text-zinc-900 stage:text-white">
                  {entry.price != null ? formatEuro(entry.price, { language }) : '—'}
                </b>
              </span>
              {entry.pricePerSquareMeter != null ? (
                <span>
                  <span className={statLabel}>{t.perSqm}</span>{' '}
                  <b className="font-title text-zinc-900 stage:text-white">
                    {formatEuroPerSquareMeter(entry.pricePerSquareMeter, { language })}
                  </b>
                </span>
              ) : null}
              <span>
                <span className={statLabel}>{t.serious}</span>{' '}
                <b className="font-title text-zinc-900 stage:text-white">{serious}</b>
              </span>
            </span>
            <LiveGuessGap
              guess={response?.seller_estimated_listing_price ?? null}
              listedPrice={entry.price}
              variant="inline"
            />
          </div>
          <LiveFeatureComparison items={entry.featureComparison} narrow />
        </div>

        <form onSubmit={(e) => e.preventDefault()} className={answerColumn}>
          <div className={`${panel} flex flex-col gap-3`}>
            {durationRevealed && marketDuration ? (
              <div className="live-reveal-pop flex flex-col gap-2">
                <LiveDurationReveal
                  marketDuration={marketDuration}
                  priceHistory={entry.priceHistory}
                  estimatedDays={savedEstimatedDays}
                />
              </div>
            ) : savedEstimatedDays != null ? (
              // Mission 92 — la durée devinée ne se donne qu'une fois : révélée, elle se relit.
              <LiveLockedAnswer value={t.days(savedEstimatedDays)} />
            ) : (
              <label className="flex flex-col gap-2">
                <span className={statLabel}>{t.label}</span>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    name="seller_estimated_days_on_market"
                    min={0}
                    step={1}
                    placeholder="90"
                    className={bigInput}
                  />
                  <span className={bigInputUnit}>{t.unit}</span>
                </div>
              </label>
            )}
            {durationRevealed && marketDuration ? null : (
              <p className="text-sm text-zinc-500 stage:text-white/50">{t.answerFirst}</p>
            )}
          </div>

          {durationRevealed && marketDuration ? (
            <div className={`${panel} live-reveal-pop flex flex-col gap-3`}>
              <fieldset className="flex flex-col gap-2">
                <legend className={`${fieldLabel} mb-2`}>{t.why}</legend>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:portrait:grid-cols-4">
                  {MARKET_DURATION_REASONS.map((reason) => (
                    <label key={reason} className={choiceCompact}>
                      <input
                        type="radio"
                        name="seller_market_duration_reason"
                        value={reason}
                        defaultChecked={currentReason === reason}
                        className="sr-only"
                      />
                      {texts.live.answers.durationReason[reason]}
                    </label>
                  ))}
                </div>
              </fieldset>
              <LiveCommentField
                name="seller_market_duration_comment"
                defaultValue={currentComment}
              />
            </div>
          ) : null}
        </form>
      </div>
    </div>
  );
}
