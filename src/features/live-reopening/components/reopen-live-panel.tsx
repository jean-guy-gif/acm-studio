'use client';

import { useState, useTransition } from 'react';

import { btnSecondary, card, hintText, inputBase, sectionTitle } from '@/components/ui/styles';
import { reopenLive } from '@/features/live-reopening/actions/reopen-live';
import { REOPEN_REASON_MAX, type LiveReopening } from '@/features/live-reopening/types';
import { formatRelativeMoment } from '@/lib/format';

// Mission 104 — sur la fiche du dossier, pour les SEULS opérateurs : rouvrir un Live figé par
// erreur. Le motif est demandé, puis confirmé dans l'écran ; l'historique dit qui, quand, motif.
export function ReopenLivePanel({
  projectId,
  canReopen,
  history,
}: {
  projectId: string;
  // Le Live a commencé et le dossier n'est ni conclu ni archivé.
  canReopen: boolean;
  history: LiveReopening[];
}) {
  const [reason, setReason] = useState('');
  const [asking, setAsking] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const confirm = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await reopenLive(projectId, reason);
      setAsking(false);
      if (!result.ok) {
        setMessage({ ok: false, text: result.error });
        return;
      }
      setReason('');
      setMessage({
        ok: true,
        text: `Live rouvert : ${result.responses} réponse${result.responses > 1 ? 's' : ''} effacée${result.responses > 1 ? 's' : ''}, gardée${result.responses > 1 ? 's' : ''} dans la trace.`,
      });
    });
  };

  return (
    <section
      data-testid="reopen-live"
      className={`${card} flex flex-col gap-3 border-dashed p-5 print:hidden`}
    >
      <h2 className={sectionTitle}>Rouvrir le Live (opérateur)</h2>
      <p className={hintText}>
        Pour un Live figé par erreur — un vrai dossier essayé sans le vendeur. Les réponses du
        vendeur sont effacées du dossier et gardées dans la trace, avec votre motif.
      </p>
      {canReopen ? (
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1 text-sm">
            Motif de la réouverture
            <textarea
              value={reason}
              maxLength={REOPEN_REASON_MAX}
              onChange={(event) => {
                setReason(event.target.value);
                setAsking(false);
              }}
              rows={2}
              className={inputBase}
            />
          </label>
          {asking ? (
            <div
              role="group"
              aria-label="Confirmer la réouverture"
              className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-sm text-amber-900 stage:border-amber-300/40 stage:bg-amber-300/10 stage:text-amber-100"
            >
              <span>Effacer les réponses de ce Live ?</span>
              <button
                type="button"
                className={btnSecondary}
                disabled={pending}
                onClick={() => setAsking(false)}
              >
                Annuler
              </button>
              <button type="button" className={btnSecondary} disabled={pending} onClick={confirm}>
                {pending ? 'Réouverture…' : 'Rouvrir le Live'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              className={`${btnSecondary} self-start`}
              disabled={reason.trim().length === 0}
              onClick={() => setAsking(true)}
            >
              Rouvrir le Live
            </button>
          )}
        </div>
      ) : (
        <p className={hintText}>
          Rien à rouvrir : le Live n’a pas commencé, ou le dossier est conclu.
        </p>
      )}
      {message ? (
        <p
          role={message.ok ? 'status' : 'alert'}
          className={
            message.ok
              ? 'text-sm text-emerald-700 stage:text-emerald-300'
              : 'text-sm text-amber-700 stage:text-amber-300'
          }
        >
          {message.text}
        </p>
      ) : null}
      {history.length > 0 ? (
        <ul className="flex flex-col gap-1 text-xs text-zinc-500 stage:text-white/55">
          {history.map((entry) => (
            <li key={`${entry.createdAt}-${entry.operatorEmail}`}>
              Rouvert {formatRelativeMoment(entry.createdAt)} par {entry.operatorEmail} :{' '}
              {entry.reason}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
