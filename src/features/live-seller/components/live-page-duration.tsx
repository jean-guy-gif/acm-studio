'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useEffect } from 'react';

import { SubmitButton } from '@/components/submit-button';
import {
  initialLiveActionState,
  type LiveActionState,
} from '@/features/live-seller/actions/live-action-state';
import { LiveComparableHeader } from '@/features/live-seller/components/live-comparable-header';
import { LiveFeatureComparison } from '@/features/live-seller/components/live-feature-comparison';
import { LiveGallery } from '@/features/live-seller/components/live-gallery';
import {
  MARKET_DURATION_REASONS,
  MARKET_DURATION_REASON_LABELS,
  SERIOUS_COMPETITOR_LABELS,
  type SeriousCompetitor,
} from '@/features/live-seller/constants';
import type { LiveComparableEntry } from '@/features/seller-presentation/types/seller-presentation';

const euro = (value: number | null): string =>
  value != null ? `${Math.round(value).toLocaleString('fr-FR')} €` : '—';

// Page 3 — "Pourquoi est-il toujours sur le marché ?" Keeps the same fiche and now
// shows price, price/m², observed duration and history alongside the prior answers.
export function LivePageDuration({
  entry,
  saveAction,
}: {
  entry: LiveComparableEntry;
  saveAction: (state: LiveActionState, formData: FormData) => Promise<LiveActionState>;
}) {
  const [state, formAction] = useActionState(saveAction, initialLiveActionState);
  const router = useRouter();
  const response = entry.response;
  const currentReason =
    state.values?.seller_market_duration_reason ?? response?.seller_market_duration_reason ?? '';
  const currentComment =
    state.values?.seller_market_duration_comment ?? response?.seller_market_duration_comment ?? '';
  const savedEstimatedDays = response?.seller_estimated_days_on_market ?? null;
  const currentEstimatedDays =
    state.values?.seller_estimated_days_on_market ?? savedEstimatedDays ?? '';
  const durationRevealed = savedEstimatedDays != null;

  useEffect(() => {
    if (state.ok) {
      router.refresh();
    }
  }, [router, state]);

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-semibold">Pourquoi est-il toujours sur le marché ?</h2>
      <LiveGallery photos={entry.photoUrls} alt={entry.title ?? 'Bien concurrent'} />
      <LiveComparableHeader entry={entry} />

      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <div>
          <div className="text-xs text-zinc-500">Prix affiché</div>
          <div className="font-medium">{euro(entry.price)}</div>
        </div>
        <div>
          <div className="text-xs text-zinc-500">Prix au m²</div>
          <div className="font-medium">
            {entry.pricePerSquareMeter != null
              ? `${entry.pricePerSquareMeter.toLocaleString('fr-FR')} €/m²`
              : '—'}
          </div>
        </div>
        {durationRevealed ? (
          <div>
            <div className="text-xs text-zinc-500">Durée observée</div>
            <div className="font-medium">
              {entry.marketDuration.available ? entry.marketDuration.label : 'Non disponible'}
            </div>
          </div>
        ) : null}
      </div>

      {durationRevealed ? (
        entry.priceHistory.available ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Prix initial {euro(entry.priceHistory.initialPrice)} · Baisse{' '}
            {euro(entry.priceHistory.totalDropAmount)}
          </p>
        ) : (
          <p className="text-sm text-zinc-500">Historique de prix non disponible.</p>
        )
      ) : null}

      <div className="rounded-card border border-zinc-200 p-3 text-sm dark:border-zinc-800">
        <p>
          Sérieux concurrent :{' '}
          <span className="font-medium">
            {response?.seller_serious_competitor
              ? SERIOUS_COMPETITOR_LABELS[response.seller_serious_competitor as SeriousCompetitor]
              : 'Non renseigné'}
          </span>
        </p>
        <p>Estimation du vendeur : {euro(response?.seller_estimated_listing_price ?? null)}</p>
      </div>

      <LiveFeatureComparison items={entry.featureComparison} />

      <form
        action={formAction}
        className="flex flex-col gap-3 rounded-card border border-zinc-200 p-4 dark:border-zinc-800"
      >
        <label className="flex flex-col gap-1 text-sm font-medium">
          Depuis combien de jours pensez-vous que ce bien est sur le marché ?
          <input
            type="number"
            name="seller_estimated_days_on_market"
            min={0}
            step={1}
            defaultValue={currentEstimatedDays}
            className="max-w-xs rounded-md border border-zinc-300 px-3 py-1.5 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/30 dark:border-zinc-700 dark:bg-zinc-900 font-normal"
          />
          {state.fieldErrors.seller_estimated_days_on_market ? (
            <span role="alert" className="text-sm text-red-600">
              {state.fieldErrors.seller_estimated_days_on_market}
            </span>
          ) : null}
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Selon vous, pourquoi ?
          <select
            name="seller_market_duration_reason"
            defaultValue={currentReason}
            className="rounded-md border border-zinc-300 px-3 py-1.5 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/30 dark:border-zinc-700 dark:bg-zinc-900 font-normal"
          >
            <option value="">— Choisir —</option>
            {MARKET_DURATION_REASONS.map((reason) => (
              <option key={reason} value={reason}>
                {MARKET_DURATION_REASON_LABELS[reason]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Commentaire (facultatif)
          <textarea
            name="seller_market_duration_comment"
            rows={2}
            defaultValue={currentComment}
            className="rounded-md border border-zinc-300 px-3 py-1.5 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/30 dark:border-zinc-700 dark:bg-zinc-900 font-normal"
          />
        </label>
        {state.error ? (
          <p role="alert" className="text-sm text-red-600">
            {state.error}
          </p>
        ) : null}
        {state.ok ? <p className="text-sm text-emerald-600">Réponse enregistrée.</p> : null}
        <SubmitButton pendingLabel="Enregistrement…">
          {durationRevealed ? 'Mettre à jour' : 'Valider et révéler la durée observée'}
        </SubmitButton>
      </form>
      {!durationRevealed ? (
        <p className="text-sm text-zinc-500">
          Donnez d’abord votre estimation : la durée réellement observée s’affichera ensuite.
        </p>
      ) : null}
    </div>
  );
}
