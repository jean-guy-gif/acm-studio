'use client';

import { useState, useTransition } from 'react';

import { btnSecondary, link } from '@/components/ui/styles';
import { addProspectingOpposition } from '@/features/prospecting/actions/add-prospecting-opposition';
import { announceOppositionRecorded } from '@/features/prospecting/components/opposition-notice';

const small = 'px-3 py-1.5 text-xs';

// Mission 98 — « Ne plus solliciter » : le propriétaire a demandé à ne plus être contacté.
// L'adresse est bloquée pour toute l'agence, dans tous les dossiers ; on confirme dans l'écran,
// sans boîte du navigateur, parce que le geste ne s'annule pas d'ici.
export function OppositionButton({
  projectId,
  competitorId,
}: {
  projectId: string;
  competitorId: string;
}) {
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const confirm = () => {
    setError(null);
    startTransition(async () => {
      const result = await addProspectingOpposition(projectId, competitorId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setAsking(false);
      // La carte quitte le tableau : la page confirme l'enregistrement (mission 103).
      announceOppositionRecorded();
    });
  };

  if (!asking) {
    return (
      <button
        type="button"
        onClick={() => setAsking(true)}
        className={`${link} self-start text-xs print:hidden`}
      >
        Ne plus solliciter
      </button>
    );
  }

  return (
    <div
      role="group"
      aria-label="Ne plus solliciter cette adresse"
      className="flex flex-col gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900 stage:border-amber-300/40 stage:bg-amber-300/10 stage:text-amber-100 print:hidden"
    >
      <p>
        Ne plus solliciter cette adresse&nbsp;? Elle sera bloquée pour toute l’agence, dans tous les
        dossiers&nbsp;: plus de courrier, plus de tournée.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => setAsking(false)}
          className={`${btnSecondary} ${small}`}
        >
          Annuler
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={confirm}
          className={`${btnSecondary} ${small}`}
        >
          Confirmer : ne plus solliciter
        </button>
      </div>
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}
