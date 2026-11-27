'use client';

import { useState, useTransition } from 'react';

import { btnPrimary, btnSecondary, errorText, okText } from '@/components/ui/styles';
import { markLettersHanded } from '@/features/prospecting/actions/set-prospecting-status';

// Mission 98 — « Marquer tous remis », une fois les courriers imprimés et déposés : les
// concurrents imprimés passent en « Dossier remis ». Confirmation dans l'écran ; rien ne
// s'imprime de ce bloc.
export function MarkLettersHanded({
  projectId,
  competitorIds,
}: {
  projectId: string;
  competitorIds: string[];
}) {
  const [asking, setAsking] = useState(false);
  const [state, setState] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const count = competitorIds.length;
  const letters = `${count} courrier${count > 1 ? 's' : ''}`;

  const confirm = () => {
    setState(null);
    startTransition(async () => {
      const result = await markLettersHanded(projectId, competitorIds);
      setAsking(false);
      setState(
        result.ok
          ? {
              ok: true,
              message: `${result.count} dossier${result.count > 1 ? 's' : ''} marqué${result.count > 1 ? 's' : ''} «\u00a0remis\u00a0».`,
            }
          : { ok: false, message: result.error },
      );
    });
  };

  return (
    <div className="flex flex-col gap-2 print:hidden">
      {asking ? (
        <div
          role="group"
          aria-label="Marquer tous remis"
          className="flex flex-wrap items-center gap-2 text-sm text-zinc-700"
        >
          <span>Marquer les {letters} comme remis&#x202f;?</span>
          <button
            type="button"
            disabled={pending}
            onClick={() => setAsking(false)}
            className={btnSecondary}
          >
            Annuler
          </button>
          <button type="button" disabled={pending} onClick={confirm} className={btnPrimary}>
            Confirmer
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setState(null);
            setAsking(true);
          }}
          className={`${btnSecondary} self-start`}
        >
          Marquer tous remis
        </button>
      )}
      {state ? (
        <p role="status" className={state.ok ? okText : errorText}>
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
