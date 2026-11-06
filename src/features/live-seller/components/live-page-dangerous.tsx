'use client';

import { useCallback, useState } from 'react';

import { useLiveTexts } from '@/features/live-seller/components/live-texts';
import { LiveCompetitorReview } from '@/features/live-seller/components/live-competitor-review';
import { LivePhoto } from '@/features/live-seller/components/live-photo';
import {
  choice,
  fieldInput,
  fieldLabel,
  panel,
  question,
  questionHint,
  statLabel,
} from '@/features/live-seller/components/live-stage';
import { DANGEROUS_REASONS, type SeriousCompetitor } from '@/features/live-seller/constants';
import type { LiveSellerSummary } from '@/features/live-seller/types';
import type {
  AuthorizedSellerComparable,
  SellerComparable,
} from '@/features/live-seller/services/project-live-for-seller';
import { neutralComparableLabel } from '@/features/live-seller/utils/neutral-comparable-label';
import { formatEuro, formatSquareMeters } from '@/lib/format';

// Synthèse — the seller picks the most dangerous competitor among the ones he
// judged serious (yes / unsure). The software records the choice but NEVER
// concludes that this price is a maximum.
// Mission 113 — chaque concurrent montré au Live porte « Revoir », « Non » compris : sa fiche
// s'ouvre en plein écran, en lecture seule, et se referme sur cet écran inchangé.
export function LivePageDangerous({
  comparables,
  summary,
}: {
  comparables: SellerComparable[];
  summary: LiveSellerSummary | null;
}) {
  const selected = summary?.seller_most_dangerous_comparable_id ?? '';
  const reason = summary?.seller_most_dangerous_reason ?? '';
  const comment = summary?.seller_most_dangerous_comment ?? '';
  const [reviewedId, setReviewedId] = useState<string | null>(null);
  const { language, texts } = useLiveTexts();
  const t = texts.live.dangerous;
  const euro = (value: number | null): string =>
    value != null ? formatEuro(value, { language }) : '—';
  const closeReview = useCallback(() => setReviewedId(null), []);
  const reviewed = comparables.find((entry) => entry.id === reviewedId) ?? null;
  const eligibleComparables = comparables.filter((entry): entry is AuthorizedSellerComparable => {
    const answer = entry.response?.seller_serious_competitor;
    return entry.authorized && (answer === 'yes' || answer === 'unsure');
  });
  const otherComparables = comparables.filter(
    (entry) => !eligibleComparables.some((eligible) => eligible.id === entry.id),
  );
  const reviewButton = (entry: SellerComparable) => (
    <button
      type="button"
      onClick={() => setReviewedId(entry.id)}
      data-testid="review-competitor"
      className="min-h-11 rounded-xl border border-zinc-300 px-4 py-2 text-base font-medium text-zinc-700 transition-colors hover:border-brand hover:text-brand-deep stage:border-white/25 stage:text-white/85 stage:hover:border-brand stage:hover:text-white"
    >
      {t.review}
    </button>
  );

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <div className="flex flex-col gap-3">
        <h2 className={question}>{t.question}</h2>
        <p className={questionHint}>{t.hint}</p>
      </div>

      <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-6">
        {eligibleComparables.length === 0 ? (
          <p className="text-base text-zinc-500 stage:text-white/60">{t.none}</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {eligibleComparables.map((entry) => (
              <div key={entry.id} className="flex flex-col gap-2">
                <label className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border-2 border-zinc-200 bg-white shadow-card transition-all select-none hover:border-brand has-checked:border-brand has-checked:shadow-xl has-checked:shadow-brand/25 stage:border-white/15 stage:bg-white/5 stage:shadow-none stage:hover:border-brand stage:has-checked:border-brand stage:has-checked:bg-brand/15">
                  <input
                    type="radio"
                    name="seller_most_dangerous_comparable_id"
                    value={entry.id}
                    defaultChecked={selected === entry.id}
                    className="sr-only"
                  />
                  <LivePhoto
                    photoUrl={entry.photoUrl}
                    photoUrls={[]}
                    alt={neutralComparableLabel(entry, language)}
                    compact
                  />
                  <div className="flex flex-col gap-2 p-4">
                    <div className="font-title text-lg leading-snug font-semibold text-zinc-900 stage:text-white">
                      {neutralComparableLabel(entry, language)}
                    </div>
                    <div className="text-sm text-zinc-500 stage:text-white/60">
                      {[entry.district, entry.city].filter(Boolean).join(', ') || t.unknownLocation}
                      {entry.surfaceArea != null
                        ? ` · ${formatSquareMeters(entry.surfaceArea, { language })}`
                        : ''}
                      {entry.roomsCount != null ? ` · ${texts.common.rooms(entry.roomsCount)}` : ''}
                    </div>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-title text-2xl font-bold text-brand-deep stage:text-white">
                        {euro(entry.price)}
                      </span>
                      {entry.marketDuration?.available && entry.marketDuration.days != null ? (
                        <span className="text-xs text-zinc-400 stage:text-white/50">
                          {texts.live.duration.observedSince(entry.marketDuration.days)}
                        </span>
                      ) : null}
                    </div>
                    {entry.response?.seller_estimated_listing_price != null ? (
                      <div className="text-sm text-zinc-500 stage:text-white/60">
                        {t.imagined(euro(entry.response.seller_estimated_listing_price))}
                        {entry.priceReveal.gapAmount != null
                          ? t.gap(
                              formatEuro(entry.priceReveal.gapAmount, { signed: true, language }),
                            )
                          : ''}
                      </div>
                    ) : null}
                    <div className={statLabel}>
                      {t.serious(
                        entry.response?.seller_serious_competitor
                          ? texts.live.competition.serious[
                              entry.response.seller_serious_competitor as SeriousCompetitor
                            ]
                          : t.notGiven,
                      )}
                    </div>
                  </div>
                </label>
                {reviewButton(entry)}
              </div>
            ))}
          </div>
        )}

        {otherComparables.length > 0 ? (
          <div className="flex flex-col gap-3">
            <span className={statLabel}>{t.others}</span>
            <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {otherComparables.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 px-4 py-2 stage:border-white/15"
                >
                  <span className="min-w-0 text-base text-zinc-700 stage:text-white/80">
                    {neutralComparableLabel(entry, language)}
                  </span>
                  {reviewButton(entry)}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className={`${panel} flex flex-col gap-4`}>
          <fieldset className="flex flex-col gap-3">
            <legend className={fieldLabel}>{t.why}</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {DANGEROUS_REASONS.map((value) => (
                <label key={value} className={`${choice} min-h-11 px-3 py-2 text-base font-medium`}>
                  <input
                    type="radio"
                    name="seller_most_dangerous_reason"
                    value={value}
                    defaultChecked={reason === value}
                    className="sr-only"
                  />
                  {texts.live.answers.dangerousReason[value]}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex flex-col gap-1.5">
            <span className={fieldLabel}>{texts.common.commentOptional}</span>
            <textarea
              name="seller_most_dangerous_comment"
              rows={2}
              defaultValue={comment}
              className={fieldInput}
            />
          </label>
        </div>
      </form>
      {reviewed ? <LiveCompetitorReview entry={reviewed} onClose={closeReview} /> : null}
    </div>
  );
}
