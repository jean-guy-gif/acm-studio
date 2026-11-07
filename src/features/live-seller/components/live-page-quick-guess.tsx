'use client';

import { useState } from 'react';

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
import { SERIOUS_COMPETITOR_VALUES } from '@/features/live-seller/constants';
import { useLiveTexts } from '@/features/live-seller/components/live-texts';
import type { SellerComparable } from '@/features/live-seller/services/project-live-for-seller';
import { neutralComparableLabel } from '@/features/live-seller/utils/neutral-comparable-label';
import { formatEuro } from '@/lib/format';
import { PriceInput } from '@/features/live-seller/components/price-input';

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
  // Mission 143 (I6) — tant que le vendeur n'a pas dit « Non », la devinette est demandée :
  // « Valider » reste grisé sans prix ; « Non » efface le prix tapé (M104), à l'écran aussi.
  const [serious, setSerious] = useState<string>(currentAnswer);
  const [cleared, setCleared] = useState(0);
  const savedEstimate = response?.seller_estimated_listing_price ?? null;
  const { language, texts } = useLiveTexts();
  const t = texts.live.quick;
  const label = neutralComparableLabel(entry, language);

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <div className="flex flex-col gap-2">
        <h2 className={question}>{t.guessQuestion}</h2>
        <p className={questionHint}>
          {savedEstimate != null ? texts.live.price.savedHint : t.guessHint}
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
            <legend className={fieldLabel}>{t.seriousLegend}</legend>
            <div className="flex flex-col gap-2">
              {SERIOUS_COMPETITOR_VALUES.map((value) => (
                <label key={value} className={`${choice} min-h-11 px-3 py-2 text-base font-medium`}>
                  <input
                    type="radio"
                    name="seller_serious_competitor"
                    value={value}
                    defaultChecked={currentAnswer === value}
                    className="sr-only"
                    onChange={() => {
                      setSerious(value);
                      // Mission 104 — « Non » dispense de deviner : un prix déjà tapé s'efface
                      // (le champ visible et la valeur envoyée, remis à neuf).
                      if (value === 'no') setCleared((count) => count + 1);
                    }}
                  />
                  {texts.live.competition.serious[value]}
                </label>
              ))}
            </div>
          </fieldset>

          {savedEstimate != null ? (
            <LiveLockedAnswer value={formatEuro(savedEstimate, { language })} />
          ) : (
            <label className="flex flex-col gap-2">
              <span className={statLabel}>{texts.live.price.label}</span>
              <div className="flex items-center gap-3">
                <PriceInput
                  key={cleared}
                  name="seller_estimated_listing_price"
                  language={language}
                  className={bigInput}
                  required={serious !== 'no'}
                />
                <span className={bigInputUnit}>€</span>
              </div>
              <span className="text-sm text-zinc-500 stage:text-white/50">{t.nextScreen}</span>
            </label>
          )}
        </form>
      </div>

      <LiveFeatureComparison items={entry.featureComparison} />
    </div>
  );
}
