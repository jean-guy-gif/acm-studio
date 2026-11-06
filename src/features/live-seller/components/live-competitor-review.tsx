'use client';

import { useEffect } from 'react';

import { useLiveTexts } from '@/features/live-seller/components/live-texts';
import { LiveFeatureComparison } from '@/features/live-seller/components/live-feature-comparison';
import { LiveGallery } from '@/features/live-seller/components/live-gallery';
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
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-5 sm:px-8 sm:py-8">
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

        <LiveGallery photos={photos} alt={label} />

        <LiveFeatureComparison items={entry.featureComparison} />

        {facts.price != null ? (
          <dl
            className="grid grid-cols-1 gap-3 sm:grid-cols-3"
            data-testid="competitor-review-price"
          >
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
        ) : null}
      </div>
    </div>
  );
}
