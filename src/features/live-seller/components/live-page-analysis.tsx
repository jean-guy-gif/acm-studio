'use client';

import { useActionState } from 'react';

import { SubmitButton } from '@/components/submit-button';
import {
  initialLiveActionState,
  type LiveActionState,
} from '@/features/live-seller/actions/live-action-state';
import type { LiveSellerSummary, PriceGap } from '@/features/live-seller/types';
import type { LiveComparativeData } from '@/features/seller-presentation/types/seller-presentation';

const euro = (value: number | null): string =>
  value != null ? `${Math.round(value).toLocaleString('fr-FR')} €` : '—';

function GapRow({ label, gap }: { label: string; gap: PriceGap }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-zinc-100 py-2 text-sm last:border-0 dark:border-zinc-800">
      <span className="text-zinc-500">{label}</span>
      <span className="font-medium">
        {gap.amount != null
          ? `${gap.amount >= 0 ? '+' : ''}${gap.amount.toLocaleString('fr-FR')} €`
          : '—'}
        {gap.percentage != null ? ` (${gap.percentage >= 0 ? '+' : ''}${gap.percentage} %)` : ''}
      </span>
    </div>
  );
}

// "3. Analyse comparative de marché du conseiller" — a MANUAL advisor input.
// ACM Studio never computes this value. The gaps are shown without any automatic
// judgement.
export function LivePageAnalysis({
  live,
  summary,
  saveAction,
}: {
  live: LiveComparativeData;
  summary: LiveSellerSummary | null;
  saveAction: (state: LiveActionState, formData: FormData) => Promise<LiveActionState>;
}) {
  const [state, formAction] = useActionState(saveAction, initialLiveActionState);
  const advisor =
    state.values?.advisor_comparative_market_price ??
    summary?.advisor_comparative_market_price ??
    '';
  const gaps = live.priceGaps;

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-semibold">Analyse des prix</h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-card border border-zinc-200 p-3 text-sm dark:border-zinc-800">
          <div className="text-xs text-zinc-500">Valeur perçue par le vendeur</div>
          <div className="font-medium">{euro(gaps.sellerPerceivedPrice)}</div>
        </div>
        <div className="rounded-card border border-zinc-200 p-3 text-sm dark:border-zinc-800">
          <div className="text-xs text-zinc-500">
            Positionnement observé sur le marché concurrentiel
          </div>
          <div className="font-medium">{euro(gaps.competitiveMarketCentral)}</div>
        </div>
        <div className="rounded-card border border-zinc-200 p-3 text-sm dark:border-zinc-800">
          <div className="text-xs text-zinc-500">Analyse comparative de marché du conseiller</div>
          <div className="font-medium">{euro(gaps.advisorComparativePrice)}</div>
        </div>
      </div>

      <form
        action={formAction}
        className="flex flex-col gap-3 rounded-card border border-zinc-200 p-4 dark:border-zinc-800"
      >
        <label className="flex flex-col gap-1 text-sm font-medium">
          Analyse comparative de marché du conseiller (€) — saisie manuelle
          <input
            type="number"
            name="advisor_comparative_market_price"
            min={0}
            step="any"
            defaultValue={advisor}
            className="max-w-xs rounded-md border border-zinc-300 px-3 py-1.5 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/30 dark:border-zinc-700 dark:bg-zinc-900 font-normal"
          />
          {state.fieldErrors.advisor_comparative_market_price ? (
            <span role="alert" className="text-sm text-red-600">
              {state.fieldErrors.advisor_comparative_market_price}
            </span>
          ) : null}
        </label>
        {state.error ? (
          <p role="alert" className="text-sm text-red-600">
            {state.error}
          </p>
        ) : null}
        {state.ok ? <p className="text-sm text-emerald-600">Enregistré.</p> : null}
        <SubmitButton pendingLabel="Enregistrement…">Enregistrer</SubmitButton>
      </form>

      <div className="rounded-card border border-zinc-200 p-4 dark:border-zinc-800">
        <div className="mb-2 text-sm font-medium">Écarts observés</div>
        <GapRow label="Vendeur vs marché concurrentiel" gap={gaps.sellerVsMarket} />
        <GapRow label="Vendeur vs analyse conseiller" gap={gaps.sellerVsAdvisor} />
        <GapRow label="Marché concurrentiel vs analyse conseiller" gap={gaps.marketVsAdvisor} />
      </div>
    </div>
  );
}
