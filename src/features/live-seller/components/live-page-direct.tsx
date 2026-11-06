'use client';

import { useLiveTexts } from '@/features/live-seller/components/live-texts';

import { LiveComparableHeader } from '@/features/live-seller/components/live-comparable-header';
import { LiveDurationReveal } from '@/features/live-seller/components/live-duration-reveal';
import { LiveFeatureComparison } from '@/features/live-seller/components/live-feature-comparison';
import { LiveGallery } from '@/features/live-seller/components/live-gallery';
import {
  panel,
  question,
  questionHint,
  revealValue,
  statLabel,
  statValue,
} from '@/features/live-seller/components/live-stage';
import type { SellerComparable } from '@/features/live-seller/services/project-live-for-seller';
import { neutralComparableLabel } from '@/features/live-seller/utils/neutral-comparable-label';
import { formatEuro, formatEuroPerSquareMeter } from '@/lib/format';

// Mission 131 — présentation directe : un écran par concurrent, rien n'est demandé au vendeur. Le
// conseiller commente le bien, sa grille face au vôtre, son prix affiché et son temps de vente.
//
// La garde reste de DONNÉE (M51) : le prix n'est livré par le serveur qu'une fois le fait « montré
// en directe » enregistré ; tant qu'il ne l'est pas, l'écran montre le bien sans aucun montant.
export function LivePageDirect({ entry }: { entry: SellerComparable }) {
  const { language, texts } = useLiveTexts();
  const t = texts.live.direct;
  const title = neutralComparableLabel(entry, language);
  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <div className="flex flex-col gap-2">
        <h2 className={question}>{t.question}</h2>
        <p className={questionHint}>{t.hint}</p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
        <div className="flex min-w-0 flex-col gap-3">
          <LiveGallery photos={entry.photoUrls} alt={title} />
          <LiveComparableHeader heading={title} city={entry.city} district={entry.district} />
        </div>

        <div className="flex h-fit min-w-0 flex-col gap-4">
          {entry.authorized ? (
            <div className={`${panel} live-reveal-pop flex flex-col gap-4`} data-direct-price>
              <div>
                <div className={statLabel}>{texts.live.priceReveal.listed}</div>
                <div className={revealValue}>
                  {formatEuro(entry.priceReveal.currentPrice, { language })}
                </div>
              </div>
              {entry.priceReveal.pricePerSquareMeter != null ? (
                <div>
                  <div className={statLabel}>{texts.live.priceReveal.perSqm}</div>
                  <div className={statValue}>
                    {formatEuroPerSquareMeter(entry.priceReveal.pricePerSquareMeter, { language })}
                  </div>
                </div>
              ) : null}
              {entry.marketDuration?.available ? (
                <LiveDurationReveal
                  marketDuration={entry.marketDuration}
                  priceHistory={entry.priceHistory}
                  estimatedDays={null}
                />
              ) : null}
            </div>
          ) : (
            <div className={`${panel} flex flex-col gap-2`} aria-busy="true">
              <div className={statLabel}>{texts.live.priceReveal.listed}</div>
              <div className="h-10 w-48 animate-pulse rounded-lg bg-zinc-200 stage:bg-white/10" />
            </div>
          )}
        </div>
      </div>

      <LiveFeatureComparison items={entry.featureComparison} />
    </div>
  );
}
