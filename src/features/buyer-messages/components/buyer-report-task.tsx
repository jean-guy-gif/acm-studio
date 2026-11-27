'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import {
  btnSecondary,
  errorText,
  hintText,
  inputBase,
  taskButtonClass,
  taskConfirmClass,
  type TaskButtonLook,
} from '@/components/ui/styles';
import {
  noteReportSent,
  prepareMeetingProposal,
  prepareWeeklyReport,
} from '@/features/buyer-messages/actions/report-messages';
import { followUpShareHrefs } from '@/features/meeting-conclusion/services/follow-up-share';

// Mission 139 — le point de la semaine et le point proposé, sur place dans « À faire aujourd'hui » :
// le message prêt dans la langue du client, modifiable, puis Copier / SMS / WhatsApp / E-mail à ses
// coordonnées ; « Envoyé » note l'envoi (pas un échange, M135). ACM n'envoie rien.
export function BuyerReportTask({
  buyerId,
  kind,
  label,
  primary = true,
  look = 'today',
}: {
  buyerId: string;
  kind: 'weekly_report' | 'meeting_proposed';
  label: string;
  // Mission 145 — un seul bouton plein par page (« Aujourd'hui ») : les autres en contour.
  primary?: boolean;
  // La refonte, lot B — dans une carte « à faire », le bouton du socle.
  look?: TaskButtonLook;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [prepared, setPrepared] = useState<{
    phone: string | null;
    email: string | null;
    subject: string;
  } | null>(null);
  const [text, setText] = useState('');
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <p
        role="status"
        className="text-sm font-semibold text-emerald-700"
        data-testid="buyer-report-done"
      >
        Envoi noté.
      </p>
    );
  }
  if (!open) {
    return (
      <button
        type="button"
        className={taskButtonClass(primary, look)}
        data-testid={`buyer-report-open-${kind}`}
        onClick={() => {
          setOpen(true);
          setPending(true);
          const prepare = kind === 'weekly_report' ? prepareWeeklyReport : prepareMeetingProposal;
          void prepare(buyerId)
            .then((result) => {
              setPending(false);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              setText(result.message);
              setPrepared({ phone: result.phone, email: result.email, subject: result.subject });
            })
            .catch(() => {
              setPending(false);
              setError('Connexion perdue\u00a0: réessayez.');
            });
        }}
      >
        {label}
      </button>
    );
  }
  const hrefs = prepared
    ? followUpShareHrefs(text, prepared.phone, prepared.email, prepared.subject)
    : null;
  return (
    <div className="flex w-full flex-col gap-2" data-testid="buyer-report-panel" data-task-open>
      {pending ? <p className={hintText}>Préparation du message…</p> : null}
      {prepared ? (
        <>
          <textarea
            className={`${inputBase} w-full`}
            rows={Math.min(10, text.split('\n').length + 1)}
            value={text}
            aria-label="Message"
            data-testid="buyer-report-message"
            onChange={(event) => setText(event.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={btnSecondary}
              onClick={() => {
                navigator.clipboard
                  ?.writeText(text)
                  .then(() => setNote('Message copié.'))
                  .catch(() => setNote('La copie a échoué\u00a0: sélectionnez le message.'));
              }}
            >
              Copier
            </button>
            {hrefs?.sms ? (
              <a className={btnSecondary} href={hrefs.sms}>
                SMS
              </a>
            ) : null}
            {hrefs?.whatsapp ? (
              <a
                className={btnSecondary}
                href={hrefs.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp
              </a>
            ) : null}
            {hrefs ? (
              <a className={btnSecondary} href={hrefs.email}>
                E-mail
              </a>
            ) : null}
            <button
              type="button"
              className={taskConfirmClass(primary, look)}
              disabled={pending}
              data-testid="buyer-report-sent"
              onClick={() => {
                setError(null);
                setPending(true);
                void noteReportSent(buyerId, kind)
                  .then((result) => {
                    setPending(false);
                    if (!result.ok) {
                      setError(result.error);
                      return;
                    }
                    setDone(true);
                    router.refresh();
                  })
                  .catch(() => {
                    setPending(false);
                    setError('Connexion perdue\u00a0: réessayez.');
                  });
              }}
            >
              Envoyé
            </button>
          </div>
        </>
      ) : null}
      {note ? (
        <p role="status" className={hintText}>
          {note}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className={errorText}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
