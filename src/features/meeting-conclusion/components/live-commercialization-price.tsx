'use client';

import { useState, useTransition } from 'react';

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
import { saveCommercializationPrice } from '@/features/meeting-conclusion/actions/save-commercialization-price';

// Mission 53 §1 — la seule question du dernier écran : « Sur quel prix partons-nous ? ».
// Champ VIDE à l'ouverture, jamais pré-rempli avec le prix conseillé (§7.5, règle M51).
// Remplir et enregistrer = l'accord. Le vendeur n'y voit aucune case « oui ».
export function LiveCommercializationPrice({ projectId }: { projectId: string }) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<{ ok: boolean; message: string } | null>(null);

  return (
    <form
      className={`${panel} flex flex-col gap-4`}
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(async () => {
          const result = await saveCommercializationPrice(projectId, formData);
          setState(
            result.ok
              ? { ok: true, message: 'Prix de commercialisation enregistré.' }
              : { ok: false, message: result.error },
          );
        });
      }}
    >
      <div className="flex flex-col gap-2">
        <h3 className={question}>Sur quel prix partons-nous&nbsp;?</h3>
        <p className={questionHint}>
          Le prix de commercialisation convenu. Rien n’est pré-rempli&nbsp;: le chiffre vient du
          vendeur.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="number"
          name="commercialization_price"
          min={0}
          step="any"
          placeholder="—"
          defaultValue=""
          autoComplete="off"
          className={bigInput}
        />
        <span className={bigInputUnit}>€</span>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className={ctaPrimary} disabled={pending}>
          {pending ? 'Enregistrement…' : 'Enregistrer le prix'}
        </button>
        {state ? <span className={state.ok ? okText : errorText}>{state.message}</span> : null}
      </div>
    </form>
  );
}
