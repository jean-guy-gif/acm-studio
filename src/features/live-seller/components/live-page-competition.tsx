'use client';

import { useLiveTexts } from '@/features/live-seller/components/live-texts';
import { LiveComparableHeader } from '@/features/live-seller/components/live-comparable-header';
import { LiveCommentField } from '@/features/live-seller/components/live-comment-field';
import { LiveFeatureComparison } from '@/features/live-seller/components/live-feature-comparison';
import { LiveGallery } from '@/features/live-seller/components/live-gallery';
import { neutralComparableLabel } from '@/features/live-seller/utils/neutral-comparable-label';
import {
  answerColumn,
  choice,
  fieldLabel,
  panel,
  photoColumn,
  question,
  questionHint,
  screen,
  screenBody,
  screenHead,
} from '@/features/live-seller/components/live-stage';
import { SERIOUS_COMPETITOR_VALUES } from '@/features/live-seller/constants';
import type { SellerComparable } from '@/features/live-seller/services/project-live-for-seller';

// Page 1 — "Est-il un sérieux concurrent ?" NO price, no price/m², no duration, no
// history. Le type projeté interdit tout accès au prix : `entry` n'a pas de champ `price`.
//
// MISSION 51 §3.1 — écran CONTRÔLÉ par le shell : un simple formulaire (valeurs
// pré-remplies depuis la réponse persistée), sans bouton propre. Le shell moissonne ce
// formulaire au clic « Valider et continuer » et enregistre.
// Mission 148 — un écran, sans défiler sur tablette : la photo prend la hauteur qui reste, les
// réponses à côté (paysage) ou dessous (portrait), la grille en bande de pastilles.
export function LivePageCompetition({ entry }: { entry: SellerComparable }) {
  const response = entry.response;
  const currentAnswer = response?.seller_serious_competitor ?? '';
  const currentComment = response?.seller_serious_competitor_comment ?? '';
  const { language, texts } = useLiveTexts();
  const t = texts.live.competition;
  const label = neutralComparableLabel(entry, language);

  return (
    <div className={screen}>
      <div className={screenHead}>
        <h2 className={question}>{t.question}</h2>
        <p className={questionHint}>{t.hint}</p>
      </div>

      <div className={screenBody}>
        <div className={photoColumn}>
          {/* Avant le prix : jamais le titre du portail (il contient le prix), ni dans
              la vignette ni dans le texte alternatif de la photo. Libellé neutre. */}
          <LiveGallery photos={entry.photoUrls} alt={label} fill />
          <LiveComparableHeader heading={label} city={entry.city} district={entry.district} />
        </div>

        <div className={answerColumn}>
          <form onSubmit={(e) => e.preventDefault()} className={`${panel} flex flex-col gap-3`}>
            <fieldset className="flex flex-col gap-2">
              <legend className={`${fieldLabel} mb-2`}>{texts.common.yourAnswer}</legend>
              <div className="grid grid-cols-1 gap-2 md:portrait:grid-cols-3">
                {SERIOUS_COMPETITOR_VALUES.map((value) => (
                  <label key={value} className={choice}>
                    <input
                      type="radio"
                      name="seller_serious_competitor"
                      value={value}
                      defaultChecked={currentAnswer === value}
                      className="sr-only"
                    />
                    {t.serious[value]}
                  </label>
                ))}
              </div>
            </fieldset>
            <LiveCommentField
              name="seller_serious_competitor_comment"
              defaultValue={currentComment}
            />
          </form>
        </div>
      </div>

      <LiveFeatureComparison items={entry.featureComparison} />
    </div>
  );
}
