'use client';

import {
  bigValue,
  choice,
  fieldInput,
  fieldLabel,
  panel,
  question,
  questionHint,
  revealValue,
  statLabel,
  statValue,
} from '@/features/live-seller/components/live-stage';
import { LiveComparableHeader } from '@/features/live-seller/components/live-comparable-header';
import { LiveGallery } from '@/features/live-seller/components/live-gallery';
import { neutralComparableLabel } from '@/features/live-seller/utils/neutral-comparable-label';
import { PRICE_COHERENCE_VALUES, PRICE_COHERENCE_LABELS } from '@/features/live-seller/constants';
import type { AuthorizedSellerComparable } from '@/features/live-seller/services/project-live-for-seller';

const euro = (value: number | null): string =>
  value != null ? `${Math.round(value).toLocaleString('fr-FR')} €` : '—';

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

  // Garde lien direct / hors séquence : jamais révéler un prix que le vendeur n'a pas
  // encore imaginé. Miroir de la garde de navigation (défense en profondeur). ICI le prix
  // n'est PAS encore mérité : on n'affiche donc PAS le titre réel du portail (il contient
  // le prix — défaut 2.2), mais le LIBELLÉ NEUTRE composé, comme les écrans pré-révélation.
  if (savedEstimate == null) {
    const neutralLabel = neutralComparableLabel(entry);
    return (
      <div className="flex flex-col gap-6 sm:gap-8">
        <div className="flex flex-col gap-3">
          <h2 className={question}>Ce prix vous paraît-il cohérent ?</h2>
          <p className={questionHint}>
            Donnez d’abord votre estimation à l’écran précédent : le prix réel s’affichera ensuite.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_1fr] lg:gap-8">
          <div className="flex flex-col gap-4">
            <LiveGallery photos={entry.photoUrls} alt={neutralLabel} />
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

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <div className="flex flex-col gap-3">
        <h2 className={question}>Ce prix vous paraît-il cohérent ?</h2>
        <p className={questionHint}>
          Voici le prix réellement affiché. Qu’en pense le vendeur, face à son estimation ?
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_1fr] lg:gap-8">
        <div className="flex flex-col gap-4">
          <LiveGallery photos={entry.photoUrls} alt={entry.title ?? 'Bien concurrent'} />
          <LiveComparableHeader
            heading={entry.title ?? 'Bien concurrent'}
            city={entry.city}
            district={entry.district}
          />
        </div>

        <div className="flex h-fit flex-col gap-4">
          <div className={`${panel} live-reveal-pop flex flex-col gap-5`}>
            <div>
              <div className={statLabel}>Prix affiché sur le marché</div>
              <div className={revealValue}>{euro(reveal.currentPrice)}</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className={statLabel}>Prix imaginé</div>
                <div className={bigValue}>{euro(savedEstimate)}</div>
              </div>
              <div>
                <div className={statLabel}>Écart</div>
                <div className={bigValue}>
                  {reveal.gapAmount != null
                    ? `${reveal.gapAmount >= 0 ? '+' : ''}${reveal.gapAmount.toLocaleString('fr-FR')} €`
                    : '—'}
                </div>
                {reveal.gapPercentage != null ? (
                  <div className="text-sm text-zinc-500 stage:text-white/60">
                    {reveal.gapPercentage >= 0 ? '+' : ''}
                    {reveal.gapPercentage} %
                  </div>
                ) : null}
              </div>
              <div>
                <div className={statLabel}>Prix au m²</div>
                <div className={statValue}>
                  {reveal.pricePerSquareMeter != null
                    ? `${reveal.pricePerSquareMeter.toLocaleString('fr-FR')} €/m²`
                    : '—'}
                </div>
              </div>
              <div>
                <div className={statLabel}>Position (prix/m²)</div>
                <div className={statValue}>
                  {reveal.relativePosition
                    ? `${reveal.relativePosition.rank} / ${reveal.relativePosition.total}`
                    : '—'}
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={(e) => e.preventDefault()} className={`${panel} flex flex-col gap-4`}>
            <fieldset className="flex flex-col gap-3">
              <legend className={fieldLabel}>Selon le vendeur, ce prix est…</legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {PRICE_COHERENCE_VALUES.map((value) => (
                  <label
                    key={value}
                    className={`${choice} min-h-11 px-3 py-2 text-base font-medium`}
                  >
                    <input
                      type="radio"
                      name="seller_price_coherence"
                      value={value}
                      defaultChecked={response?.seller_price_coherence === value}
                      className="sr-only"
                    />
                    {PRICE_COHERENCE_LABELS[value]}
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="flex flex-col gap-1.5">
              <span className={fieldLabel}>Commentaire (facultatif)</span>
              <textarea
                name="seller_price_coherence_comment"
                rows={2}
                defaultValue={response?.seller_price_coherence_comment ?? ''}
                className={fieldInput}
              />
            </label>
          </form>
        </div>
      </div>
    </div>
  );
}
