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
import {
  bigInput,
  bigInputUnit,
  bigValue,
  ctaPrimary,
  errorText,
  okText,
  panel,
  panelSoft,
  question,
  questionHint,
  revealValue,
  statLabel,
  statValue,
} from '@/features/live-seller/components/live-stage';
import type { LiveComparableEntry } from '@/features/seller-presentation/types/seller-presentation';

const euro = (value: number | null): string =>
  value != null ? `${Math.round(value).toLocaleString('fr-FR')}\u00A0€` : '—';

function PriceHistoryBlock({ entry }: { entry: LiveComparableEntry }) {
  const history = entry.priceHistory;
  if (!history.available) {
    return (
      <p className="text-sm text-zinc-400 stage:text-white/50">
        Historique de prix non disponible.
      </p>
    );
  }
  return (
    <div className={`${panelSoft} flex flex-wrap items-baseline gap-x-6 gap-y-2`}>
      <div>
        <div className={statLabel}>Prix initial</div>
        <div className={statValue}>{euro(history.initialPrice)}</div>
      </div>
      <div>
        <div className={statLabel}>Prix actuel</div>
        <div className={statValue}>{euro(history.currentPrice)}</div>
      </div>
      <div>
        <div className={statLabel}>Baisse</div>
        <div className={statValue}>
          {euro(history.totalDropAmount)}
          {history.totalDropPercentage != null ? ` (${history.totalDropPercentage} %)` : ''}
        </div>
      </div>
      {history.source ? (
        <div className="text-xs text-zinc-400 stage:text-white/40">Source : {history.source}</div>
      ) : null}
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
    <div className="flex flex-col gap-6 sm:gap-8">
      <div className="flex flex-col gap-3">
        <h2 className={question}>À quel prix pensez-vous que ce bien est proposé ?</h2>
        {!revealed ? (
          <p className={questionHint}>
            Donnez votre estimation : le prix réel s’affichera ensuite.
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_1fr] lg:gap-8">
        <div className="flex flex-col gap-4">
          <LiveGallery photos={entry.photoUrls} alt={entry.title ?? 'Bien concurrent'} />
          <LiveComparableHeader entry={entry} />
        </div>

        <div className="flex h-fit flex-col gap-4">
          <form action={formAction} className={`${panel} flex flex-col gap-4`}>
            <label className="flex flex-col gap-2">
              <span className={statLabel}>Le prix imaginé par le vendeur</span>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  name="seller_estimated_listing_price"
                  min={0}
                  step="any"
                  placeholder="0"
                  defaultValue={state.values?.seller_estimated_listing_price ?? savedEstimate ?? ''}
                  className={bigInput}
                />
                <span className={bigInputUnit}>€</span>
              </div>
              {state.fieldErrors.seller_estimated_listing_price ? (
                <span role="alert" className={errorText}>
                  {state.fieldErrors.seller_estimated_listing_price}
                </span>
              ) : null}
            </label>
            {state.error ? (
              <p role="alert" className={errorText}>
                {state.error}
              </p>
            ) : null}
            {state.ok ? <p className={okText}>Estimation enregistrée.</p> : null}
            <SubmitButton pendingLabel="Validation…" className={ctaPrimary}>
              {revealed ? 'Mettre à jour l’estimation' : 'Valider et révéler le prix'}
            </SubmitButton>
          </form>

          {revealed ? (
            <div className={`${panel} live-reveal-pop flex flex-col gap-5`}>
              <div>
                <div className={statLabel}>Prix affiché sur le marché</div>
                <div className={revealValue}>{euro(reveal.currentPrice)}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className={statLabel}>Prix imaginé</div>
                  <div className={bigValue}>{euro(savedEstimate)}</div>
                </div>
                <div>
                  <div className={statLabel}>Écart</div>
                  <div className={bigValue}>
                    {reveal.gapAmount != null
                      ? `${reveal.gapAmount >= 0 ? '+' : ''}${reveal.gapAmount.toLocaleString('fr-FR')}\u00A0€`
                      : '—'}
                  </div>
                  {reveal.gapPercentage != null ? (
                    <div className="text-sm text-zinc-500 stage:text-white/60">
                      {reveal.gapPercentage >= 0 ? '+' : ''}
                      {reveal.gapPercentage} %
                    </div>
                  ) : null}
                </div>
                <div>
                  <div className={statLabel}>Prix au m²</div>
                  <div className={statValue}>
                    {reveal.pricePerSquareMeter != null
                      ? `${reveal.pricePerSquareMeter.toLocaleString('fr-FR')}\u00A0€/m²`
                      : '—'}
                  </div>
                </div>
                <div>
                  <div className={statLabel}>Position (prix/m²)</div>
                  <div className={statValue}>
                    {reveal.relativePosition
                      ? `${reveal.relativePosition.rank} / ${reveal.relativePosition.total}`
                      : '—'}
                  </div>
                </div>
              </div>
              <PriceHistoryBlock entry={entry} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
