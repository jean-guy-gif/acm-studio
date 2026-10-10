'use client';

import { useState, useTransition } from 'react';

import { btnPrimary, btnSecondary, link } from '@/components/ui/styles';
import { setProspectingStatus } from '@/features/prospecting/actions/set-prospecting-status';
import type {
  ProspectingMove,
  ProspectingStatus,
} from '@/features/prospecting/services/prospecting-status';

const small = 'px-3 py-1.5 text-xs';

// Les gestes offerts par statut : un geste principal, et « Annuler » pour revenir d'un cran.
const MOVES: Record<ProspectingStatus, { move: ProspectingMove; label: string }[]> = {
  to_confirm: [],
  ready: [{ move: 'handed', label: 'Marquer remis' }],
  handed: [
    { move: 'meeting', label: 'RDV obtenu' },
    { move: 'declined', label: 'Pas intéressé' },
  ],
  meeting: [{ move: 'mandate', label: 'Mandat rentré' }],
  mandate: [],
  declined: [],
};
const CAN_UNDO: ProspectingStatus[] = ['handed', 'meeting', 'mandate', 'declined'];

// Mission 86 — faire avancer la prospection d'un concurrent depuis sa carte. Le serveur relit le
// statut et refuse un saut de cran ; son message s'affiche ici.
export function ProspectingStatusActions({
  projectId,
  competitorId,
  status,
  primary = false,
}: {
  projectId: string;
  competitorId: string;
  status: ProspectingStatus;
  // Vrai quand ce geste est l'action principale de la carte (aucune autre avant lui).
  primary?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const moves = MOVES[status];
  const canUndo = CAN_UNDO.includes(status);
  if (moves.length === 0 && !canUndo) {
    return null;
  }

  const run = (move: ProspectingMove) => {
    setError(null);
    startTransition(async () => {
      const result = await setProspectingStatus(projectId, competitorId, move);
      if (!result.ok) {
        setError(result.error);
      }
    });
  };

  return (
    <div className="flex flex-col gap-1.5 print:hidden">
      <div className="flex flex-wrap items-center gap-2">
        {moves.map(({ move, label }, index) => (
          <button
            key={move}
            type="button"
            disabled={pending}
            onClick={() => run(move)}
            className={`${primary && index === 0 ? btnPrimary : btnSecondary} ${small}`}
          >
            {label}
          </button>
        ))}
        {canUndo ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => run('back')}
            className={`${link} text-xs`}
          >
            Annuler
          </button>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="text-xs text-red-600 stage:text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}
