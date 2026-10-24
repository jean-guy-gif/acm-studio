'use client';

import { useState, useTransition } from 'react';

import { btnPrimary, btnSecondary, link } from '@/components/ui/styles';
import { setProspectingStatus } from '@/features/prospecting/actions/set-prospecting-status';
import type { ProspectingStep } from '@/features/competitor-mandate/services/mandate-columns';
import type {
  ProspectingMove,
  ProspectingStatus,
} from '@/features/prospecting/services/prospecting-status';

const small = 'px-3 py-1.5 text-xs';

// Les gestes offerts par statut : un geste principal, et « Annuler » pour revenir d'un cran.
// « Pas intéressé » se dit à tout moment avant le mandat rentré.
const DECLINE = { move: 'declined', label: 'Pas intéressé' } as const;
const MOVES: Record<ProspectingStatus, { move: ProspectingMove; label: string }[]> = {
  to_confirm: [DECLINE],
  ready: [{ move: 'handed', label: 'Marquer remis' }, DECLINE],
  handed: [{ move: 'meeting', label: 'RDV obtenu' }, DECLINE],
  meeting: [{ move: 'mandate', label: 'Mandat rentré' }, DECLINE],
  mandate: [],
  collaboration: [],
  declined: [],
};
const CAN_UNDO: ProspectingStatus[] = ['handed', 'meeting', 'mandate', 'collaboration', 'declined'];

// Mission 98 — un confrère se contacte par téléphone, sans attendre l'adresse du bien :
// « Marquer contacté » pose le même fait daté que « Marquer remis ».
// Mission 115 — contacté, un confrère n'a plus « RDV obtenu » : « Collaboration obtenue » clôt
// sa prospection, « Collaboration refusée » remet le bien en courrier propriétaire.
const CONTACTED = { move: 'handed', label: 'Marquer contacté' } as const;
const COLLABORATION = [
  { move: 'collaboration', label: 'Collaboration obtenue' },
  { move: 'collaboration_declined', label: 'Collaboration refusée' },
  DECLINE,
] as const;
function movesFor(status: ProspectingStatus, step: ProspectingStep) {
  if (step === 'colleague' && (status === 'to_confirm' || status === 'ready')) {
    return [CONTACTED, DECLINE];
  }
  if (step === 'colleague' && status === 'handed') {
    return COLLABORATION;
  }
  return MOVES[status];
}

// Mission 86 — faire avancer la prospection d'un concurrent depuis sa carte. Le serveur relit le
// statut et refuse un saut de cran ; son message s'affiche ici.
export function ProspectingStatusActions({
  projectId,
  competitorId,
  status,
  step,
  primary = false,
  refusedCollaboration = false,
}: {
  projectId: string;
  competitorId: string;
  status: ProspectingStatus;
  step: ProspectingStep;
  // Vrai quand ce geste est l'action principale de la carte (aucune autre avant lui).
  primary?: boolean;
  // Mission 115 — un refus de collaboration est posé : s'il est le dernier fait, il s'annule.
  refusedCollaboration?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const moves = movesFor(status, step);
  const canUndo =
    CAN_UNDO.includes(status) ||
    (refusedCollaboration && (status === 'ready' || status === 'to_confirm'));
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
