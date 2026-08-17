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
  const eligibleComparables = comparables.filter((entry) => {
    const answer = entry.response?.seller_serious_competitor;
    return answer === 'yes' || answer === 'unsure';
  });

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-semibold">Quel concurrent vous paraît le plus dangereux ?</h2>
      <form action={formAction} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {eligibleComparables.map((entry) => (
            <label
              key={entry.id}
              className={`flex cursor-pointer flex-col gap-2 rounded-card border p-3 ${
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
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 rounded-md bg-zinc-50 p-2 text-xs dark:bg-zinc-900">
                <span className="text-zinc-500">Prix estimé</span>
                <span className="text-right font-medium">
                  {euro(entry.response?.seller_estimated_listing_price ?? null)}
                </span>
                <span className="text-zinc-500">Prix réel</span>
                <span className="text-right font-medium">{euro(entry.price)}</span>
                <span className="text-zinc-500">Écart</span>
                <span className="text-right font-medium">
                  {entry.priceReveal.gapAmount != null
                    ? `${entry.priceReveal.gapAmount >= 0 ? '+' : ''}${euro(entry.priceReveal.gapAmount)}`
                    : '—'}
                </span>
                <span className="text-zinc-500">Durée estimée</span>
                <span className="text-right font-medium">
                  {entry.response?.seller_estimated_days_on_market != null
                    ? `${entry.response.seller_estimated_days_on_market} jours`
                    : '—'}
                </span>
                <span className="text-zinc-500">Durée réelle observée</span>
                <span className="text-right font-medium">
                  {entry.marketDuration.available && entry.marketDuration.days != null
                    ? `${entry.marketDuration.days} jours`
                    : '—'}
                </span>
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

        {eligibleComparables.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Aucun bien n’a été retenu comme concurrent sérieux ou incertain.
          </p>
        ) : null}

        <label className="flex flex-col gap-1 text-sm font-medium">
          Pourquoi ?
          <select
            name="seller_most_dangerous_reason"
            defaultValue={reason}
            className="max-w-sm rounded-md border border-zinc-300 px-3 py-1.5 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/30 dark:border-zinc-700 dark:bg-zinc-900 font-normal"
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
            className="max-w-xl rounded-md border border-zinc-300 px-3 py-1.5 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/30 dark:border-zinc-700 dark:bg-zinc-900 font-normal"
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
      <div className="rounded-card border border-brand/30 bg-brand/5 p-4">
        <h3 className="font-semibold">Quelle stratégie adopter face à cette concurrence ?</h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
          Échangez avec le vendeur sur le prix de lancement, la présentation du bien et les atouts à
          mettre en avant pour se différencier du concurrent choisi. ACM Studio structure cette
          discussion ; le conseiller définit et explique la stratégie.
        </p>
      </div>
    </div>
  );
}
