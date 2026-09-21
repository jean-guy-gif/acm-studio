'use client';

import { LiveComparableHeader } from '@/features/live-seller/components/live-comparable-header';
import { LiveFeatureComparison } from '@/features/live-seller/components/live-feature-comparison';
import { LiveGallery } from '@/features/live-seller/components/live-gallery';
import { neutralComparableLabel } from '@/features/live-seller/utils/neutral-comparable-label';
import {
  choice,
  fieldInput,
  fieldLabel,
  panel,
  question,
  questionHint,
} from '@/features/live-seller/components/live-stage';
import {
  SERIOUS_COMPETITOR_LABELS,
  SERIOUS_COMPETITOR_VALUES,
} from '@/features/live-seller/constants';
import type { SellerComparable } from '@/features/live-seller/services/project-live-for-seller';

// Page 1 — "Est-il un sérieux concurrent ?" NO price, no price/m², no duration, no
// history. Le type projeté interdit tout accès au prix : `entry` n'a pas de champ `price`.
//
// MISSION 51 §3.1 — écran CONTRÔLÉ par le shell : un simple formulaire (valeurs
// pré-remplies depuis la réponse persistée), sans bouton propre. Le shell moissonne ce
// formulaire au clic « Valider et continuer » et enregistre.
export function LivePageCompetition({ entry }: { entry: SellerComparable }) {
  const response = entry.response;
  const currentAnswer = response?.seller_serious_competitor ?? '';
  const currentComment = response?.seller_serious_competitor_comment ?? '';

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <div className="flex flex-col gap-3">
        <h2 className={question}>Est-il un sérieux concurrent pour votre bien ?</h2>
        <p className={questionHint}>
          Observez le bien comme le ferait un acheteur — son prix viendra ensuite.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_1fr] lg:gap-8">
        <div className="flex flex-col gap-4">
          {/* Avant le prix : jamais le titre du portail (il contient le prix), ni dans
              la vignette ni dans le texte alternatif de la photo. Libellé neutre. */}
          <LiveGallery photos={entry.photoUrls} alt={neutralComparableLabel(entry)} />
          <LiveComparableHeader
            heading={neutralComparableLabel(entry)}
            city={entry.city}
            district={entry.district}
          />
        </div>

        <form onSubmit={(e) => e.preventDefault()} className={`${panel} flex h-fit flex-col gap-4`}>
          <fieldset className="flex flex-col gap-3">
            <legend className={fieldLabel}>La réponse du vendeur</legend>
            <div className="flex flex-col gap-3">
              {SERIOUS_COMPETITOR_VALUES.map((value) => (
                <label key={value} className={choice}>
                  <input
                    type="radio"
                    name="seller_serious_competitor"
                    value={value}
                    defaultChecked={currentAnswer === value}
                    className="sr-only"
                  />
                  {SERIOUS_COMPETITOR_LABELS[value]}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="flex flex-col gap-1.5">
            <span className={fieldLabel}>Commentaire (facultatif)</span>
            <textarea
              name="seller_serious_competitor_comment"
              rows={2}
              defaultValue={currentComment}
              className={fieldInput}
            />
          </label>
        </form>
      </div>

      <LiveFeatureComparison items={entry.featureComparison} />
    </div>
  );
}
