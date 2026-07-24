'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useEffect } from 'react';

import { SubmitButton } from '@/components/submit-button';
import {
  initialLiveActionState,
  type LiveActionState,
} from '@/features/live-seller/actions/live-action-state';
import { LiveComparableHeader } from '@/features/live-seller/components/live-comparable-header';
import { LiveGallery } from '@/features/live-seller/components/live-gallery';
import type { LiveComparableEntry } from '@/features/seller-presentation/types/seller-presentation';

const euro = (value: number | null): string =>
  value != null ? `${Math.round(value).toLocaleString('fr-FR')} €` : '—';

function PriceHistoryBlock({ entry }: { entry: LiveComparableEntry }) {
  const history = entry.priceHistory;
  if (!history.available) {
    return <p className="text-sm text-zinc-500">Historique de prix non disponible.</p>;
  }
  return (
    <div className="flex flex-col gap-1 text-sm">
      <div className="font-medium">Historique de prix</div>
      <p className="text-zinc-600 dark:text-zinc-300">
        Prix initial {euro(history.initialPrice)} · Prix actuel {euro(history.currentPrice)} ·
        Baisse {euro(history.totalDropAmount)}
        {history.totalDropPercentage != null ? ` (${history.totalDropPercentage} %)` : ''}
        {history.source ? ` · Source : ${history.source}` : ''}
      </p>
    </div>
  );
}

// Page 2 — "À quel prix est-il sur le marché ?" The seller must estimate a price
// BEFORE the real one is revealed.
export function LivePagePrice({
  entry,
  saveAction,
}: {
  entry: LiveComparableEntry;
  saveAction: (state: LiveActionState, formData: FormData) => Promise<LiveActionState>;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(saveAction, initialLiveActionState);
  const response = entry.response;

  // Refresh server data once after a save so the reveal reflects the persisted
  // estimate (and recomputed gap / position).
  useEffect(() => {
    if (state.ok) {
      router.refresh();
    }
  }, [state.ok, router]);

  const savedEstimate = response?.seller_estimated_listing_price ?? null;
  const revealed = savedEstimate != null;
  const reveal = entry.priceReveal;

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-semibold">À quel prix pensez-vous que ce bien est proposé ?</h2>
      <LiveGallery photos={entry.photoUrls} alt={entry.title ?? 'Bien concurrent'} />
      <LiveComparableHeader entry={entry} />

      <form
        action={formAction}
        className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
      >
        <input
          type="hidden"
          name="seller_serious_competitor"
          value={response?.seller_serious_competitor ?? ''}
        />
        <input
          type="hidden"
          name="seller_serious_competitor_comment"
          value={response?.seller_serious_competitor_comment ?? ''}
        />
        <input
          type="hidden"
          name="seller_market_duration_reason"
          value={response?.seller_market_duration_reason ?? ''}
        />
        <input
          type="hidden"
          name="seller_market_duration_comment"
          value={response?.seller_market_duration_comment ?? ''}
        />
        <label className="flex flex-col gap-1 text-sm font-medium">
          Prix imaginé par le vendeur (€)
          <input
            type="number"
            name="seller_estimated_listing_price"
            min={0}
            step="any"
            defaultValue={state.values?.seller_estimated_listing_price ?? savedEstimate ?? ''}
            className="rounded border px-2 py-1 font-normal"
          />
          {state.fieldErrors.seller_estimated_listing_price ? (
            <span role="alert" className="text-sm text-red-600">
              {state.fieldErrors.seller_estimated_listing_price}
            </span>
          ) : null}
        </label>
        {state.error ? (
          <p role="alert" className="text-sm text-red-600">
            {state.error}
          </p>
        ) : null}
        <SubmitButton pendingLabel="Validation…">
          {revealed ? 'Mettre à jour' : 'Valider et révéler le prix'}
        </SubmitButton>
      </form>

      {revealed ? (
        <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div>
              <div className="text-xs text-zinc-500">Prix imaginé</div>
              <div className="font-medium">{euro(savedEstimate)}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-500">Prix affiché</div>
              <div className="font-medium">{euro(reveal.currentPrice)}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-500">Prix au m²</div>
              <div className="font-medium">
                {reveal.pricePerSquareMeter != null
                  ? `${reveal.pricePerSquareMeter.toLocaleString('fr-FR')} €/m²`
                  : '—'}
              </div>
            </div>
            <div>
              <div className="text-xs text-zinc-500">Écart</div>
              <div className="font-medium">
                {reveal.gapAmount != null
                  ? `${reveal.gapAmount >= 0 ? '+' : ''}${reveal.gapAmount.toLocaleString('fr-FR')} €`
                  : '—'}
                {reveal.gapPercentage != null
                  ? ` (${reveal.gapPercentage >= 0 ? '+' : ''}${reveal.gapPercentage} %)`
                  : ''}
              </div>
            </div>
            <div>
              <div className="text-xs text-zinc-500">Position (prix/m²)</div>
              <div className="font-medium">
                {reveal.relativePosition
                  ? `${reveal.relativePosition.rank} / ${reveal.relativePosition.total}`
                  : '—'}
              </div>
            </div>
          </div>
          <PriceHistoryBlock entry={entry} />
        </div>
      ) : (
        <p className="text-sm text-zinc-500">
          Donnez d’abord votre estimation : le prix réel s’affichera ensuite.
        </p>
      )}
    </div>
  );
}
