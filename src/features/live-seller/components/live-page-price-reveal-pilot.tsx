'use client';

import {
  answerColumn,
  choiceCompact,
  fieldLabel,
  panel,
  photoColumn,
  question,
  questionHint,
  revealValue,
  screen,
  screenBody,
  screenHead,
  statLabel,
  statValue,
} from '@/features/live-seller/components/live-stage';
import { LiveComparableHeader } from '@/features/live-seller/components/live-comparable-header';
import { LiveCommentField } from '@/features/live-seller/components/live-comment-field';
import { LiveGallery } from '@/features/live-seller/components/live-gallery';
import { LiveGuessGap } from '@/features/live-seller/components/live-guess-gap';
import { LiveListingButton } from '@/features/live-seller/components/live-listing';
import { neutralComparableLabel } from '@/features/live-seller/utils/neutral-comparable-label';
import { PRICE_COHERENCE_VALUES } from '@/features/live-seller/constants';
import { useLiveTexts } from '@/features/live-seller/components/live-texts';
import type { AuthorizedSellerComparable } from '@/features/live-seller/services/project-live-for-seller';
import { formatEuro, formatEuroPerSquareMeter } from '@/lib/format';

// MISSION 51 — écran-pilote (étape 3) du contrat « Valider et continuer ».
//
// Différence avec LivePagePriceReveal : cet écran est CONTRÔLÉ. Il ne possède ni
// <form>, ni bouton d'enregistrement, ni useActionState, ni router.refresh — la
// valeur vit dans le shell (draft levé), qui l'enregistre en arrière-plan et fait
// avancer. Ainsi la réponse affichée ne peut pas rester non enregistrée : il n'y a
// plus de « Suivant » séparé du « Enregistrer » qui laissait filer la saisie (§2.1).
//
// Le VERROU DE RÉVÉLATION reste double : la navigation n'atteint pas cet écran sans
// l'estimation persistée (canAdvanceLivePage + clampInitialLiveIndex), ET cet écran
// refuse d'afficher le moindre prix si l'estimation manque (lien direct) — §2.2.
export function LivePagePriceRevealPilot({ entry }: { entry: AuthorizedSellerComparable }) {
  const response = entry.response;
  const savedEstimate = response?.seller_estimated_listing_price ?? null;
  const reveal = entry.priceReveal;
  const { language, texts } = useLiveTexts();
  const t = texts.live.priceReveal;
  const euro = (value: number | null): string =>
    value != null ? formatEuro(value, { language }) : '—';
  const label = neutralComparableLabel(entry, language);

  // Garde lien direct / hors séquence : jamais révéler un prix que le vendeur n'a pas
  // encore imaginé. Miroir de la garde de navigation (défense en profondeur). ICI le prix
  // n'est PAS encore mérité : on n'affiche donc PAS le titre réel du portail (il contient
  // le prix — défaut 2.2), mais le LIBELLÉ NEUTRE composé, comme les écrans pré-révélation.
  if (savedEstimate == null) {
    const neutralLabel = label;
    return (
      <div className={screen}>
        <div className={screenHead}>
          <h2 className={question}>{t.question}</h2>
          <p className={questionHint}>{t.guessFirst}</p>
        </div>
        <div className={screenBody}>
          <div className={photoColumn}>
            <LiveGallery photos={entry.photoUrls} alt={neutralLabel} fill />
            <LiveComparableHeader
              heading={neutralLabel}
              city={entry.city}
              district={entry.district}
            />
          </div>
        </div>
      </div>
    );
  }

  // Mission 148 — la photo à gauche, le prix affiché et la réponse du vendeur en couleur à droite
  // (l'écart écrit et son montant, planche 3), puis les quatre choix en 2 × 2, libellés courts.
  return (
    <div className={screen}>
      <div className={screenHead}>
        <h2 className={question}>{t.question}</h2>
        <p className={questionHint}>{t.hint}</p>
      </div>

      <div className={screenBody}>
        <div className={photoColumn}>
          <LiveGallery photos={entry.photoUrls} alt={label} fill />
          <LiveComparableHeader heading={label} city={entry.city} district={entry.district} />
        </div>

        <div className={answerColumn}>
          <div className={`${panel} live-reveal-pop flex flex-col gap-3`}>
            {/* Mission 152 — « Voir l'annonce » sur la ligne du prix : aucune hauteur de plus (M148). */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className={statLabel}>{t.listed}</div>
                <div className={revealValue}>{euro(reveal.currentPrice)}</div>
              </div>
              <LiveListingButton entry={entry} />
            </div>
            <LiveGuessGap guess={savedEstimate} listedPrice={reveal.currentPrice} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className={statLabel}>{t.perSqm}</div>
                <div className={statValue}>
                  {reveal.pricePerSquareMeter != null
                    ? formatEuroPerSquareMeter(reveal.pricePerSquareMeter, { language })
                    : '—'}
                </div>
              </div>
              <div>
                <div className={statLabel}>{t.position}</div>
                <div className={statValue}>
                  {reveal.relativePosition
                    ? `${reveal.relativePosition.rank} / ${reveal.relativePosition.total}`
                    : '—'}
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={(e) => e.preventDefault()} className={`${panel} flex flex-col gap-3`}>
            <fieldset className="flex flex-col gap-2">
              <legend className={`${fieldLabel} mb-2`}>{t.legend}</legend>
              <div className="grid grid-cols-2 gap-2 md:portrait:grid-cols-4">
                {PRICE_COHERENCE_VALUES.map((value) => (
                  <label key={value} className={choiceCompact}>
                    <input
                      type="radio"
                      name="seller_price_coherence"
                      value={value}
                      defaultChecked={response?.seller_price_coherence === value}
                      className="sr-only"
                    />
                    {texts.live.answers.coherenceShort[value]}
                  </label>
                ))}
              </div>
            </fieldset>
            <LiveCommentField
              name="seller_price_coherence_comment"
              defaultValue={response?.seller_price_coherence_comment ?? ''}
            />
          </form>
        </div>
      </div>
    </div>
  );
}
