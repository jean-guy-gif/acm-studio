'use client';

import { useLiveTexts } from '@/features/live-seller/components/live-texts';

import { LiveComparableHeader } from '@/features/live-seller/components/live-comparable-header';
import { LiveDurationReveal } from '@/features/live-seller/components/live-duration-reveal';
import { LiveGallery } from '@/features/live-seller/components/live-gallery';
import { LiveGuessGap } from '@/features/live-seller/components/live-guess-gap';
import { LiveListingButton } from '@/features/live-seller/components/live-listing';
import {
  answerColumn,
  bigInput,
  bigInputUnit,
  panel,
  photoColumn,
  question,
  questionHint,
  revealValue,
  screen,
  screenBody,
  screenHead,
  statLabel,
} from '@/features/live-seller/components/live-stage';
import type { AuthorizedSellerComparable } from '@/features/live-seller/services/project-live-for-seller';
import { neutralComparableLabel } from '@/features/live-seller/utils/neutral-comparable-label';
import { formatEuro } from '@/lib/format';

// MISSION 95 — rythme accéléré, écran 2 sur 2 : le prix réel et l'écart avec votre estimation.
// Quand une durée est connue, la devinette de durée vient dessous ; une fois validée, la durée
// observée s'affiche À SA PLACE, sans changer d'écran.
//
// Deux gardes, toutes deux côté serveur : cet écran n'est atteint qu'avec la devinette du prix
// enregistrée (`entry` est alors « autorisé », prix compris), et la durée observée n'arrive du
// serveur qu'une fois la durée devinée enregistrée (`entry.marketDuration` est null avant).
export function LivePageQuickReveal({ entry }: { entry: AuthorizedSellerComparable }) {
  const response = entry.response;
  const reveal = entry.priceReveal;
  const savedEstimate = response?.seller_estimated_listing_price ?? null;
  const savedDays = response?.seller_estimated_days_on_market ?? null;
  const durationRevealed = savedDays != null && entry.marketDuration != null;
  const { language, texts } = useLiveTexts();
  const t = texts.live.quick;
  const euro = (value: number | null): string =>
    value != null ? formatEuro(value, { language }) : '—';
  const title = neutralComparableLabel(entry, language);

  return (
    <div className={screen}>
      <div className={screenHead}>
        <h2 className={question}>{t.revealQuestion}</h2>
        <p className={questionHint}>
          {!entry.durationKnown ? t.priceOnly : durationRevealed ? t.durationShown : t.durationAsk}
        </p>
      </div>

      <div className={screenBody}>
        <div className={photoColumn}>
          <LiveGallery photos={entry.photoUrls} alt={title} fill />
          <LiveComparableHeader heading={title} city={entry.city} district={entry.district} />
        </div>

        <div className={answerColumn}>
          <div className={`${panel} live-reveal-pop flex flex-col gap-3`} data-quick-reveal>
            <div>
              <div className={statLabel}>{texts.live.priceReveal.listed}</div>
              <div className={revealValue}>{euro(reveal.currentPrice)}</div>
            </div>
            <LiveGuessGap guess={savedEstimate} listedPrice={reveal.currentPrice} />
            <LiveListingButton entry={entry} />
          </div>

          {entry.durationKnown ? (
            <form
              onSubmit={(e) => e.preventDefault()}
              className={`${panel} flex flex-col gap-3`}
              data-quick-duration
            >
              {durationRevealed && entry.marketDuration ? (
                <div className="live-reveal-pop flex flex-col gap-2">
                  <LiveDurationReveal
                    marketDuration={entry.marketDuration}
                    priceHistory={entry.priceHistory}
                    estimatedDays={savedDays}
                  />
                </div>
              ) : (
                <label className="flex flex-col gap-2">
                  <span className={statLabel}>{texts.live.duration.label}</span>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      name="seller_estimated_days_on_market"
                      min={0}
                      step={1}
                      placeholder="90"
                      className={bigInput}
                    />
                    <span className={bigInputUnit}>{texts.live.duration.unit}</span>
                  </div>
                  <span className="text-sm text-zinc-500 stage:text-white/50">
                    {t.durationNote}
                  </span>
                </label>
              )}
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}
