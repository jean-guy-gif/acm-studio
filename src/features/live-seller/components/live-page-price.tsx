'use client';

import { useLiveTexts } from '@/features/live-seller/components/live-texts';
import { LiveComparableHeader } from '@/features/live-seller/components/live-comparable-header';
import { neutralComparableLabel } from '@/features/live-seller/utils/neutral-comparable-label';
import { LiveGallery } from '@/features/live-seller/components/live-gallery';
import { LiveLockedAnswer } from '@/features/live-seller/components/live-locked-answer';
import {
  bigInput,
  bigInputUnit,
  panel,
  question,
  questionHint,
  statLabel,
} from '@/features/live-seller/components/live-stage';
import type { SellerComparable } from '@/features/live-seller/services/project-live-for-seller';
import { formatEuro } from '@/lib/format';
import { PriceInput } from '@/features/live-seller/components/price-input';

// Screen 2 — "À quel prix ?" The seller commits a guess. The real price stays MASKED
// here: it is revealed only on the next screen. Le verrou vit dans la navigation
// (canAdvanceLivePage garde cet écran sur l'estimation persistée).
//
// MISSION 51 §3.1 — écran CONTRÔLÉ : formulaire nu (valeur pré-remplie depuis la réponse
// persistée), sans bouton propre. Le shell moissonne au « Valider et continuer » et
// LIVRE la révélation (persistance + fragment autorisé) avant d'avancer.
//
// MISSION 92 — la devinette ne se donne qu'une fois : enregistrée, elle se relit ici, sans
// champ de saisie (la base la fige de toute façon).
export function LivePagePrice({ entry }: { entry: SellerComparable }) {
  const savedEstimate = entry.response?.seller_estimated_listing_price ?? null;
  const { language, texts } = useLiveTexts();
  const t = texts.live.price;
  const label = neutralComparableLabel(entry, language);

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <div className="flex flex-col gap-3">
        <h2 className={question}>{t.question}</h2>
        <p className={questionHint}>{savedEstimate != null ? t.savedHint : t.hint}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_1fr] lg:gap-8">
        <div className="flex flex-col gap-4">
          {/* Le vendeur ESTIME le prix ici : le vrai prix est à l'écran suivant. Aucun
              montant ne doit fuir — ni le titre du portail, ni via le texte alternatif. */}
          <LiveGallery photos={entry.photoUrls} alt={label} />
          <LiveComparableHeader heading={label} city={entry.city} district={entry.district} />
        </div>

        <div className="flex h-fit flex-col gap-4">
          {savedEstimate != null ? (
            <div className={`${panel} flex flex-col gap-4`}>
              <LiveLockedAnswer value={formatEuro(savedEstimate, { language })} />
            </div>
          ) : (
            <form onSubmit={(e) => e.preventDefault()} className={`${panel} flex flex-col gap-4`}>
              <label className="flex flex-col gap-2">
                <span className={statLabel}>{t.label}</span>
                <div className="flex items-center gap-3">
                  <PriceInput
                    name="seller_estimated_listing_price"
                    language={language}
                    required
                    defaultValue={savedEstimate}
                    className={bigInput}
                  />
                  <span className={bigInputUnit}>€</span>
                </div>
              </label>
              <p className="text-sm text-zinc-500 stage:text-white/50">{t.note}</p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
