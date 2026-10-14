'use client';

import { LiveComparableHeader } from '@/features/live-seller/components/live-comparable-header';
import { LiveFeatureComparison } from '@/features/live-seller/components/live-feature-comparison';
import { LiveGallery } from '@/features/live-seller/components/live-gallery';
import { LiveLockedAnswer } from '@/features/live-seller/components/live-locked-answer';
import {
  bigInput,
  bigInputUnit,
  choice,
  fieldLabel,
  panel,
  question,
  questionHint,
  statLabel,
} from '@/features/live-seller/components/live-stage';
import {
  SERIOUS_COMPETITOR_LABELS,
  SERIOUS_COMPETITOR_VALUES,
} from '@/features/live-seller/constants';
import type { SellerComparable } from '@/features/live-seller/services/project-live-for-seller';
import { neutralComparableLabel } from '@/features/live-seller/utils/neutral-comparable-label';
import { formatEuro } from '@/lib/format';

// MISSION 95 — rythme accéléré, écran 1 sur 2 (à partir du 4e concurrent) : la fiche du
// concurrent, la question du sérieux et la devinette du prix, sur le MÊME écran. Le vendeur a
// déjà compris le principe sur les trois premiers ; on ne lui fait plus tourner trois pages.
//
// AUCUN prix ici : `entry` est la donnée projetée (pas de champ `price` tant que la devinette
// n'est pas enregistrée), et le libellé est le libellé NEUTRE, jamais le titre du portail.
// Écran contrôlé par le shell : un formulaire nu, « Valider » enregistre les deux réponses.
// La devinette, une fois donnée, se relit sans champ de saisie (M92).
export function LivePageQuickGuess({ entry }: { entry: SellerComparable }) {
  const response = entry.response;
  const currentAnswer = response?.seller_serious_competitor ?? '';
  const savedEstimate = response?.seller_estimated_listing_price ?? null;
  const label = neutralComparableLabel(entry);

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <div className="flex flex-col gap-2">
        <h2 className={question}>Un sérieux concurrent ? Et à quel prix, selon vous ?</h2>
        <p className={questionHint}>
          {savedEstimate != null
            ? 'Votre réponse est notée : elle ne se modifie plus.'
            : 'Regardez ce bien comme le ferait un acheteur, puis donnez le prix que vous imaginez.'}
        </p>
      </div>

      {/* Deux colonnes dès la tablette : la devinette reste à l'écran, à côté de la fiche. */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
        <div className="flex min-w-0 flex-col gap-3">
          <LiveGallery photos={entry.photoUrls} alt={label} />
          <LiveComparableHeader heading={label} city={entry.city} district={entry.district} />
        </div>

        <form
          onSubmit={(e) => e.preventDefault()}
          className={`${panel} flex h-fit min-w-0 flex-col gap-5`}
          data-quick-guess
        >
          <fieldset className="flex flex-col gap-2.5">
            <legend className={fieldLabel}>Est-il un sérieux concurrent pour votre bien ?</legend>
            <div className="flex flex-col gap-2">
              {SERIOUS_COMPETITOR_VALUES.map((value) => (
                <label key={value} className={`${choice} min-h-11 px-3 py-2 text-base font-medium`}>
                  <input
                    type="radio"
                    name="seller_serious_competitor"
                    value={value}
                    defaultChecked={currentAnswer === value}
                    className="sr-only"
                    onChange={(event) => {
                      // Mission 104 — « Non » dispense de deviner : un prix déjà tapé s'efface.
                      if (value !== 'no') return;
                      const price = event.currentTarget.form?.elements.namedItem(
                        'seller_estimated_listing_price',
                      );
                      if (price instanceof HTMLInputElement) price.value = '';
                    }}
                  />
                  {SERIOUS_COMPETITOR_LABELS[value]}
                </label>
              ))}
            </div>
          </fieldset>

          {savedEstimate != null ? (
            <LiveLockedAnswer value={formatEuro(savedEstimate)} />
          ) : (
            <label className="flex flex-col gap-2">
              <span className={statLabel}>Le prix que vous imaginez</span>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  name="seller_estimated_listing_price"
                  min={0}
                  step="any"
                  placeholder="0"
                  defaultValue=""
                  className={bigInput}
                />
                <span className={bigInputUnit}>€</span>
              </div>
              <span className="text-sm text-zinc-400 stage:text-white/50">
                Le prix réel s’affichera à l’écran suivant.
              </span>
            </label>
          )}
        </form>
      </div>

      <LiveFeatureComparison items={entry.featureComparison} />
    </div>
  );
}
