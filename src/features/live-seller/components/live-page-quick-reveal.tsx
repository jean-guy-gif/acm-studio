'use client';

import { useLiveTexts } from '@/features/live-seller/components/live-texts';

import { LiveComparableHeader } from '@/features/live-seller/components/live-comparable-header';
import { LiveDurationReveal } from '@/features/live-seller/components/live-duration-reveal';
import { LiveGallery } from '@/features/live-seller/components/live-gallery';
import {
  bigInput,
  bigInputUnit,
  bigValue,
  panel,
  question,
  questionHint,
  revealValue,
  statLabel,
} from '@/features/live-seller/components/live-stage';
import type { AuthorizedSellerComparable } from '@/features/live-seller/services/project-live-for-seller';
import { neutralComparableLabel } from '@/features/live-seller/utils/neutral-comparable-label';
import { formatEuro, formatPercent } from '@/lib/format';

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
    <div className="flex flex-col gap-5 sm:gap-6">
      <div className="flex flex-col gap-2">
        <h2 className={question}>{t.revealQuestion}</h2>
        <p className={questionHint}>
          {!entry.durationKnown ? t.priceOnly : durationRevealed ? t.durationShown : t.durationAsk}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
        <div className="flex min-w-0 flex-col gap-3">
          <LiveGallery photos={entry.photoUrls} alt={title} />
          <LiveComparableHeader heading={title} city={entry.city} district={entry.district} />
        </div>

        <div className="flex h-fit min-w-0 flex-col gap-4">
          <div className={`${panel} live-reveal-pop flex flex-col gap-4`} data-quick-reveal>
            <div>
              <div className={statLabel}>{texts.live.priceReveal.listed}</div>
              <div className={revealValue}>{euro(reveal.currentPrice)}</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className={statLabel}>{texts.common.yourAnswer}</div>
                <div className={bigValue}>{euro(savedEstimate)}</div>
              </div>
              <div>
                <div className={statLabel}>{texts.live.priceReveal.gap}</div>
                <div className={bigValue}>
                  {reveal.gapAmount != null
                    ? formatEuro(reveal.gapAmount, { signed: true, language })
                    : '—'}
                </div>
                {reveal.gapPercentage != null ? (
                  <div className="text-sm text-zinc-500 stage:text-white/60">
                    {formatPercent(reveal.gapPercentage, { signed: true, language })}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {entry.durationKnown ? (
            <form
              onSubmit={(e) => e.preventDefault()}
              className={`${panel} flex flex-col gap-4`}
              data-quick-duration
            >
              {durationRevealed && entry.marketDuration ? (
                <div className="live-reveal-pop flex flex-col gap-4">
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
