'use client';

import { useActionState } from 'react';

import { SubmitButton } from '@/components/submit-button';
import {
  initialLiveActionState,
  type LiveActionState,
} from '@/features/live-seller/actions/live-action-state';
import { LivePhoto } from '@/features/live-seller/components/live-photo';
import {
  choice,
  ctaPrimary,
  errorText,
  fieldInput,
  fieldLabel,
  okText,
  panel,
  question,
  questionHint,
  statLabel,
} from '@/features/live-seller/components/live-stage';
import {
  DANGEROUS_REASONS,
  DANGEROUS_REASON_LABELS,
  SERIOUS_COMPETITOR_LABELS,
  type SeriousCompetitor,
} from '@/features/live-seller/constants';
import type { LiveSellerSummary } from '@/features/live-seller/types';
import type { LiveComparableEntry } from '@/features/seller-presentation/types/seller-presentation';

const euro = (value: number | null): string =>
  value != null ? `${Math.round(value).toLocaleString('fr-FR')}\u00A0€` : '—';

// Synthèse — the seller picks the most dangerous competitor among the ones he
// judged serious (yes / unsure). The software records the choice but NEVER
// concludes that this price is a maximum.
export function LivePageDangerous({
  comparables,
  summary,
  saveAction,
}: {
  comparables: LiveComparableEntry[];
  summary: LiveSellerSummary | null;
  saveAction: (state: LiveActionState, formData: FormData) => Promise<LiveActionState>;
}) {
  const [state, formAction] = useActionState(saveAction, initialLiveActionState);
  const selected =
    state.values?.seller_most_dangerous_comparable_id ??
    summary?.seller_most_dangerous_comparable_id ??
    '';
  const reason =
    state.values?.seller_most_dangerous_reason ?? summary?.seller_most_dangerous_reason ?? '';
  const comment =
    state.values?.seller_most_dangerous_comment ?? summary?.seller_most_dangerous_comment ?? '';
  const eligibleComparables = comparables.filter((entry) => {
    const answer = entry.response?.seller_serious_competitor;
    return answer === 'yes' || answer === 'unsure';
  });

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <div className="flex flex-col gap-3">
        <h2 className={question}>Quel concurrent vous paraît le plus dangereux ?</h2>
        <p className={questionHint}>
          Les biens que vous avez jugés sérieux (ou incertains), avec leur prix révélé.
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-6">
        {eligibleComparables.length === 0 ? (
          <p className="text-base text-zinc-500 stage:text-white/60">
            Aucun bien n’a été retenu comme concurrent sérieux ou incertain.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {eligibleComparables.map((entry) => (
              <label
                key={entry.id}
                className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border-2 border-zinc-200 bg-white shadow-card transition-all select-none hover:border-brand has-checked:border-brand has-checked:shadow-xl has-checked:shadow-brand/25 stage:border-white/15 stage:bg-white/5 stage:shadow-none stage:hover:border-brand stage:has-checked:border-brand stage:has-checked:bg-brand/15"
              >
                <input
                  type="radio"
                  name="seller_most_dangerous_comparable_id"
                  value={entry.id}
                  defaultChecked={selected === entry.id}
                  className="sr-only"
                />
                <LivePhoto
                  photoUrl={entry.photoUrl}
                  photoUrls={[]}
                  alt={entry.title ?? 'Bien concurrent'}
                  compact
                />
                <div className="flex flex-col gap-2 p-4">
                  <div className="font-title text-lg leading-snug font-semibold text-zinc-900 stage:text-white">
                    {entry.title ?? 'Bien concurrent'}
                  </div>
                  <div className="text-sm text-zinc-500 stage:text-white/60">
                    {[entry.district, entry.city].filter(Boolean).join(', ') ||
                      'Localisation inconnue'}
                    {entry.surfaceArea != null ? ` · ${entry.surfaceArea} m²` : ''}
                    {entry.roomsCount != null ? ` · ${entry.roomsCount} pièces` : ''}
                  </div>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-title text-2xl font-bold text-brand-deep stage:text-white">
                      {euro(entry.price)}
                    </span>
                    {entry.marketDuration.available ? (
                      <span className="text-xs text-zinc-400 stage:text-white/50">
                        {entry.marketDuration.label}
                      </span>
                    ) : null}
                  </div>
                  {entry.response?.seller_estimated_listing_price != null ? (
                    <div className="text-sm text-zinc-500 stage:text-white/60">
                      Imaginé : {euro(entry.response.seller_estimated_listing_price)}
                      {entry.priceReveal.gapAmount != null
                        ? ` · écart ${entry.priceReveal.gapAmount >= 0 ? '+' : ''}${entry.priceReveal.gapAmount.toLocaleString('fr-FR')} €`
                        : ''}
                    </div>
                  ) : null}
                  <div className={statLabel}>
                    Sérieux concurrent :{' '}
                    {entry.response?.seller_serious_competitor
                      ? SERIOUS_COMPETITOR_LABELS[
                          entry.response.seller_serious_competitor as SeriousCompetitor
                        ]
                      : 'Non renseigné'}
                  </div>
                </div>
              </label>
            ))}
          </div>
        )}

        <div className={`${panel} flex flex-col gap-4`}>
          <fieldset className="flex flex-col gap-3">
            <legend className={fieldLabel}>Pourquoi celui-là ?</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {DANGEROUS_REASONS.map((value) => (
                <label key={value} className={`${choice} min-h-11 px-3 py-2 text-base font-medium`}>
                  <input
                    type="radio"
                    name="seller_most_dangerous_reason"
                    value={value}
                    defaultChecked={reason === value}
                    className="sr-only"
                  />
                  {DANGEROUS_REASON_LABELS[value]}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex flex-col gap-1.5">
            <span className={fieldLabel}>Commentaire (facultatif)</span>
            <textarea
              name="seller_most_dangerous_comment"
              rows={2}
              defaultValue={comment}
              className={fieldInput}
            />
          </label>
          {state.error ? (
            <p role="alert" className={errorText}>
              {state.error}
            </p>
          ) : null}
          {state.ok ? <p className={okText}>Choix enregistré.</p> : null}
          <SubmitButton pendingLabel="Enregistrement…" className={ctaPrimary}>
            Enregistrer le choix
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
