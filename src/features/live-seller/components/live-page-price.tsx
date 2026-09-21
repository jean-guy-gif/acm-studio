'use client';

import { LiveComparableHeader } from '@/features/live-seller/components/live-comparable-header';
import { neutralComparableLabel } from '@/features/live-seller/utils/neutral-comparable-label';
import { LiveGallery } from '@/features/live-seller/components/live-gallery';
import {
  bigInput,
  bigInputUnit,
  panel,
  question,
  questionHint,
  statLabel,
} from '@/features/live-seller/components/live-stage';
import type { SellerComparable } from '@/features/live-seller/services/project-live-for-seller';

// Screen 2 — "À quel prix ?" The seller commits a guess. The real price stays MASKED
// here: it is revealed only on the next screen. Le verrou vit dans la navigation
// (canAdvanceLivePage garde cet écran sur l'estimation persistée).
//
// MISSION 51 §3.1 — écran CONTRÔLÉ : formulaire nu (valeur pré-remplie depuis la réponse
// persistée), sans bouton propre. Le shell moissonne au « Valider et continuer » et
// LIVRE la révélation (persistance + fragment autorisé) avant d'avancer.
export function LivePagePrice({ entry }: { entry: SellerComparable }) {
  const savedEstimate = entry.response?.seller_estimated_listing_price ?? null;

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <div className="flex flex-col gap-3">
        <h2 className={question}>À quel prix pensez-vous que ce bien est proposé ?</h2>
        <p className={questionHint}>
          Donnez votre estimation : le prix réel s’affichera à l’écran suivant.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_1fr] lg:gap-8">
        <div className="flex flex-col gap-4">
          {/* Le vendeur ESTIME le prix ici : le vrai prix est à l'écran suivant. Aucun
              montant ne doit fuir — ni le titre du portail, ni via le texte alternatif. */}
          <LiveGallery photos={entry.photoUrls} alt={neutralComparableLabel(entry)} />
          <LiveComparableHeader
            heading={neutralComparableLabel(entry)}
            city={entry.city}
            district={entry.district}
          />
        </div>

        <div className="flex h-fit flex-col gap-4">
          <form onSubmit={(e) => e.preventDefault()} className={`${panel} flex flex-col gap-4`}>
            <label className="flex flex-col gap-2">
              <span className={statLabel}>Le prix imaginé par le vendeur</span>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  name="seller_estimated_listing_price"
                  min={0}
                  step="any"
                  placeholder="0"
                  defaultValue={savedEstimate ?? ''}
                  className={bigInput}
                />
                <span className={bigInputUnit}>€</span>
              </div>
            </label>
            <p className="text-sm text-zinc-400 stage:text-white/50">
              Le prix réel n’apparaît pas ici. Passez à l’écran suivant pour le découvrir.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
