'use client';

import { useEffect } from 'react';

import { LiveFeatureComparison } from '@/features/live-seller/components/live-feature-comparison';
import { LiveGallery } from '@/features/live-seller/components/live-gallery';
import { ctaPrimary, statLabel, statValue } from '@/features/live-seller/components/live-stage';
import { competitorReviewFacts } from '@/features/live-seller/services/competitor-review';
import type { SellerComparable } from '@/features/live-seller/services/project-live-for-seller';
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
      aria-label={entry.neutralLabel}
      data-testid="competitor-review"
      className="fixed inset-0 z-[45] overflow-x-hidden overflow-y-auto bg-white stage:bg-brand-deep"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-5 sm:px-8 sm:py-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <span className={statLabel}>Concurrent {entry.position}</span>
            <h2 className="font-title text-2xl leading-snug font-semibold text-zinc-900 sm:text-3xl stage:text-white">
              {entry.neutralLabel}
            </h2>
          </div>
          <button type="button" onClick={onClose} className={`${ctaPrimary} shrink-0`}>
            Fermer
          </button>
        </div>

        <LiveGallery photos={photos} alt={entry.neutralLabel} />

        <LiveFeatureComparison items={entry.featureComparison} />

        {facts.price != null ? (
          <dl
            className="grid grid-cols-1 gap-3 sm:grid-cols-3"
            data-testid="competitor-review-price"
          >
            <div>
              <dt className={statLabel}>Prix affiché</dt>
              <dd className={statValue}>{formatEuro(facts.price)}</dd>
            </div>
            {facts.pricePerSquareMeter != null ? (
              <div>
                <dt className={statLabel}>Prix au m²</dt>
                <dd className={statValue}>{formatEuroPerSquareMeter(facts.pricePerSquareMeter)}</dd>
              </div>
            ) : null}
            {facts.marketDays != null ? (
              <div>
                <dt className={statLabel}>En vente depuis</dt>
                <dd className={statValue}>{formatNumber(facts.marketDays)} jours</dd>
              </div>
            ) : null}
          </dl>
        ) : null}
      </div>
    </div>
  );
}
