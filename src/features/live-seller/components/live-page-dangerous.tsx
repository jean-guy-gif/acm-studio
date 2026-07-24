'use client';

import { useActionState } from 'react';

import { SubmitButton } from '@/components/submit-button';
import {
  initialLiveActionState,
  type LiveActionState,
} from '@/features/live-seller/actions/live-action-state';
import { LivePhoto } from '@/features/live-seller/components/live-photo';
import {
  DANGEROUS_REASONS,
  DANGEROUS_REASON_LABELS,
  SERIOUS_COMPETITOR_LABELS,
  type SeriousCompetitor,
} from '@/features/live-seller/constants';
import type { LiveSellerSummary } from '@/features/live-seller/types';
import type { LiveComparableEntry } from '@/features/seller-presentation/types/seller-presentation';

const euro = (value: number | null): string =>
  value != null ? `${Math.round(value).toLocaleString('fr-FR')} €` : '—';

// Synthèse — the seller picks the most dangerous competitor. The software records
// the choice but NEVER concludes that this price is a maximum.
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

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-semibold">Quel concurrent vous paraît le plus dangereux ?</h2>
      <form action={formAction} className="flex flex-col gap-4">
        {/* Preserve the summary's price fields. */}
        <input
          type="hidden"
          name="seller_perceived_property_price"
          value={summary?.seller_perceived_property_price ?? ''}
        />
        <input
          type="hidden"
          name="advisor_comparative_market_price"
          value={summary?.advisor_comparative_market_price ?? ''}
        />

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {comparables.map((entry) => (
            <label
              key={entry.id}
              className={`flex cursor-pointer flex-col gap-2 rounded-lg border p-3 ${
                selected === entry.id
                  ? 'border-emerald-400 ring-1 ring-emerald-400'
                  : 'border-zinc-200 dark:border-zinc-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="seller_most_dangerous_comparable_id"
                  value={entry.id}
                  defaultChecked={selected === entry.id}
                />
                <span className="font-medium">{entry.title ?? 'Bien concurrent'}</span>
              </div>
              <LivePhoto
                photoUrl={entry.photoUrl}
                photoUrls={[]}
                alt={entry.title ?? 'Bien concurrent'}
              />
              <div className="text-sm text-zinc-500">
                {[entry.district, entry.city].filter(Boolean).join(', ') || 'Localisation inconnue'}
              </div>
              <div className="text-sm">
                {entry.surfaceArea != null ? `${entry.surfaceArea} m²` : '—'} ·{' '}
                {entry.roomsCount != null ? `${entry.roomsCount} pièces` : '—'}
              </div>
              <div className="text-sm">
                Prix : <span className="font-medium">{euro(entry.price)}</span>
                {entry.marketDuration.available ? ` · ${entry.marketDuration.label}` : ''}
              </div>
              <div className="text-xs text-zinc-500">
                Sérieux concurrent :{' '}
                {entry.response?.seller_serious_competitor
                  ? SERIOUS_COMPETITOR_LABELS[
                      entry.response.seller_serious_competitor as SeriousCompetitor
                    ]
                  : 'Non renseigné'}
              </div>
            </label>
          ))}
        </div>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Pourquoi ?
          <select
            name="seller_most_dangerous_reason"
            defaultValue={reason}
            className="max-w-sm rounded border px-2 py-1 font-normal"
          >
            <option value="">— Choisir —</option>
            {DANGEROUS_REASONS.map((value) => (
              <option key={value} value={value}>
                {DANGEROUS_REASON_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Commentaire (facultatif)
          <textarea
            name="seller_most_dangerous_comment"
            rows={2}
            defaultValue={comment}
            className="max-w-xl rounded border px-2 py-1 font-normal"
          />
        </label>
        {state.error ? (
          <p role="alert" className="text-sm text-red-600">
            {state.error}
          </p>
        ) : null}
        {state.ok ? <p className="text-sm text-emerald-600">Choix enregistré.</p> : null}
        <SubmitButton pendingLabel="Enregistrement…">Enregistrer le choix</SubmitButton>
      </form>
    </div>
  );
}
