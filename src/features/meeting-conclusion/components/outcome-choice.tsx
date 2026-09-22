'use client';

import { fieldLabel, inputBase } from '@/components/ui/styles';
import { CONCLUSION_OUTCOMES, OUTCOME_LABELS } from '@/features/meeting-conclusion/types';
import type { ConclusionOutcome } from '@/features/meeting-conclusion/types';

const choiceBase =
  'flex cursor-pointer items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium transition-colors';
const choiceIdle =
  'border-zinc-200 text-zinc-600 hover:border-brand hover:text-zinc-900 stage:border-white/15 stage:text-white/70';
const choiceActive =
  'border-brand bg-brand-soft text-brand-deep stage:bg-brand/15 stage:text-white';

// Mission 54 — les QUATRE issues, choisies de la même façon à la conclusion et dans le
// Suivi. Le motif n'apparaît que pour « à relancer » (note de travail, jamais au vendeur).
export function OutcomeChoice({
  outcome,
  onOutcomeChange,
  initialReason,
  legend,
}: {
  outcome: ConclusionOutcome | null;
  onOutcomeChange: (next: ConclusionOutcome) => void;
  initialReason: string | null;
  legend: string;
}) {
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

      {outcome === 'follow_up' ? (
        <label className="flex flex-col gap-2">
          <span className={fieldLabel}>
            Qu’est-ce qui retient le vendeur&nbsp;? (note de travail — jamais montrée au vendeur)
          </span>
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
