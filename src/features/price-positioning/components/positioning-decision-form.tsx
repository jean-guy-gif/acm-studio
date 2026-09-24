'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';

import {
  alertError,
  alertOk,
  btnDanger,
  btnPrimary,
  btnSecondary,
  card,
  fieldLabel,
  inputBase,
  sectionTitle,
} from '@/components/ui/styles';
import { AdvisorPrice } from '@/features/price-positioning/components/advisor-price';
import { SellerPrice } from '@/features/price-positioning/components/seller-price';
import { BasculeBanner } from '@/features/projects/components/bascule-banner';
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
  initialAdvisorAnalysis: number | null;
  initialJustification: string;
  saveAction: (formData: FormData) => Promise<SavePositioningResult>;
  deleteAction: () => Promise<DeletePositioningResult>;
  projectId: string;
};

export function PositioningDecisionForm({
  range,
  defaultAdvisorPrice,
  hasSaved,
  isOutdated,
  initialAdvisorPrice,
  initialSellerPrice,
  initialAdvisorAnalysis,
  initialJustification,
  saveAction,
  deleteAction,
  projectId,
}: Props) {
  const router = useRouter();
  const [becameReady, setBecameReady] = useState(false);
  const [advisorPrice, setAdvisorPrice] = useState<number | null>(initialAdvisorPrice);
  const [sellerPrice, setSellerPrice] = useState<number | null>(initialSellerPrice);
  const [advisorAnalysis, setAdvisorAnalysis] = useState<number | null>(initialAdvisorAnalysis);
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
    analysis: number | null;
    justification: string;
  }) {
    setError(null);
    setMessage(null);
    const formData = new FormData();
    formData.set('advisorPrice', values.advisor == null ? '' : String(values.advisor));
    formData.set('sellerPrice', values.seller == null ? '' : String(values.seller));
    formData.set(
      'advisorComparativeMarketPrice',
      values.analysis == null ? '' : String(values.analysis),
    );
    formData.set('justification', values.justification);
    startTransition(async () => {
      const result = await saveAction(formData);
      if (result.ok) {
        setMessage('Décision enregistrée.');
        // La validation de la fourchette peut avoir fait basculer le dossier (§2).
        if (result.becameReady) {
          setBecameReady(true);
        }
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  function handleReplace() {
    setAdvisorPrice(defaultAdvisorPrice);
    setSellerPrice(null);
    setAdvisorAnalysis(null);
    setJustification('');
    submit({ advisor: defaultAdvisorPrice, seller: null, analysis: null, justification: '' });
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
      {becameReady ? <BasculeBanner projectId={projectId} /> : null}
      <h2 className={sectionTitle}>Décision du conseiller</h2>

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

      <div className={`${card} flex flex-col gap-4 p-5 sm:p-6`}>
        {/* Mission 58 — l'analyse du conseiller (avis de valeur) se prépare ICI, à froid,
            un seul champ facultatif. Elle est ensuite AFFICHÉE dans le Live, jamais saisie
            devant le vendeur. */}
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>Analyse du conseiller — avis de valeur (facultatif)</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              step="any"
              inputMode="numeric"
              placeholder="Votre avis de valeur"
              value={advisorAnalysis == null ? '' : String(advisorAnalysis)}
              onChange={(event) => {
                const raw = event.target.value.trim();
                const parsed = Number(raw);
                setAdvisorAnalysis(raw === '' || !Number.isFinite(parsed) ? null : parsed);
              }}
              className={inputBase}
            />
            <span className="text-zinc-500 stage:text-white/60">€</span>
          </div>
          <span className="text-xs text-zinc-400 stage:text-white/40">
            Affichée dans le Live à côté du marché calculé — jamais saisie devant le vendeur.
          </span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>Justification (facultative)</span>
          <textarea
            name="justification"
            rows={3}
            maxLength={MAX_JUSTIFICATION_LENGTH}
            value={justification}
            onChange={(event) => setJustification(event.target.value)}
            className={inputBase}
          />
          <span className="text-xs text-zinc-400 stage:text-white/40">
            {justification.length} / {MAX_JUSTIFICATION_LENGTH}
          </span>
        </label>

        {error ? (
          <p role="alert" className={alertError}>
            {error}
          </p>
        ) : null}
        {message ? <p className={alertOk}>{message}</p> : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={btnPrimary}
            disabled={pending}
            onClick={() =>
              submit({
                advisor: advisorPrice,
                seller: sellerPrice,
                analysis: advisorAnalysis,
                justification,
              })
            }
          >
            {hasSaved ? 'Mettre à jour la décision' : 'Enregistrer la décision'}
          </button>

          {hasSaved && isOutdated ? (
            <button
              type="button"
              className={btnSecondary}
              disabled={pending}
              onClick={handleReplace}
            >
              Remplacer par le calcul courant
            </button>
          ) : null}

          {hasSaved ? (
            <button type="button" className={btnDanger} disabled={pending} onClick={handleDelete}>
              Supprimer la décision
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
