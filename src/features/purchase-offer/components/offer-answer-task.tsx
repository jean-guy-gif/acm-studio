'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { btnPrimary, btnSecondary, errorText, hintText } from '@/components/ui/styles';
import { followUpShareHrefs } from '@/features/meeting-conclusion/services/follow-up-share';
import {
  markOfferAnswerDone,
  prepareOfferBuyerMessage,
  prepareOfferNotaryMessage,
} from '@/features/purchase-offer/actions/offer-answer';
import { newOfferHref, type OfferDecision } from '@/features/purchase-offer/services/offer-answer';

type Prepared = { message: string; phone: string | null; email: string | null; subject?: string };

// Mission 138 — la réponse du vendeur à une offre, sur place dans « À faire aujourd'hui ». Acceptée :
// « Prévenir l'acquéreur » (son message et un lien neuf vers sa copie) et « Transmettre au notaire »
// (le lien du notaire, à part) ; refusée : « Prévenir l'acquéreur » et « Faire une nouvelle offre ».
// Chaque message se copie ou s'ouvre par SMS, WhatsApp, E-mail ; l'outil n'envoie rien. « Fait »
// ferme la tâche.
export function OfferAnswerTask({
  offerId,
  buyerId,
  visitId,
  decision,
  offerHref,
}: {
  offerId: string;
  buyerId: string;
  visitId: string | null;
  decision: OfferDecision;
  // « Voir l'offre » : l'offre signée, et la réponse du vendeur.
  offerHref: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState<'buyer' | 'notary' | null>(null);
  const [prepared, setPrepared] = useState<Partial<Record<'buyer' | 'notary', Prepared>>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <p
        role="status"
        className="text-sm font-semibold text-emerald-700"
        data-testid="offer-answer-done"
      >
        Noté : la tâche est faite.
      </p>
    );
  }

  const prepare = (target: 'buyer' | 'notary') => {
    setOpen(target);
    setError(null);
    setNote(null);
    if (prepared[target]) return;
    setPending(true);
    const action = target === 'buyer' ? prepareOfferBuyerMessage : prepareOfferNotaryMessage;
    void action(offerId, window.location.origin)
      .then((result) => {
        setPending(false);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setPrepared((current) => ({
          ...current,
          [target]: {
            message: result.message,
            phone: result.phone,
            email: result.email,
            subject: result.subject,
          },
        }));
      })
      .catch(() => {
        setPending(false);
        setError('Connexion perdue : réessayez.');
      });
  };

  const shown = open ? prepared[open] : undefined;
  const hrefs = shown
    ? followUpShareHrefs(
        shown.message,
        shown.phone,
        shown.email,
        shown.subject ?? (open === 'notary' ? 'Offre d’achat acceptée' : 'Votre offre d’achat'),
      )
    : null;

  return (
    <div
      className="flex w-full flex-col gap-2 sm:w-auto sm:items-end"
      data-testid="offer-answer-task"
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={open === 'buyer' ? btnPrimary : btnSecondary}
          data-testid="offer-answer-buyer"
          onClick={() => prepare('buyer')}
        >
          Prévenir l’acquéreur
        </button>
        {decision === 'accepted' ? (
          <button
            type="button"
            className={open === 'notary' ? btnPrimary : btnSecondary}
            data-testid="offer-answer-notary"
            onClick={() => prepare('notary')}
          >
            Transmettre au notaire
          </button>
        ) : (
          <Link
            href={newOfferHref(buyerId, visitId)}
            className={btnSecondary}
            data-testid="offer-answer-new-offer"
          >
            Faire une nouvelle offre
          </Link>
        )}
        <Link href={offerHref} className={btnSecondary} data-testid="offer-answer-open">
          Voir l’offre
        </Link>
        <button
          type="button"
          className={btnSecondary}
          disabled={pending}
          data-testid="offer-answer-mark-done"
          onClick={() => {
            setError(null);
            setPending(true);
            void markOfferAnswerDone(offerId)
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
                setError('Connexion perdue : réessayez.');
              });
          }}
        >
          Fait
        </button>
      </div>
      {open && pending && !shown ? <p className={hintText}>Préparation du message…</p> : null}
      {shown ? (
        <div className="flex w-full flex-col gap-2" data-testid={`offer-answer-panel-${open}`}>
          <p
            className="rounded-xl bg-zinc-50 px-3 py-2 text-sm whitespace-pre-line text-zinc-700 stage:bg-white/5 stage:text-white/80"
            data-testid={`offer-answer-message-${open}`}
          >
            {shown.message}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={btnSecondary}
              onClick={() => {
                navigator.clipboard
                  ?.writeText(shown.message)
                  .then(() => setNote('Message copié.'))
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
          {open === 'notary' ? (
            <p className={hintText}>
              Le lien du notaire s’ajoute à ceux des offrants et du vendeur : il ne les remplace
              pas. Valable 30 jours.
            </p>
          ) : null}
        </div>
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
