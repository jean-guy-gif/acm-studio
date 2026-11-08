'use client';

import { statLabel } from '@/features/live-seller/components/live-stage';
import { useLiveTexts } from '@/features/live-seller/components/live-texts';
import {
  GUESS_GAP_DOT,
  GUESS_GAP_TEXT,
  guessGap,
  guessGapPhrase,
} from '@/features/live-seller/services/guess-gap';
import { formatEuro } from '@/lib/format';

// La réponse du vendeur face au prix affiché d'un concurrent, en couleur (point 2 de la fiche) :
// « Votre réponse » à la couleur de l'écart, l'écart écrit et son montant. Jamais la couleur seule ;
// rien de coloré sans écart (« Non », réponse à 0 €, présentation directe : `guess` absent).
export function LiveGuessGap({
  guess,
  listedPrice,
  variant = 'panel',
}: {
  guess: number | null;
  listedPrice: number | null;
  // `panel` : la révélation (grande valeur) ; `inline` : une ligne, sur une carte.
  variant?: 'panel' | 'inline';
}) {
  const { language, texts } = useLiveTexts();
  if (guess == null) return null;
  const gap = guessGap(guess, listedPrice);
  const euro = formatEuro(guess, { language });
  const tone = gap ? GUESS_GAP_TEXT[gap.tone] : '';
  const phrase = gap ? guessGapPhrase(gap, texts, language) : null;
  const amount =
    gap && gap.amount !== 0 ? formatEuro(gap.amount, { signed: true, language }) : null;

  if (variant === 'inline') {
    return (
      <div
        className={`flex items-start gap-1.5 text-xs leading-tight font-semibold ${tone || 'text-zinc-600 stage:text-white/70'}`}
        data-guess-gap={gap?.tone ?? 'none'}
      >
        {gap ? (
          <span
            className={`mt-1 size-2 shrink-0 rounded-full ${GUESS_GAP_DOT[gap.tone]}`}
            aria-hidden
          />
        ) : null}
        <span>
          {texts.common.guessGap.answer(euro)}
          {phrase ? ` · ${phrase}` : ''}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1" data-guess-gap={gap?.tone ?? 'none'}>
      <div className={statLabel}>{texts.common.yourAnswer}</div>
      {/* La couleur porte sur la valeur : sans la couleur de base de `bigValue`, qui l'emporterait. */}
      <div
        className={`font-title text-2xl leading-none font-bold whitespace-nowrap sm:text-3xl ${
          tone || 'text-zinc-900 stage:text-white'
        }`}
      >
        {euro}
      </div>
      {phrase ? (
        <div className={`flex items-start gap-1.5 text-sm leading-snug font-semibold ${tone}`}>
          <span
            className={`mt-1.5 size-2 shrink-0 rounded-full ${GUESS_GAP_DOT[gap!.tone]}`}
            aria-hidden
          />
          <span>
            {phrase}
            {amount ? <span className="font-normal opacity-80"> · {amount}</span> : null}
          </span>
        </div>
      ) : null}
    </div>
  );
}
