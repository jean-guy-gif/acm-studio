'use client';

import { useLiveTexts } from '@/features/live-seller/components/live-texts';
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
import {
  PRICE_ALIGNMENT_TEXT,
  priceAlignment,
} from '@/features/price-positioning/services/price-alignment';
import { clientTexts, type TextLanguage } from '@/lib/client-texts';
import { formatEuro } from '@/lib/format';

const SCORES = Array.from(
  { length: MAX_LAUNCH_READINESS - MIN_LAUNCH_READINESS + 1 },
  (_value, i) => MIN_LAUNCH_READINESS + i,
);

// Grand bouton tactile de l'échelle : même langage que `choice`, porté par `aria-pressed`.
const scoreButton =
  'flex min-h-16 cursor-pointer items-center justify-center rounded-xl border-2 border-zinc-200 bg-white font-title text-2xl font-bold text-zinc-700 transition-all select-none hover:border-brand hover:text-brand-deep aria-pressed:border-brand aria-pressed:bg-brand-deep aria-pressed:text-white aria-pressed:shadow-lg aria-pressed:shadow-brand/30 sm:min-h-20 sm:text-3xl stage:border-white/20 stage:bg-white/5 stage:text-white/80 stage:hover:border-brand stage:hover:text-white stage:aria-pressed:border-brand stage:aria-pressed:bg-brand-deep stage:aria-pressed:text-white';

// La question, selon qu'un prix de commercialisation est enregistré ou non (mission 89).
export function closingQuestion(hasAgreedPrice: boolean, language: TextLanguage = 'fr'): string {
  return clientTexts(language).live.closing.question(hasAgreedPrice);
}

// MISSION 85 — après le prix de commercialisation, le vendeur se situe de 1 à 10. En dessous
// de 10, l'écran fait sortir ce qui manque encore ; à 10, on lance la vente. Aucun montant
// ici, sauf le prix déjà décidé ; rien n'est pré-sélectionné et rien n'est obligatoire.
// Écran contrôlé par le shell, qui enregistre la note et porte « Terminer le rendez-vous ».
// Mission 116 — le prix de commercialisation en couleur face à l'analyse du conseiller : titre et
// montant colorés, le libellé toujours à côté du titre (jamais la couleur seule). Sans analyse
// du conseiller (M109), aucune couleur ni libellé.
export function LivePageClosing({
  agreedPrice,
  hasAgreedPrice,
  advisorAnalysis = null,
  score,
  missing,
  onScore,
  onMissingChange,
}: {
  // Le prix de commercialisation enregistré pendant cette séance, s'il y en a un.
  agreedPrice: number | null;
  // Mission 116 — l'analyse du conseiller, la référence de la couleur ; null sans décision.
  advisorAnalysis?: number | null;
  // Mission 89 — un prix de commercialisation est-il enregistré (cette séance ou une autre) ?
  hasAgreedPrice: boolean;
  score: number | null;
  missing: string;
  onScore: (score: number) => void;
  onMissingChange: (missing: string) => void;
}) {
  const { language, texts } = useLiveTexts();
  const t = texts.live.closing;
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 sm:gap-8">
      <div className="flex flex-col gap-3">
        <h2 className={question}>
          {/* « à ce prix » seulement s'il y a un prix : sinon la phrase ne désigne rien. */}
          {closingQuestion(hasAgreedPrice, language)}
        </h2>
        <p className={questionHint}>{t.scale}</p>
      </div>

      {agreedPrice != null ? (
        <AgreedPrice price={agreedPrice} advisorAnalysis={advisorAnalysis} />
      ) : null}

      <div
        role="group"
        aria-label={t.scoreGroup}
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
        <div className={`${panel} live-enter flex flex-col gap-2`}>
          <h3 className={question}>{t.launch}</h3>
        </div>
      ) : score != null ? (
        <div className={`${panel} live-enter flex flex-col gap-4`}>
          <h3 className={question}>{t.missing}</h3>
          <label className="flex flex-col gap-2">
            <span className={fieldLabel}>{t.answerOptional}</span>
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

function AgreedPrice({
  price,
  advisorAnalysis,
}: {
  price: number;
  advisorAnalysis: number | null;
}) {
  const alignment = priceAlignment(price, advisorAnalysis);
  const { language, texts } = useLiveTexts();
  const tone = alignment ? PRICE_ALIGNMENT_TEXT[alignment.tone] : '';
  return (
    <div
      className={`${panel} flex flex-col gap-1.5`}
      data-testid="agreed-price"
      data-alignment={alignment?.tone ?? ''}
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <div className={`${statLabel} ${tone}`}>{texts.live.closing.agreedPrice}</div>
        {alignment ? (
          <span data-testid="price-alignment" className={`text-sm font-semibold ${tone}`}>
            {texts.common.alignment[alignment.tone]}
          </span>
        ) : null}
      </div>
      <div className={`${bigValue} ${tone}`}>{formatEuro(price, { language })}</div>
    </div>
  );
}
