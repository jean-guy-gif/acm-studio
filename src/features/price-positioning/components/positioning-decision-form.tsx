'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import {
  alertError,
  alertOk,
  btnDanger,
  btnPrimary,
  btnSecondary,
  fieldLabel,
  inputBase,
} from '@/components/ui/styles';
import { DECISION_LOCKED_MESSAGE } from '@/features/price-positioning/services/decision-lock';
import { BasculeBanner } from '@/features/projects/components/bascule-banner';
import type { DeletePositioningResult } from '@/features/price-positioning/actions/delete-price-positioning';
import type { SavePositioningResult } from '@/features/price-positioning/actions/save-price-positioning';
import { MAX_JUSTIFICATION_LENGTH } from '@/features/price-positioning/types/saved-price-positioning';
import {
  priceLine,
  type RealSalesSummary,
} from '@/features/address-dossier/services/dossier-texts';

type Props = {
  defaultAdvisorPrice: number;
  // D'où vient le montant proposé — « Prix médian au m² × 140 m² ».
  formulaNote: string;
  hasSaved: boolean;
  isOutdated: boolean;
  initialAdvisorPrice: number;
  initialAdvisorAnalysis: number | null;
  initialJustification: string;
  saveAction: (formData: FormData) => Promise<SavePositioningResult>;
  deleteAction: () => Promise<DeletePositioningResult>;
  projectId: string;
  // Mission 111 — dossier conclu ou archivé : la décision se lit, ne se modifie plus.
  locked?: boolean;
  // Mission 141 — les ventes réelles du dossier d'adresse, pour situer l'analyse de valeur dès la
  // frappe ; une information, jamais une recommandation de prix.
  realSales?: RealSalesSummary | null;
};

const shownToSeller = 'text-xs font-medium text-amber-700 stage:text-amber-300';

function parseAmount(raw: string): number | null {
  const trimmed = raw.trim();
  const parsed = Number(trimmed);
  return trimmed === '' || !Number.isFinite(parsed) ? null : parsed;
}

// Mission 91 — « Votre décision » : trois champs, un bouton. Le « prix souhaité vendeur »
// n'est plus saisi ici (la valeur perçue recueillie au début du Live suffit, M82).
export function PositioningDecisionForm({
  defaultAdvisorPrice,
  formulaNote,
  hasSaved,
  isOutdated,
  initialAdvisorPrice,
  initialAdvisorAnalysis,
  initialJustification,
  saveAction,
  deleteAction,
  projectId,
  locked = false,
  realSales = null,
}: Props) {
  const router = useRouter();
  const [becameReady, setBecameReady] = useState(false);
  const [advisorPrice, setAdvisorPrice] = useState<number | null>(initialAdvisorPrice);
  const [advisorAnalysis, setAdvisorAnalysis] = useState<number | null>(initialAdvisorAnalysis);
  const [justification, setJustification] = useState<string>(initialJustification);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(values: { advisor: number | null; analysis: number | null; text: string }) {
    setError(null);
    setMessage(null);
    const formData = new FormData();
    formData.set('advisorPrice', values.advisor == null ? '' : String(values.advisor));
    formData.set(
      'advisorComparativeMarketPrice',
      values.analysis == null ? '' : String(values.analysis),
    );
    formData.set('justification', values.text);
    startTransition(async () => {
      const result = await saveAction(formData);
      if (result.ok) {
        setMessage('Décision enregistrée.');
        // La validation de la décision peut avoir fait basculer le dossier (M52).
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
    submit({ advisor: defaultAdvisorPrice, analysis: advisorAnalysis, text: justification });
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
    <fieldset disabled={locked} className="flex min-w-0 flex-col gap-4">
      {becameReady ? <BasculeBanner projectId={projectId} /> : null}
      {locked ? (
        <p className={alertOk} data-testid="decision-locked">
          {DECISION_LOCKED_MESSAGE}
        </p>
      ) : null}

      {/* Mission 89 — calculé sur les concurrents retenus : il porte ce nom, et reste modifiable. */}
      <label className="flex flex-col gap-1.5">
        <span className={fieldLabel}>Prix des concurrents (calculé, modifiable)</span>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            step="any"
            inputMode="numeric"
            value={advisorPrice ?? ''}
            onChange={(event) => setAdvisorPrice(parseAmount(event.target.value))}
            className={inputBase}
          />
          <span className="text-zinc-500 stage:text-white/60">€</span>
        </div>
        <span className="text-xs text-zinc-500 stage:text-white/50">
          {formulaNote} <span className={shownToSeller}>Affiché au vendeur.</span>
        </span>
      </label>

      {/* Mission 58 — l'analyse du conseiller (avis de valeur) se prépare ICI, à froid. Elle est
          ensuite AFFICHÉE dans le Live, jamais saisie devant le vendeur. */}
      <label className="flex flex-col gap-1.5">
        <span className={fieldLabel}>Votre analyse de valeur (facultatif)</span>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            step="any"
            inputMode="numeric"
            placeholder="Votre avis, en euros"
            value={advisorAnalysis == null ? '' : String(advisorAnalysis)}
            onChange={(event) => setAdvisorAnalysis(parseAmount(event.target.value))}
            className={inputBase}
          />
          <span className="text-zinc-500 stage:text-white/60">€</span>
        </div>
        <span className={shownToSeller}>Affiché au vendeur à la fin du Live</span>
        {realSales ? (
          <span className="text-sm text-zinc-700 stage:text-white/80" data-testid="real-sales-line">
            {priceLine(realSales, advisorAnalysis)}
          </span>
        ) : null}
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={fieldLabel}>Justification (facultatif)</span>
        <textarea
          name="justification"
          rows={3}
          maxLength={MAX_JUSTIFICATION_LENGTH}
          value={justification}
          onChange={(event) => setJustification(event.target.value)}
          className={inputBase}
        />
        <span className="flex flex-wrap justify-between gap-x-3 text-xs text-zinc-400 stage:text-white/40">
          {/* Mission 89 — ce texte est lu par le vendeur : le conseiller le sait en l'écrivant. */}
          <span className={shownToSeller}>Affiché au vendeur à la fin du Live</span>
          <span>
            {justification.length} / {MAX_JUSTIFICATION_LENGTH}
          </span>
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
          // Mission 110 — principal tant qu'aucune décision n'est enregistrée : c'est l'étape à faire.
          className={hasSaved ? btnSecondary : btnPrimary}
          disabled={pending}
          onClick={() =>
            submit({ advisor: advisorPrice, analysis: advisorAnalysis, text: justification })
          }
        >
          Enregistrer la décision
        </button>

        {hasSaved && isOutdated ? (
          <button type="button" className={btnSecondary} disabled={pending} onClick={handleReplace}>
            Reprendre le prix calculé
          </button>
        ) : null}

        {hasSaved ? (
          <button type="button" className={btnDanger} disabled={pending} onClick={handleDelete}>
            Supprimer la décision
          </button>
        ) : null}
      </div>
    </fieldset>
  );
}
