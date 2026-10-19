'use client';

import { useState } from 'react';

import { fieldLabel, inputBase } from '@/components/ui/styles';
import {
  defaultNextFollowUpOn,
  NEXT_FOLLOW_UP_MAX_DAYS,
  parisDay,
} from '@/features/meeting-conclusion/services/follow-up-contacts';
import {
  CONCLUSION_OUTCOMES,
  FOLLOW_UP_MOTIVES,
  FOLLOW_UP_MOTIVE_LABELS,
  MANDATE_TYPES,
  MANDATE_TYPE_LABELS,
  OBJECTION_LABELS,
  OBJECTION_NOTE_MAX,
  OBJECTIONS,
  OUTCOME_LABELS,
} from '@/features/meeting-conclusion/types';
import type {
  ConclusionOutcome,
  FollowUpMotive,
  MandateType,
  Objection,
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
  initialNextFollowUpOn = null,
  initialObjections = [],
  initialObjectionNote = null,
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
  // Mission 108 — la date de première relance déjà posée, s'il y en a une.
  initialNextFollowUpOn?: string | null;
  // Mission 110 — ce qui freine le vendeur, déjà coché.
  initialObjections?: Objection[];
  initialObjectionNote?: string | null;
  legend: string;
}) {
  const [motive, setMotive] = useState<FollowUpMotive | null>(initialMotive);
  // Mission 108 — la date proposée suit le motif (M105 : un mois pour « Réfléchit au prix », sept
  // jours sinon), tant que le conseiller ne l'a pas changée lui-même.
  const [nextOn, setNextOn] = useState<string | null>(initialNextFollowUpOn);
  const [today] = useState(() => parisDay(new Date()));
  const [lastDay] = useState(() =>
    parisDay(new Date(Date.now() + NEXT_FOLLOW_UP_MAX_DAYS * 86_400_000)),
  );
  const proposedNextOn = nextOn ?? defaultNextFollowUpOn(motive, new Date());
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
          <label className="mt-1 flex flex-wrap items-center gap-2 text-sm text-zinc-600 stage:text-white/70">
            Première relance le
            <input
              type="date"
              name="next_follow_up_on"
              required
              min={today}
              max={lastDay}
              value={proposedNextOn}
              onChange={(event) => setNextOn(event.target.value || null)}
              className={`${inputBase} w-auto`}
              data-testid="first-follow-up-date"
            />
          </label>
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

      {/* Mission 110 — ce qui freine le vendeur : plusieurs cases, une ligne libre. Ça s'ajoute au
          motif de relance, qui reste obligatoire pour « à relancer ». */}
      {outcome != null && outcome !== 'signed' ? (
        <fieldset className="flex flex-col gap-2" data-testid="objections">
          <legend className={`${fieldLabel} mb-1`}>Ce qui freine le vendeur (facultatif)</legend>
          <div className="flex flex-wrap gap-2.5">
            {OBJECTIONS.map((value) => (
              <label
                key={value}
                className={`${choiceBase} ${choiceIdle} has-[:checked]:border-brand`}
              >
                <input
                  type="checkbox"
                  name="objections"
                  value={value}
                  defaultChecked={initialObjections.includes(value)}
                  className="accent-brand"
                />
                {OBJECTION_LABELS[value]}
              </label>
            ))}
          </div>
          <input
            type="text"
            name="objection_note"
            maxLength={OBJECTION_NOTE_MAX}
            aria-label="Autre frein, en une ligne"
            placeholder="Autre frein, en une ligne (facultatif)"
            defaultValue={initialObjectionNote ?? ''}
            className={inputBase}
          />
        </fieldset>
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
