'use client';

import {
  bigValue,
  fieldInput,
  fieldLabel,
  panel,
  question,
  questionHint,
  statLabel,
} from '@/features/live-seller/components/live-stage';
import {
  MAX_LAUNCH_READINESS,
  MAX_LIVE_COMMENT_LENGTH,
  MIN_LAUNCH_READINESS,
} from '@/features/live-seller/constants';
import { formatEuro } from '@/lib/format';

const SCORES = Array.from(
  { length: MAX_LAUNCH_READINESS - MIN_LAUNCH_READINESS + 1 },
  (_value, i) => MIN_LAUNCH_READINESS + i,
);

// Grand bouton tactile de l'échelle : même langage que `choice`, porté par `aria-pressed`.
const scoreButton =
  'flex min-h-16 cursor-pointer items-center justify-center rounded-xl border-2 border-zinc-200 bg-white font-title text-2xl font-bold text-zinc-700 transition-all select-none hover:border-brand hover:text-brand-deep aria-pressed:border-brand aria-pressed:bg-brand aria-pressed:text-white aria-pressed:shadow-lg aria-pressed:shadow-brand/30 sm:min-h-20 sm:text-3xl stage:border-white/20 stage:bg-white/5 stage:text-white/80 stage:hover:border-brand stage:hover:text-white stage:aria-pressed:border-brand stage:aria-pressed:bg-brand stage:aria-pressed:text-white';

// MISSION 85 — après le prix de commercialisation, le vendeur se situe de 1 à 10. En dessous
// de 10, l'écran fait sortir ce qui manque encore ; à 10, on lance la vente. Aucun montant
// ici, sauf le prix déjà décidé ; rien n'est pré-sélectionné et rien n'est obligatoire.
// Écran contrôlé par le shell, qui enregistre la note et porte « Terminer le rendez-vous ».
export function LivePageClosing({
  agreedPrice,
  score,
  missing,
  onScore,
  onMissingChange,
}: {
  // Le prix de commercialisation enregistré pendant cette séance, s'il y en a un.
  agreedPrice: number | null;
  score: number | null;
  missing: string;
  onScore: (score: number) => void;
  onMissingChange: (missing: string) => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 sm:gap-8">
      <div className="flex flex-col gap-3">
        <h2 className={question}>
          Sur une échelle de 1 à 10, où en êtes-vous pour lancer la vente à ce prix&nbsp;?
        </h2>
        <p className={questionHint}>1&nbsp;: pas encore prêt · 10&nbsp;: on y va.</p>
      </div>

      {agreedPrice != null ? (
        <div className={`${panel} flex flex-col gap-1.5`}>
          <div className={statLabel}>Prix de commercialisation</div>
          <div className={bigValue}>{formatEuro(agreedPrice)}</div>
        </div>
      ) : null}

      <div
        role="group"
        aria-label="Votre note, de 1 à 10"
        className="grid grid-cols-5 gap-2 sm:grid-cols-10 sm:gap-3"
      >
        {SCORES.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={score === value}
            onClick={() => onScore(value)}
            className={scoreButton}
          >
            {value}
          </button>
        ))}
      </div>

      {score === MAX_LAUNCH_READINESS ? (
        <div className={`${panel} live-fade-up flex flex-col gap-2`}>
          <h3 className={question}>Alors, on lance la vente&nbsp;?</h3>
        </div>
      ) : score != null ? (
        <div className={`${panel} live-fade-up flex flex-col gap-4`}>
          <h3 className={question}>Qu’est-ce qui vous manquerait pour être à 10&nbsp;?</h3>
          <label className="flex flex-col gap-2">
            <span className={fieldLabel}>Réponse du vendeur (facultative)</span>
            <textarea
              name="seller_launch_readiness_missing"
              rows={3}
              maxLength={MAX_LIVE_COMMENT_LENGTH}
              value={missing}
              onChange={(event) => onMissingChange(event.currentTarget.value)}
              className={fieldInput}
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}
