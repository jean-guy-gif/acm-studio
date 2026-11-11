'use client';

import { useEffect } from 'react';

import { useLiveTexts } from '@/features/live-seller/components/live-texts';
import { LiveFeatureComparison } from '@/features/live-seller/components/live-feature-comparison';
import { LiveGallery } from '@/features/live-seller/components/live-gallery';
import { LiveGuessGap } from '@/features/live-seller/components/live-guess-gap';
import { LiveListingButton } from '@/features/live-seller/components/live-listing';
import { ctaPrimary, statLabel, statValue } from '@/features/live-seller/components/live-stage';
import { competitorReviewFacts } from '@/features/live-seller/services/competitor-review';
import type { SellerComparable } from '@/features/live-seller/services/project-live-for-seller';
import { neutralComparableLabel } from '@/features/live-seller/utils/neutral-comparable-label';
import { formatEuro, formatEuroPerSquareMeter, formatNumber } from '@/lib/format';

// Mission 113 — « Revoir » : la fiche d'un concurrent, en plein écran du Live, pour le retrouver
// avant de désigner le plus dangereux. Lecture seule : aucun champ, aucune écriture, aucune
// adresse ni écran gardé — « Fermer » rend l'écran du plus dangereux tel qu'il était.
// Le concurrent se nomme par son libellé neutre (M107) ; prix et durée selon competitorReviewFacts.
export function LiveCompetitorReview({
  entry,
  onClose,
}: {
  entry: SellerComparable;
  onClose: () => void;
}) {
  const facts = competitorReviewFacts(entry);
  const { language, texts } = useLiveTexts();
  const t = texts.live.competitorReview;
  const label = neutralComparableLabel(entry, language);
  const photos =
    entry.photoUrls.length > 0 ? entry.photoUrls : entry.photoUrl ? [entry.photoUrl] : [];

  // Le shell suspend ses flèches tant que la fiche est ouverte ; Échap la ferme. La visionneuse
  // de photos, ouverte par-dessus, prend le clavier en phase de capture et passe avant.
  useEffect(() => {
    document.body.dataset.review = 'open';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && document.body.dataset.lightbox !== 'open') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      delete document.body.dataset.review;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      data-testid="competitor-review"
      className="fixed inset-0 z-[45] overflow-x-hidden overflow-y-auto bg-white stage:bg-brand-deep"
    >
      {/* Mission 148 — sur tablette, la fiche tient dans la fenêtre : la photo prend ce qui reste. */}
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-5 sm:px-8 md:h-full md:min-h-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <span className={statLabel}>{t.competitor(entry.position)}</span>
            <h2 className="font-title text-2xl leading-snug font-semibold text-zinc-900 sm:text-3xl stage:text-white">
              {label}
            </h2>
          </div>
          <button type="button" onClick={onClose} className={`${ctaPrimary} shrink-0`}>
            {t.close}
          </button>
        </div>

        <LiveGallery photos={photos} alt={label} fill />

        <LiveFeatureComparison items={entry.featureComparison} />

        {facts.price != null ? (
          <div
            className="flex shrink-0 flex-wrap items-start gap-x-8 gap-y-3"
            data-testid="competitor-review-price"
          >
            <dl className="flex flex-wrap gap-x-8 gap-y-3">
              <div>
                <dt className={statLabel}>{t.listed}</dt>
                <dd className={statValue}>{formatEuro(facts.price, { language })}</dd>
              </div>
              {facts.pricePerSquareMeter != null ? (
                <div>
                  <dt className={statLabel}>{t.perSqm}</dt>
                  <dd className={statValue}>
                    {formatEuroPerSquareMeter(facts.pricePerSquareMeter, { language })}
                  </dd>
                </div>
              ) : null}
              {facts.marketDays != null ? (
                <div>
                  <dt className={statLabel}>{t.since}</dt>
                  <dd className={statValue}>
                    {t.days(formatNumber(facts.marketDays, { language }))}
                  </dd>
                </div>
              ) : null}
            </dl>
            {/* Mission 148 — sa réponse au prix, en couleur, comme à la révélation. */}
            <LiveGuessGap
              guess={entry.response?.seller_estimated_listing_price ?? null}
              listedPrice={facts.price}
            />
            {entry.authorized ? <LiveListingButton entry={entry} /> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
