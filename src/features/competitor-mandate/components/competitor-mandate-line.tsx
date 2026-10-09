'use client';

import { useState, useTransition } from 'react';

import { setCompetitorMandate } from '@/features/competitor-mandate/actions/set-competitor-mandate';
import type { MandateField } from '@/features/competitor-mandate/services/mandate-columns';
import {
  EXCLUSIVITY_LABELS,
  EXCLUSIVITY_VALUES,
  MANDATE_SOURCE_LABELS,
  SOLD_BY_LABELS,
  SOLD_BY_VALUES,
  isMandateSource,
} from '@/features/competitor-mandate/types';

export type CompetitorMandateFields = {
  id: string;
  project_id: string;
  sold_by: string | null;
  sold_by_source: string | null;
  exclusivity: string | null;
  exclusivity_source: string | null;
};

type Choice = { value: string | null; label: string };

const SOLD_BY_CHOICES: Choice[] = [
  ...SOLD_BY_VALUES.map((value) => ({ value, label: SOLD_BY_LABELS[value] })),
  { value: null, label: 'Inconnu' },
];
const EXCLUSIVITY_CHOICES: Choice[] = [
  ...EXCLUSIVITY_VALUES.map((value) => ({ value, label: EXCLUSIVITY_LABELS[value] })),
  { value: null, label: 'Inconnu' },
];

const chip =
  'rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60';
const chipOn =
  'border-brand bg-brand-soft text-brand-deep stage:border-brand/60 stage:bg-brand/15 stage:text-white';
const chipOff =
  'border-zinc-200 bg-white text-zinc-500 hover:border-brand hover:text-brand-deep stage:border-white/15 stage:bg-transparent stage:text-white/55 stage:hover:text-white';

// Mission 83 — « Vendu par » et « Exclusivité » d'un concurrent, côté conseiller : la valeur
// connue est allumée, sa provenance est dite, et un clic sur une autre la corrige. Jamais montré
// au vendeur.
export function CompetitorMandateLine({ competitor }: { competitor: CompetitorMandateFields }) {
  const [stored, setStored] = useState({
    sold_by: competitor.sold_by,
    sold_by_source: competitor.sold_by_source,
    exclusivity: competitor.exclusivity,
    exclusivity_source: competitor.exclusivity_source,
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const choose = (field: MandateField, value: string | null) => {
    const sourceField = field === 'sold_by' ? 'sold_by_source' : 'exclusivity_source';
    if (stored[field] === value && stored[sourceField] === 'advisor') {
      return;
    }
    const previous = stored;
    setError(null);
    setStored({ ...stored, [field]: value, [sourceField]: 'advisor' });
    startTransition(async () => {
      const result = await setCompetitorMandate(competitor.project_id, competitor.id, field, value);
      if (!result.ok) {
        setStored(previous);
        setError(result.error);
      }
    });
  };

  const group = (label: string, field: MandateField, choices: Choice[]) => {
    const source = stored[field === 'sold_by' ? 'sold_by_source' : 'exclusivity_source'];
    return (
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={label}>
        <span className="text-zinc-600 stage:text-white/70">{label}&nbsp;:</span>
        {choices.map((choice) => {
          const on = stored[field] === choice.value;
          return (
            <button
              key={choice.label}
              type="button"
              aria-pressed={on}
              disabled={pending}
              onClick={() => choose(field, choice.value)}
              className={`${chip} ${on ? chipOn : chipOff}`}
            >
              {choice.label}
            </button>
          );
        })}
        {isMandateSource(source) && (stored[field] != null || source === 'advisor') ? (
          <span className="text-xs text-zinc-400 stage:text-white/40">
            {MANDATE_SOURCE_LABELS[source]}
          </span>
        ) : null}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <div className="flex flex-wrap gap-x-5 gap-y-1.5">
        {group('Vendu par', 'sold_by', SOLD_BY_CHOICES)}
        {group('Exclusivité', 'exclusivity', EXCLUSIVITY_CHOICES)}
      </div>
      {error ? (
        <p role="alert" className="text-xs text-red-600 stage:text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}
