'use client';

import { useActionState } from 'react';

import { SubmitButton } from '@/components/submit-button';
import {
  initialLiveActionState,
  type LiveActionState,
} from '@/features/live-seller/actions/live-action-state';
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
  statLabel,
} from '@/features/live-seller/components/live-stage';
import type { LiveSellerSummary, PriceGap } from '@/features/live-seller/types';
import type { LiveComparativeData } from '@/features/seller-presentation/types/seller-presentation';

const euro = (value: number | null): string =>
  value != null ? `${Math.round(value).toLocaleString('fr-FR')}\u00A0€` : '—';

function GapRow({ label, gap }: { label: string; gap: PriceGap }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-zinc-100 py-2.5 text-base last:border-0 stage:border-white/10">
      <span className="text-zinc-500 stage:text-white/60">{label}</span>
      <span className="font-title font-semibold text-zinc-900 stage:text-white">
        {gap.amount != null
          ? `${gap.amount >= 0 ? '+' : ''}${gap.amount.toLocaleString('fr-FR')}\u00A0€`
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
    <div className="flex flex-col gap-6 sm:gap-8">
      <div className="flex flex-col gap-3">
        <h2 className={question}>Analyse des prix</h2>
        <p className={questionHint}>
          Trois repères, côte à côte : la perception, le marché observé, l’analyse du conseiller.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className={`${panel} flex flex-col gap-1.5`}>
          <div className={statLabel}>Valeur perçue par le vendeur</div>
          <div className={bigValue}>{euro(gaps.sellerPerceivedPrice)}</div>
        </div>
        <div className={`${panel} flex flex-col gap-1.5`}>
          <div className={statLabel}>Positionnement observé sur le marché concurrentiel</div>
          <div className={bigValue}>{euro(gaps.competitiveMarketCentral)}</div>
        </div>
        <div className={`${panel} flex flex-col gap-1.5`}>
          <div className={statLabel}>Analyse comparative de marché du conseiller</div>
          <div className={bigValue}>{euro(gaps.advisorComparativePrice)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
        <form action={formAction} className={`${panel} flex h-fit flex-col gap-4`}>
          <label className="flex flex-col gap-2">
            <span className={statLabel}>
              Analyse comparative de marché du conseiller — saisie manuelle
            </span>
            <div className="flex items-center gap-3">
              <input
                type="number"
                name="advisor_comparative_market_price"
                min={0}
                step="any"
                placeholder="0"
                defaultValue={advisor}
                className={bigInput}
              />
              <span className={bigInputUnit}>€</span>
            </div>
            {state.fieldErrors.advisor_comparative_market_price ? (
              <span role="alert" className={errorText}>
                {state.fieldErrors.advisor_comparative_market_price}
              </span>
            ) : null}
          </label>
          {state.error ? (
            <p role="alert" className={errorText}>
              {state.error}
            </p>
          ) : null}
          {state.ok ? <p className={okText}>Enregistré.</p> : null}
          <SubmitButton pendingLabel="Enregistrement…" className={ctaPrimary}>
            Enregistrer
          </SubmitButton>
        </form>

        <div className={`${panelSoft} h-fit`}>
          <div className={`${statLabel} mb-2`}>Écarts observés</div>
          <GapRow label="Vendeur vs marché concurrentiel" gap={gaps.sellerVsMarket} />
          <GapRow label="Vendeur vs analyse conseiller" gap={gaps.sellerVsAdvisor} />
          <GapRow label="Marché concurrentiel vs analyse conseiller" gap={gaps.marketVsAdvisor} />
        </div>
      </div>
    </div>
  );
}
