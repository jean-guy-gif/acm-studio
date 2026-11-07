'use client';

import { useLiveTexts } from '@/features/live-seller/components/live-texts';
import { LiveLockedAnswer } from '@/features/live-seller/components/live-locked-answer';
import {
  bigInput,
  bigInputUnit,
  panel,
  question,
  questionHint,
  revealValue,
  statLabel,
} from '@/features/live-seller/components/live-stage';
import type { LiveSellerSummary } from '@/features/live-seller/types';
import { formatEuro } from '@/lib/format';

// Mission 94 — Acte 5 du Storyboard. Le vendeur vient de voir les biens, un par un ; avant que
// l'analyse ne s'affiche, c'est LUI qui reformule son prix. L'écran ne révèle rien (ni prix des
// concurrents, ni analyse) et ne commente pas la réponse.
//
// Facultatif : « Passer » n'enregistre rien. Donné, ce prix est redit en grand avant d'être
// enregistré, puis figé comme la valeur perçue (M92) : il se relit ici, sans champ de saisie.
// Écran contrôlé par le shell : formulaire nu, sans bouton propre.
export function LivePageRevised({
  summary,
  confirming = null,
}: {
  summary: LiveSellerSummary | null;
  // Le montant tapé, en attente de confirmation ; null tant que rien n'est à confirmer.
  confirming?: number | null;
}) {
  const saved = summary?.seller_revised_property_price ?? null;
  const { language, texts } = useLiveTexts();
  const t = texts.live.revised;
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 sm:gap-8">
      <div className="flex flex-col gap-3">
        <h2 className={question}>{t.question}</h2>
        <p className={questionHint}>{saved != null ? t.savedHint : t.hint}</p>
      </div>
      {saved != null ? (
        <div className={`${panel} flex flex-col gap-4`}>
          <LiveLockedAnswer value={formatEuro(saved, { language })} />
        </div>
      ) : (
        <form onSubmit={(e) => e.preventDefault()} className={`${panel} flex flex-col gap-4`}>
          <label className="flex flex-col gap-2">
            <span className={statLabel}>{t.label}</span>
            <div className="flex items-center gap-3">
              <input
                type="number"
                name="seller_revised_property_price"
                min={0}
                step="any"
                placeholder="0"
                defaultValue=""
                className={bigInput}
              />
              <span className={bigInputUnit}>€</span>
            </div>
          </label>
          {confirming != null ? (
            <div className="live-reveal-pop flex flex-col gap-2" role="status" aria-live="polite">
              <span className={revealValue}>
                {formatEuro(confirming, { language })}
                {texts.common.questionMark}
              </span>
              <span className={questionHint}>{t.confirmHint}</span>
            </div>
          ) : null}
        </form>
      )}
    </div>
  );
}
