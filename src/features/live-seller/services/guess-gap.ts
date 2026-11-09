import type { TextLanguage } from '@/lib/client-texts';
import type { ClientTexts } from '@/lib/client-texts/types';
import { formatPercent } from '@/lib/format';

// Mission 148 — la réponse du vendeur face au prix affiché d'un concurrent, en couleur. Pur.
// La règle (réponses 2 et 6 de Jean-Guy, 08/11) :
//   écart = (réponse − prix affiché) ÷ prix affiché
// « Votre réponse : 5,4 % en dessous du prix affiché ». La couleur se lit sur l'écart SANS son
// signe et SANS arrondi (4,99 % reste vert) :
//   • vert   : strictement moins de 5 % ;
//   • orange : de 5 % inclus à strictement moins de 10 % ;
//   • rouge  : 10 % inclus et au-delà.
// Les deux seuils sont ici, et nulle part ailleurs ; ce sont ceux du prix de commercialisation
// (M116). Le même calcul partout : la révélation, le plus dangereux, « Revoir », la synthèse et
// le bilan des devinettes (M96, dont la base change : l'écart se mesurait en % de la devinette).
// Sans réponse, une réponse à 0 € (M96) ou sans prix affiché : null — aucune couleur.

export const GUESS_CLOSE_BELOW_PERCENT = 5;
export const GUESS_FAR_FROM_PERCENT = 10;

export type GuessGapTone = 'green' | 'orange' | 'red';

export type GuessGap = {
  // Réponse moins prix affiché, en euros : négatif quand le vendeur a imaginé moins.
  amount: number;
  // L'écart exact, en %, signé, non arrondi : (réponse − prix affiché) ÷ prix affiché × 100.
  percent: number;
  direction: 'below' | 'above' | 'equal';
  tone: GuessGapTone;
};

export function guessGap(
  guess: number | null | undefined,
  listedPrice: number | null | undefined,
): GuessGap | null {
  if (guess == null || listedPrice == null || !Number.isFinite(guess)) return null;
  if (guess <= 0 || !(listedPrice > 0)) return null;
  const amount = Math.round(guess - listedPrice);
  const percent = ((guess - listedPrice) / listedPrice) * 100;
  const size = Math.abs(percent);
  const tone: GuessGapTone =
    size < GUESS_CLOSE_BELOW_PERCENT ? 'green' : size < GUESS_FAR_FROM_PERCENT ? 'orange' : 'red';
  const direction = amount < 0 ? 'below' : amount > 0 ? 'above' : 'equal';
  return { amount, percent, direction, tone };
}

// Les classes de la couleur : la scène sombre du Live comme le fond clair. Jamais la couleur
// seule : la phrase de l'écart l'accompagne toujours.
export const GUESS_GAP_TEXT: Record<GuessGapTone, string> = {
  green: 'text-emerald-700 stage:text-emerald-300',
  orange: 'text-amber-700 stage:text-amber-300',
  red: 'text-red-700 stage:text-red-300',
};

export const GUESS_GAP_BORDER: Record<GuessGapTone, string> = {
  green: 'border-emerald-600 stage:border-emerald-300',
  orange: 'border-amber-500 stage:border-amber-300',
  red: 'border-red-600 stage:border-red-300',
};

export const GUESS_GAP_DOT: Record<GuessGapTone, string> = {
  green: 'bg-emerald-600 stage:bg-emerald-300',
  orange: 'bg-amber-500 stage:bg-amber-300',
  red: 'bg-red-600 stage:bg-red-300',
};

// « 5,4 % en dessous du prix affiché » : l'écart sans son signe, au dixième ; « le prix affiché »
// quand la réponse est exacte. Les mêmes mots au Live et dans la synthèse.
export function guessGapPhrase(gap: GuessGap, texts: ClientTexts, language: TextLanguage): string {
  if (gap.direction === 'equal') return texts.common.guessGap.equal;
  const percent = formatPercent(Math.abs(gap.percent), { maxDecimals: 1, language });
  return gap.direction === 'below'
    ? texts.common.guessGap.below(percent)
    : texts.common.guessGap.above(percent);
}
