'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';

import { AdvisorPrice } from '@/features/price-positioning/components/advisor-price';
import { SellerPrice } from '@/features/price-positioning/components/seller-price';
import type { DeletePositioningResult } from '@/features/price-positioning/actions/delete-price-positioning';
import type { SavePositioningResult } from '@/features/price-positioning/actions/save-price-positioning';
import {
  calculatePriceDeviation,
  resolveMarketPosition,
} from '@/features/price-positioning/services/calculate-price-deviation';
import { MAX_JUSTIFICATION_LENGTH } from '@/features/price-positioning/types/saved-price-positioning';
import type { RecommendedRange } from '@/features/price-positioning/types/price-positioning';

type Props = {
  range: RecommendedRange;
  defaultAdvisorPrice: number;
  hasSaved: boolean;
  isOutdated: boolean;
  initialAdvisorPrice: number;
  initialSellerPrice: number | null;
  initialJustification: string;
  saveAction: (formData: FormData) => Promise<SavePositioningResult>;
  deleteAction: () => Promise<DeletePositioningResult>;
};

const buttonClass =
  'rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-200 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800';

export function PositioningDecisionForm({
  range,
  defaultAdvisorPrice,
  hasSaved,
  isOutdated,
  initialAdvisorPrice,
  initialSellerPrice,
  initialJustification,
  saveAction,
  deleteAction,
}: Props) {
  const router = useRouter();
  const [advisorPrice, setAdvisorPrice] = useState<number | null>(initialAdvisorPrice);
  const [sellerPrice, setSellerPrice] = useState<number | null>(initialSellerPrice);
  const [justification, setJustification] = useState<string>(initialJustification);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const derived = useMemo(
    () => ({
      advisorDeviation: calculatePriceDeviation(advisorPrice, range.central),
      advisorPosition: resolveMarketPosition(advisorPrice, range.low, range.high),
      sellerDeviationFromCentral: calculatePriceDeviation(sellerPrice, range.central),
      sellerDeviationFromAdvisor: calculatePriceDeviation(sellerPrice, advisorPrice),
      sellerPosition: resolveMarketPosition(sellerPrice, range.low, range.high),
    }),
    [advisorPrice, sellerPrice, range.central, range.low, range.high],
  );

  function submit(values: {
    advisor: number | null;
    seller: number | null;
    justification: string;
  }) {
    setError(null);
    setMessage(null);
    const formData = new FormData();
    formData.set('advisorPrice', values.advisor == null ? '' : String(values.advisor));
    formData.set('sellerPrice', values.seller == null ? '' : String(values.seller));
    formData.set('justification', values.justification);
    startTransition(async () => {
      const result = await saveAction(formData);
      if (result.ok) {
        setMessage('Décision enregistrée.');
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  function handleReplace() {
    setAdvisorPrice(defaultAdvisorPrice);
    setSellerPrice(null);
    setJustification('');
    submit({ advisor: defaultAdvisorPrice, seller: null, justification: '' });
  }

  function handleDelete() {
    if (!window.confirm('Supprimer définitivement la décision enregistrée ?')) {
      return;
    }
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await deleteAction();
      if (result.ok) {
        setMessage('Décision supprimée.');
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-medium">Décision du conseiller</h2>

      <AdvisorPrice
        price={advisorPrice}
        onChange={setAdvisorPrice}
        deviationFromCentral={derived.advisorDeviation}
        position={derived.advisorPosition}
      />
      <SellerPrice
        price={sellerPrice}
        onChange={setSellerPrice}
        deviationFromCentral={derived.sellerDeviationFromCentral}
        deviationFromAdvisor={derived.sellerDeviationFromAdvisor}
        position={derived.sellerPosition}
      />

      <label className="flex flex-col gap-1">
        Justification (facultative)
        <textarea
          name="justification"
          rows={3}
          maxLength={MAX_JUSTIFICATION_LENGTH}
          value={justification}
          onChange={(event) => setJustification(event.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-1.5 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/30 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <span className="text-xs text-zinc-500">
          {justification.length} / {MAX_JUSTIFICATION_LENGTH}
        </span>
      </label>

      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm text-emerald-600">{message}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={buttonClass}
          disabled={pending}
          onClick={() => submit({ advisor: advisorPrice, seller: sellerPrice, justification })}
        >
          {hasSaved ? 'Mettre à jour la décision' : 'Enregistrer la décision'}
        </button>

        {hasSaved && isOutdated ? (
          <button type="button" className={buttonClass} disabled={pending} onClick={handleReplace}>
            Remplacer par le calcul courant
          </button>
        ) : null}

        {hasSaved ? (
          <button type="button" className={buttonClass} disabled={pending} onClick={handleDelete}>
            Supprimer la décision
          </button>
        ) : null}
      </div>
    </div>
  );
}
