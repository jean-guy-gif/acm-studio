'use client';

import { fieldLabel, hintText, inputBase } from '@/components/ui/styles';
import {
  OUTSIDE_TITLE_MISSING,
  outsideTitleSchema,
  type OutsideTitle,
} from '@/features/visit-voucher/services/outside-mandate';

// Mission 153 (planches M153-2 et M153-3) — « À quel titre intervenez-vous ? », obligatoire, sur un
// bien hors mandat de l'agence : mon mandat de recherche (n° et date de signature) ou la
// collaboration avec le confrère (son agence, le n° de son mandat de vente). Rien de coché d'avance,
// sauf la collaboration obtenue sur sa carte de Prospection, à vérifier. Le même bloc pour le bon de
// visite et l'offre d'achat.

export type TitleDraft = {
  kind: 'search' | 'colleague' | null;
  searchNumber: string;
  signedOn: string;
  agency: string;
  colleagueNumber: string;
};

export function initialTitleDraft(
  suggestion: OutsideTitle | { kind: 'colleague'; agency: string; number: string } | null,
  lastSearch: Extract<OutsideTitle, { kind: 'search' }> | null,
): TitleDraft {
  return {
    kind: suggestion?.kind ?? null,
    searchNumber: lastSearch?.number ?? '',
    signedOn: lastSearch?.signedOn ?? '',
    agency: suggestion?.kind === 'colleague' ? suggestion.agency : '',
    colleagueNumber: suggestion?.kind === 'colleague' ? suggestion.number : '',
  };
}

// Le titre saisi, s'il est complet ; sinon null (le document ne se crée pas).
export function draftTitle(draft: TitleDraft): OutsideTitle | null {
  const raw =
    draft.kind === 'search'
      ? { kind: 'search', number: draft.searchNumber, signedOn: draft.signedOn }
      : draft.kind === 'colleague'
        ? { kind: 'colleague', agency: draft.agency, number: draft.colleagueNumber }
        : null;
  if (raw == null) return null;
  const parsed = outsideTitleSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

const CHOICES = [
  { kind: 'search', label: 'Mon mandat de recherche', hint: 'signé avec l’acquéreur' },
  {
    kind: 'colleague',
    label: 'Collaboration avec le confrère',
    hint: 'délégation de son mandat de vente',
  },
] as const;

export function OutsideTitleFields({
  draft,
  onChange,
  missingText = OUTSIDE_TITLE_MISSING,
  searchHint,
  colleagueHint,
}: {
  draft: TitleDraft;
  onChange: (draft: TitleDraft) => void;
  missingText?: string;
  // « Repris du dernier bon de la famille Keller. »
  searchHint?: string | null;
  // « Collaboration obtenue, sur sa carte de Prospection. »
  colleagueHint?: string | null;
}) {
  const complete = draftTitle(draft) != null;
  const set = (patch: Partial<TitleDraft>) => onChange({ ...draft, ...patch });
  return (
    <fieldset
      className={`flex flex-col gap-2.5 rounded-xl border-[1.5px] p-3 ${
        complete
          ? 'border-brand-deep bg-brand-soft stage:bg-brand/10'
          : 'border-amber-600 bg-amber-50 stage:bg-amber-500/10'
      }`}
      data-testid="outside-title"
      data-kind={draft.kind ?? ''}
    >
      <legend className="sr-only">À quel titre intervenez-vous ?</legend>
      <span className="text-sm font-bold text-brand-deep stage:text-brand" aria-hidden>
        À quel titre intervenez-vous ?{' '}
        <span className="font-semibold text-zinc-500 stage:text-white/60">obligatoire</span>
      </span>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {CHOICES.map((choice) => (
          <label
            key={choice.kind}
            className={`flex cursor-pointer items-start gap-2.5 rounded-lg border-[1.5px] bg-white p-2.5 stage:bg-white/5 ${
              draft.kind === choice.kind
                ? 'border-brand-deep'
                : 'border-zinc-200 stage:border-white/10'
            }`}
          >
            <input
              type="radio"
              name="outside-title"
              className="mt-1 h-4 w-4 accent-brand"
              checked={draft.kind === choice.kind}
              onChange={() => set({ kind: choice.kind })}
              data-testid={`outside-title-${choice.kind}`}
            />
            <span className="flex flex-col">
              <b className="text-sm text-zinc-900 stage:text-white">{choice.label}</b>
              <span className="text-xs text-zinc-500 stage:text-white/60">{choice.hint}</span>
            </span>
          </label>
        ))}
      </div>
      {draft.kind === 'search' ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className={fieldLabel}>N° du mandat de recherche</span>
            <input
              className={inputBase}
              value={draft.searchNumber}
              maxLength={40}
              data-testid="outside-search-number"
              onChange={(event) => set({ searchNumber: event.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className={fieldLabel}>Signé le</span>
            <input
              className={inputBase}
              type="date"
              value={draft.signedOn}
              data-testid="outside-search-date"
              onChange={(event) => set({ signedOn: event.target.value })}
            />
          </label>
          {searchHint ? <span className={`${hintText} sm:col-span-2`}>{searchHint}</span> : null}
        </div>
      ) : null}
      {draft.kind === 'colleague' ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className={fieldLabel}>Agence du confrère</span>
            <input
              className={inputBase}
              value={draft.agency}
              maxLength={160}
              data-testid="outside-colleague-agency"
              onChange={(event) => set({ agency: event.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className={fieldLabel}>N° de son mandat de vente</span>
            <input
              className={inputBase}
              value={draft.colleagueNumber}
              maxLength={40}
              data-testid="outside-colleague-number"
              onChange={(event) => set({ colleagueNumber: event.target.value })}
            />
          </label>
          {colleagueHint ? (
            <span className={`${hintText} sm:col-span-2`}>{colleagueHint}</span>
          ) : null}
        </div>
      ) : null}
      {complete ? null : (
        <p className="text-sm font-semibold text-amber-800" data-testid="outside-title-missing">
          {missingText}
        </p>
      )}
    </fieldset>
  );
}
