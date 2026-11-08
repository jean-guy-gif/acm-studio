'use client';

import { useCallback, useState } from 'react';

import { RemoteImage } from '@/components/ui/remote-image';
import { useLiveTexts } from '@/features/live-seller/components/live-texts';
import { LiveCommentField } from '@/features/live-seller/components/live-comment-field';
import { LiveCompetitorReview } from '@/features/live-seller/components/live-competitor-review';
import { LiveGuessGap } from '@/features/live-seller/components/live-guess-gap';
import {
  choiceCompact,
  fieldLabel,
  panelTight,
  question,
  questionHint,
  screen,
  screenHead,
  statLabel,
} from '@/features/live-seller/components/live-stage';
import { DANGEROUS_REASONS, type SeriousCompetitor } from '@/features/live-seller/constants';
import type { LiveSellerSummary } from '@/features/live-seller/types';
import type {
  AuthorizedSellerComparable,
  SellerComparable,
} from '@/features/live-seller/services/project-live-for-seller';
import { neutralComparableLabel } from '@/features/live-seller/utils/neutral-comparable-label';
import { formatEuro, formatNumber } from '@/lib/format';

// Synthèse — the seller picks the most dangerous competitor among the ones he
// judged serious (yes / unsure). The software records the choice but NEVER
// concludes that this price is a maximum.
// Mission 113 — chaque concurrent montré au Live porte « Revoir », « Non » compris : sa fiche
// s'ouvre en plein écran, en lecture seule, et se referme sur cet écran inchangé.
// Mission 148 — l'écran tient sur la tablette (planche 5) : une carte compacte par concurrent
// sérieux (photo à gauche, libellé, prix révélé, la réponse du vendeur en couleur, « Revoir »),
// jusqu'à trois par rangée, puis les raisons en libellés courts.
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
  const photoTexts = texts.common.photos;
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
  const reviewButton = (entry: SellerComparable, onPhoto = false) => (
    <button
      type="button"
      onClick={() => setReviewedId(entry.id)}
      data-testid="review-competitor"
      className={
        onPhoto
          ? 'absolute bottom-1.5 left-1.5 min-h-8 rounded-lg bg-white/90 px-2.5 py-1 text-sm font-semibold text-brand-deep shadow transition-colors hover:bg-white'
          : 'min-h-8 rounded-lg px-2.5 py-1 text-sm font-medium text-brand-deep underline underline-offset-4 transition-colors hover:text-brand-darker stage:text-white/85 stage:hover:text-white'
      }
    >
      {t.review}
    </button>
  );

  return (
    <div className={screen}>
      <div className={screenHead}>
        <h2 className={question}>{t.question}</h2>
        <p className={questionHint}>{t.hint}</p>
      </div>

      <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-3 md:min-h-0">
        {eligibleComparables.length === 0 ? (
          <p className="text-base text-zinc-500 stage:text-white/60">{t.none}</p>
        ) : (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:landscape:grid-cols-3">
            {eligibleComparables.map((entry) => {
              const label = neutralComparableLabel(entry, language);
              return (
                <div key={entry.id} className="relative">
                  <label className="group grid h-full cursor-pointer grid-cols-[5.5rem_1fr] overflow-hidden rounded-xl border-2 border-zinc-200 bg-white shadow-card transition-all select-none hover:border-brand has-checked:border-brand has-checked:shadow-xl has-checked:shadow-brand/25 stage:border-white/15 stage:bg-white/5 stage:shadow-none stage:hover:border-brand stage:has-checked:border-white stage:has-checked:bg-brand/20">
                    <input
                      type="radio"
                      name="seller_most_dangerous_comparable_id"
                      value={entry.id}
                      defaultChecked={selected === entry.id}
                      className="sr-only"
                    />
                    {entry.photoUrl ? (
                      <RemoteImage
                        src={entry.photoUrl}
                        alt={label}
                        className="h-full min-h-24 w-full object-cover"
                        fallbackClassName="h-full min-h-24 w-full"
                        fallbackLabel={photoTexts.short}
                        eager
                      />
                    ) : (
                      <div className="flex h-full min-h-24 items-center justify-center bg-zinc-50 text-xs text-zinc-500 stage:bg-white/5 stage:text-white/40">
                        {photoTexts.short}
                      </div>
                    )}
                    <div className="flex min-w-0 flex-col gap-0.5 px-3 py-2">
                      <div className="font-title text-sm leading-snug font-semibold text-zinc-900 stage:text-white">
                        {label}
                      </div>
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-title text-lg font-bold text-brand-deep stage:text-white">
                          {euro(entry.price)}
                        </span>
                        {entry.marketDuration?.available && entry.marketDuration.days != null ? (
                          <span className="text-xs text-zinc-500 stage:text-white/50">
                            {texts.live.competitorReview.days(
                              formatNumber(entry.marketDuration.days, { language }),
                            )}
                          </span>
                        ) : null}
                      </div>
                      <LiveGuessGap
                        guess={entry.response?.seller_estimated_listing_price ?? null}
                        listedPrice={entry.price}
                        variant="inline"
                      />
                      {/* L'écran ne montre que les biens jugés sérieux ou incertains (sa consigne le
                          dit) : seul « Incertain » s'écrit sur la carte. */}
                      {entry.response?.seller_serious_competitor === 'unsure' ? (
                        <span className="text-[0.65rem] font-semibold tracking-[0.1em] text-zinc-500 uppercase stage:text-white/50">
                          {t.serious(
                            texts.live.competition.seriousShort[
                              entry.response.seller_serious_competitor as SeriousCompetitor
                            ],
                          )}
                        </span>
                      ) : null}
                    </div>
                  </label>
                  {/* « Revoir », en pastille sur la photo : hors du choix (jamais un clic qui
                      désigne le bien). */}
                  {reviewButton(entry, true)}
                </div>
              );
            })}
          </div>
        )}

        {otherComparables.length > 0 ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className={statLabel}>{t.others}</span>
            {otherComparables.map((entry) => (
              <span
                key={entry.id}
                className="flex items-center gap-1 rounded-lg border border-zinc-200 py-0.5 pl-3 text-sm text-zinc-700 stage:border-white/15 stage:text-white/80"
              >
                {neutralComparableLabel(entry, language)}
                {reviewButton(entry)}
              </span>
            ))}
          </div>
        ) : null}

        <div className={`${panelTight} flex flex-col gap-2`}>
          <fieldset className="flex flex-col gap-2">
            <legend className={`${fieldLabel} mb-1.5`}>{t.why}</legend>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {DANGEROUS_REASONS.map((value) => (
                <label key={value} className={choiceCompact}>
                  <input
                    type="radio"
                    name="seller_most_dangerous_reason"
                    value={value}
                    defaultChecked={reason === value}
                    className="sr-only"
                  />
                  {texts.live.answers.dangerousReasonShort[value]}
                </label>
              ))}
            </div>
          </fieldset>
          <LiveCommentField name="seller_most_dangerous_comment" defaultValue={comment} />
        </div>
      </form>
      {reviewed ? <LiveCompetitorReview entry={reviewed} onClose={closeReview} /> : null}
    </div>
  );
}
