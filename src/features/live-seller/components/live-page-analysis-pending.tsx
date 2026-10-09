'use client';

import {
  navBtn,
  panel,
  question,
  questionHint,
  statValue,
} from '@/features/live-seller/components/live-stage';
import type { PendingLiveStep } from '@/features/live-seller/services/pending-before-analysis';

// MISSION 82 — « Analyse des prix » attend que chaque concurrent soit estimé ou écarté.
// Si une étape a été sautée, l'écran ne reste jamais vide : il dit ce qui reste à passer
// et y mène. Formulation sobre (le vendeur regarde), aucun montant, libellés neutres.
export function LivePageAnalysisPending({
  steps,
  onOpen,
  onShowAnalysis,
  busy,
}: {
  steps: PendingLiveStep[];
  onOpen: (pageIndex: number) => void;
  // Plus rien à passer mais l'analyse n'a pas encore été demandée (arrivée au clavier).
  onShowAnalysis: () => void;
  busy: boolean;
}) {
  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <div className="flex flex-col gap-3">
        <h2 className={question}>Analyse des prix</h2>
        <p className={questionHint}>
          {steps.length > 0 ? 'Il reste à passer :' : 'Tout est passé, l’analyse est prête.'}
        </p>
      </div>

      {steps.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {steps.map((step) => (
            <li
              key={step.key}
              className={`${panel} flex flex-wrap items-center justify-between gap-3`}
            >
              <span className={statValue}>{step.label}</span>
              <button type="button" onClick={() => onOpen(step.pageIndex)} className={navBtn}>
                Y aller
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div>
          <button type="button" onClick={onShowAnalysis} disabled={busy} className={navBtn}>
            Afficher l’analyse
          </button>
        </div>
      )}
    </div>
  );
}
