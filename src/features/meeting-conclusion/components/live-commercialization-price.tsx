'use client';

import { useEffect, useRef, useState, useTransition } from 'react';

import { useLiveTexts } from '@/features/live-seller/components/live-texts';
import { liveErrorMessage } from '@/features/live-seller/services/live-error-message';
import {
  bigInput,
  bigInputUnit,
  ctaPrimary,
  errorText,
  okText,
  panel,
  question,
  questionHint,
} from '@/features/live-seller/components/live-stage';
import { pricePositionSentence } from '@/features/live-seller/services/price-position';
import { saveCommercializationPrice } from '@/features/meeting-conclusion/actions/save-commercialization-price';
import { pendingCommercializationPrice } from '@/features/meeting-conclusion/services/pending-commercialization-price';
import { PriceInput } from '@/features/live-seller/components/price-input';

// Mission 53 §1 — la seule question de l'écran « Conclusion » : « Sur quel prix partons-nous ? ».
// Champ VIDE à l'ouverture, jamais pré-rempli avec le prix conseillé (§7.5, règle M51).
// Remplir et enregistrer = l'accord. Le vendeur n'y voit aucune case « oui ».
// Mission 81 — `onPendingChange` dit à la scène si un prix est saisi sans être enregistré :
// elle l'enregistre alors avant de quitter l'écran (mission 85 : « Valider et continuer »).
// `onSaved` lui rend le prix enregistré, que l'écran suivant rappelle.
export function LiveCommercializationPrice({
  projectId,
  onPendingChange,
  onSaved,
  comparedPrices = [],
}: {
  projectId: string;
  // Mission 94 — les prix affichés des concurrents déjà RÉVÉLÉS pendant le Live : ils situent
  // le montant saisi. Rien d'autre que ce que vous avez déjà vu.
  comparedPrices?: readonly number[];
  onPendingChange?: (typed: string | null) => void;
  onSaved?: (saved: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<{ ok: boolean; message: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSavedRef = useRef<string | null>(null);
  const [typedPrice, setTypedPrice] = useState<number | null>(null);
  const { language, texts } = useLiveTexts();
  const t = texts.live.conclusion;
  const position =
    typedPrice == null ? null : pricePositionSentence(typedPrice, comparedPrices, language);

  // Le champ repart vide à chaque ouverture de l'écran : en le quittant, plus rien n'attend.
  useEffect(() => () => onPendingChange?.(null), [onPendingChange]);

  return (
    <form
      className={`${panel} flex flex-col gap-4`}
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const submitted = String(formData.get('commercialization_price') ?? '');
        startTransition(async () => {
          const result = await saveCommercializationPrice(projectId, formData);
          if (result.ok) {
            lastSavedRef.current = submitted;
            onSaved?.(submitted);
            onPendingChange?.(
              pendingCommercializationPrice(inputRef.current?.value ?? '', submitted),
            );
          }
          setState(
            result.ok
              ? { ok: true, message: t.saved }
              : {
                  ok: false,
                  // Mission 144 — devant le vendeur, un message qui dit quoi faire, jamais le
                  // détail du serveur.
                  message: liveErrorMessage(
                    result.error,
                    language,
                    texts.live.shell,
                    texts.live.shell.saveFailed,
                    t.save,
                  ),
                },
          );
        });
      }}
    >
      <div className="flex flex-col gap-2">
        <h3 className={question}>{t.priceQuestion}</h3>
        <p className={questionHint}>{t.priceHint}</p>
      </div>
      <div className="flex items-center gap-3">
        {/* Mission 143 (I6) — « 790 000 » pendant la frappe, au clavier numérique ; le champ caché
            (`inputRef`) porte le nombre, sans séparateur. */}
        <PriceInput
          inputRef={inputRef}
          name="commercialization_price"
          language={language}
          placeholder="—"
          onDigitsChange={(digits) => {
            const value = Number(digits);
            setTypedPrice(digits !== '' && Number.isFinite(value) ? value : null);
            onPendingChange?.(pendingCommercializationPrice(digits, lastSavedRef.current));
          }}
          className={bigInput}
        />
        <span className={bigInputUnit}>€</span>
      </div>
      {/* Mission 94 — un repère factuel : ni conseil, ni alerte, ni pression (M85). */}
      {position ? (
        <p className={questionHint} data-price-position aria-live="polite">
          {position}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className={ctaPrimary} disabled={pending}>
          {pending ? t.saving : t.save}
        </button>
        {state ? <span className={state.ok ? okText : errorText}>{state.message}</span> : null}
      </div>
    </form>
  );
}
