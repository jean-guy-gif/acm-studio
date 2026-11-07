'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { btnPrimary, btnSecondary, hintText } from '@/components/ui/styles';
import { prepareRelaunch, recordBuyerRelaunch } from '@/features/buyers/actions/relaunch';
import { followUpShareHrefs } from '@/features/meeting-conclusion/services/follow-up-share';

const SUBJECT = 'Votre sélection';

// Mission 135 (§ 2, 3) — la relance d'un lien sans réponse, sur place dans « À faire aujourd'hui » :
// « Préparer le message » (un lien neuf vers la même sélection, le message court), puis Copier /
// SMS / WhatsApp / E-mail à ses coordonnées, dans le geste (Safari, iPad) ; « J’ai relancé » note la
// relance (pas un échange : seul ce qui vient de l’acquéreur en est un). ACM n’envoie rien.
export function BuyerRelaunchTask({
  buyerId,
  label,
}: {
  buyerId: string;
  // « Relancer », ou « Envoyer un nouveau lien » quand le lien a expiré.
  label: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [prepared, setPrepared] = useState<{
    message: string;
    phone: string | null;
    email: string | null;
    subject?: string;
  } | null>(null);
  const [done, setDone] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        className={`${btnPrimary} self-start whitespace-nowrap sm:self-auto`}
        data-testid="buyer-relaunch-open"
        onClick={() => setOpen(true)}
      >
        {label}
      </button>
    );
  }
  if (done) {
    return (
      <p
        role="status"
        className="text-sm font-semibold text-emerald-700"
        data-testid="buyer-relaunch-done"
      >
        Relance notée.
      </p>
    );
  }
  const hrefs = prepared
    ? followUpShareHrefs(
        prepared.message,
        prepared.phone,
        prepared.email,
        prepared.subject ?? SUBJECT,
      )
    : null;
  const fail = () => {
    setPending(false);
    setError('Connexion perdue : réessayez.');
  };

  return (
    <div className="flex w-full flex-col gap-2" data-testid="buyer-relaunch-panel">
      {prepared ? (
        <>
          <p
            className="rounded-xl bg-zinc-50 px-3 py-2 text-sm whitespace-pre-line text-zinc-700 stage:bg-white/5 stage:text-white/80"
            data-testid="buyer-relaunch-message"
          >
            {prepared.message}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={btnSecondary}
              onClick={() => {
                navigator.clipboard
                  ?.writeText(prepared.message)
                  .then(() => setCopied(true))
                  .catch(() => setError('La copie a échoué : sélectionnez le message ci-dessus.'));
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
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className={btnPrimary}
              disabled={pending}
              data-testid="buyer-relaunch-record"
              onClick={() => {
                setError(null);
                setPending(true);
                void recordBuyerRelaunch(buyerId)
                  .then((result) => {
                    setPending(false);
                    if (!result.ok) {
                      setError(result.error);
                      return;
                    }
                    setDone(true);
                    router.refresh();
                  })
                  .catch(fail);
              }}
            >
              J’ai relancé
            </button>
            <span className={hintText}>
              {copied
                ? 'Message copié, lien compris.'
                : 'Envoyez le message, puis notez la relance.'}
            </span>
          </div>
        </>
      ) : (
        <button
          type="button"
          className={`${btnSecondary} self-start`}
          disabled={pending}
          data-testid="buyer-relaunch-prepare"
          onClick={() => {
            setError(null);
            setPending(true);
            void prepareRelaunch(buyerId)
              .then((result) => {
                setPending(false);
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                setPrepared({ message: result.message, phone: result.phone, email: result.email });
              })
              .catch(fail);
          }}
        >
          {pending ? 'Préparation…' : 'Préparer le message'}
        </button>
      )}
      {error ? (
        <p role="alert" className="text-sm font-semibold text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
