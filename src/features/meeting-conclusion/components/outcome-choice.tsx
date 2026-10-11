'use client';

import { useState } from 'react';

import { fieldLabel, inputBase } from '@/components/ui/styles';
import {
  CONCLUSION_OUTCOMES,
  FOLLOW_UP_MOTIVES,
  FOLLOW_UP_MOTIVE_LABELS,
  MANDATE_TYPES,
  MANDATE_TYPE_LABELS,
  OUTCOME_LABELS,
} from '@/features/meeting-conclusion/types';
import type {
  ConclusionOutcome,
  FollowUpMotive,
  MandateType,
} from '@/features/meeting-conclusion/types';

const choiceBase =
  'flex cursor-pointer items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium transition-colors';
const choiceIdle =
  'border-zinc-200 text-zinc-600 hover:border-brand hover:text-zinc-900 stage:border-white/15 stage:text-white/70';
const choiceActive =
  'border-brand bg-brand-soft text-brand-deep stage:bg-brand/15 stage:text-white';

const REASON_LABELS: Record<Exclude<ConclusionOutcome, 'signed'>, string> = {
  follow_up: 'Qu’est-ce qui retient le vendeur ? (note de travail — jamais montrée au vendeur)',
  sold_elsewhere: 'Motif (facultatif — note de travail, jamais montrée au vendeur)',
  withdrawn: 'Motif (facultatif — note de travail, jamais montrée au vendeur)',
};

// Mission 54 — les QUATRE issues, choisies de la même façon à la conclusion et dans le Suivi.
// Mission 90 — et ce que chaque issue demande :
//   • « Mandat signé » : exclusif ou simple (obligatoire), et le prix de commercialisation —
//     obligatoire s'il manque, affiché et modifiable s'il existe ;
//   • « À relancer » : un motif de relance à choisir parmi des boutons (mission 96, obligatoire ;
//     « Autre » se précise d'une ligne), une note libre et un prix facultatifs ;
//   • « Vendu ailleurs », « Retiré de la vente » : un motif facultatif.
// Le serveur revérifie tout (conclusion-requirements.ts).
export function OutcomeChoice({
  outcome,
  onOutcomeChange,
  initialReason,
  initialMandateType = null,
  initialMotive = null,
  initialMotiveDetail = null,
  knownPrice = null,
  legend,
}: {
  outcome: ConclusionOutcome | null;
  onOutcomeChange: (next: ConclusionOutcome) => void;
  initialReason: string | null;
  // Le type déjà enregistré (correction d'un mandat signé), et le prix déjà enregistré.
  initialMandateType?: MandateType | null;
  knownPrice?: number | null;
  // Mission 96 — le motif de relance déjà enregistré, et la ligne de « Autre ».
  initialMotive?: FollowUpMotive | null;
  initialMotiveDetail?: string | null;
  legend: string;
}) {
  const [motive, setMotive] = useState<FollowUpMotive | null>(initialMotive);
  const priceRequired = outcome === 'signed' && knownPrice == null;

  return (
    <>
      <fieldset className="flex flex-col gap-2">
        <legend className={`${fieldLabel} mb-1`}>{legend}</legend>
        <div className="flex flex-wrap gap-2.5">
          {CONCLUSION_OUTCOMES.map((value) => (
            <label
              key={value}
              className={`${choiceBase} ${outcome === value ? choiceActive : choiceIdle}`}
            >
              <input
                type="radio"
                name="outcome"
                value={value}
                checked={outcome === value}
                onChange={() => onOutcomeChange(value)}
                className="accent-brand"
              />
              {OUTCOME_LABELS[value]}
            </label>
          ))}
        </div>
      </fieldset>

      {outcome === 'signed' ? (
        <fieldset className="flex flex-col gap-2">
          <legend className={`${fieldLabel} mb-1`}>Type de mandat (obligatoire)</legend>
          <div className="flex flex-wrap gap-2.5">
            {MANDATE_TYPES.map((value) => (
              <label
                key={value}
                className={`${choiceBase} ${choiceIdle} has-checked:border-brand has-checked:bg-brand-soft has-checked:text-brand-deep stage:has-checked:bg-brand/15 stage:has-checked:text-white`}
              >
                <input
                  type="radio"
                  name="mandate_type"
                  value={value}
                  required
                  defaultChecked={initialMandateType === value}
                  className="accent-brand"
                />
                {MANDATE_TYPE_LABELS[value]}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      {outcome === 'follow_up' ? (
        <fieldset className="flex flex-col gap-2">
          <legend className={`${fieldLabel} mb-1`}>Motif de relance (obligatoire)</legend>
          <div className="flex flex-wrap gap-2.5">
            {FOLLOW_UP_MOTIVES.map((value) => (
              <label
                key={value}
                className={`${choiceBase} ${motive === value ? choiceActive : choiceIdle}`}
              >
                <input
                  type="radio"
                  name="follow_up_motive"
                  value={value}
                  required
                  checked={motive === value}
                  onChange={() => setMotive(value)}
                  className="accent-brand"
                />
                {FOLLOW_UP_MOTIVE_LABELS[value]}
              </label>
            ))}
          </div>
          {motive === 'other' ? (
            <input
              type="text"
              name="follow_up_motive_detail"
              required
              maxLength={200}
              aria-label="Précisez le motif"
              placeholder="Précisez en une ligne"
              defaultValue={initialMotiveDetail ?? ''}
              className={inputBase}
            />
          ) : null}
        </fieldset>
      ) : null}

      {outcome === 'signed' || outcome === 'follow_up' ? (
        <label className="flex flex-col gap-2">
          <span className={fieldLabel}>
            Prix de commercialisation
            {priceRequired ? ' (obligatoire)' : outcome === 'follow_up' ? ' (facultatif)' : ''}
          </span>
          <div className="flex items-center gap-2">
            <input
              // La clé repart d'un champ neuf quand l'issue change : l'exigence change avec elle.
              key={outcome}
              type="number"
              name="commercialization_price"
              min={0}
              step="any"
              inputMode="numeric"
              required={priceRequired}
              defaultValue={knownPrice ?? ''}
              className={`${inputBase} w-48`}
            />
            <span className="text-zinc-500 stage:text-white/60">€</span>
          </div>
          {knownPrice != null ? (
            <span className="text-xs text-zinc-500 stage:text-white/50">
              Prix déjà enregistré — vous pouvez le corriger.
            </span>
          ) : null}
        </label>
      ) : null}

      {outcome != null && outcome !== 'signed' ? (
        <label className="flex flex-col gap-2">
          <span className={fieldLabel}>{REASON_LABELS[outcome]}</span>
          <textarea
            name="follow_up_reason"
            rows={3}
            maxLength={2000}
            defaultValue={initialReason ?? ''}
            className={inputBase}
          />
        </label>
      ) : null}
    </>
  );
}
