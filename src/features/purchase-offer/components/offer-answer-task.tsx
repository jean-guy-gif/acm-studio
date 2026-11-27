'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import {
  btnPrimary,
  btnSecondary,
  errorText,
  hintText,
  taskButtonClass,
  type TaskButtonLook,
} from '@/components/ui/styles';
import { followUpShareHrefs } from '@/features/meeting-conclusion/services/follow-up-share';
import {
  markOfferAnswerDone,
  prepareOfferBuyerMessage,
  prepareOfferNotaryMessage,
} from '@/features/purchase-offer/actions/offer-answer';
import { newOfferHref, type OfferDecision } from '@/features/purchase-offer/services/offer-answer';

type Prepared = { message: string; phone: string | null; email: string | null; subject?: string };

export type OfferMessages = ReturnType<typeof useOfferMessages>;

// Mission 143 (B1) — les messages de la M138 (« Prévenir l'acquéreur », « Transmettre au notaire »),
// partagés par la tâche du Suivi et la prochaine étape de la fiche acquéreur.
export function useOfferMessages(offerId: string, onPrepared?: () => void) {
  const [open, setOpen] = useState<'buyer' | 'notary' | null>(null);
  const [prepared, setPrepared] = useState<Partial<Record<'buyer' | 'notary', Prepared>>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

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
        onPrepared?.();
      })
      .catch(() => {
        setPending(false);
        setError('Connexion perdue\u00a0: réessayez.');
      });
  };

  const shown = open ? prepared[open] : undefined;
  return { open, shown, pending, setPending, error, setError, note, setNote, prepare };
}

// Le message prêt, à copier ou à ouvrir par SMS, WhatsApp, E-mail : l'outil n'envoie rien.
export function OfferMessagePanel({
  messages,
  tone = 'light',
}: {
  messages: OfferMessages;
  tone?: 'light' | 'dark';
}) {
  const { open, shown, pending, error, setError, note, setNote } = messages;
  const hrefs = shown
    ? followUpShareHrefs(
        shown.message,
        shown.phone,
        shown.email,
        shown.subject ?? (open === 'notary' ? 'Offre d’achat acceptée' : 'Votre offre d’achat'),
      )
    : null;
  const dark = tone === 'dark';
  const share = dark
    ? 'inline-flex items-center justify-center rounded-xl border border-white/60 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/10'
    : btnSecondary;
  const hint = dark ? 'text-sm text-white/85' : hintText;
  return (
    <>
      {open && pending && !shown ? <p className={hint}>Préparation du message…</p> : null}
      {shown ? (
        <div className="flex w-full flex-col gap-2" data-testid={`offer-answer-panel-${open}`}>
          <p
            className={
              dark
                ? 'rounded-xl bg-white/10 px-3 py-2 text-sm break-words whitespace-pre-line text-white'
                : 'rounded-xl bg-zinc-50 px-3 py-2 text-sm break-words whitespace-pre-line text-zinc-700 stage:bg-white/5 stage:text-white/80'
            }
            data-testid={`offer-answer-message-${open}`}
          >
            {shown.message}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={share}
              onClick={() => {
                navigator.clipboard
                  ?.writeText(shown.message)
                  .then(() => setNote('Message copié.'))
                  .catch(() =>
                    setError('La copie a échoué\u00a0: sélectionnez le message ci-dessus.'),
                  );
              }}
            >
              Copier
            </button>
            {hrefs?.sms ? (
              <a className={share} href={hrefs.sms}>
                SMS
              </a>
            ) : null}
            {hrefs?.whatsapp ? (
              <a className={share} href={hrefs.whatsapp} target="_blank" rel="noopener noreferrer">
                WhatsApp
              </a>
            ) : null}
            {hrefs ? (
              <a className={share} href={hrefs.email}>
                E-mail
              </a>
            ) : null}
          </div>
          {open === 'notary' ? (
            <p className={hint}>
              Le lien du notaire s’ajoute à ceux des offrants et du vendeur&nbsp;: il ne les
              remplace pas. Valable 30 jours.
            </p>
          ) : null}
        </div>
      ) : null}
      {note ? (
        <p role="status" className={hint}>
          {note}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className={dark ? 'text-sm font-semibold text-white' : errorText}>
          {error}
        </p>
      ) : null}
    </>
  );
}

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
  primary = false,
  look = 'today',
}: {
  offerId: string;
  buyerId: string;
  visitId: string | null;
  decision: OfferDecision;
  // « Voir l'offre » : l'offre signée, et la réponse du vendeur.
  offerHref: string;
  // La refonte, lot B — dans une carte « à faire » (`socle`), « Prévenir l'acquéreur » est le
  // bouton de la carte, sur toute sa largeur, ses autres gestes dessous ; un seul bouton plein par
  // écran : la carte qui mène l'écran (`primary`) l'a plein, puis le message ouvert ; les autres
  // cartes restent en contour, message ouvert compris. Sur « Aujourd'hui », comme avant : quatre
  // boutons en ligne, en contour, le message ouvert en plein.
  primary?: boolean;
  look?: TaskButtonLook;
}) {
  const router = useRouter();
  const messages = useOfferMessages(offerId);
  const { open, prepare, pending, setPending, setError } = messages;
  const [done, setDone] = useState(false);
  const filled = (target: 'buyer' | 'notary') =>
    look === 'socle'
      ? primary && (open === target || (open === null && target === 'buyer'))
      : open === target;

  if (done) {
    return (
      <p
        role="status"
        className="text-sm font-semibold text-emerald-700"
        data-testid="offer-answer-done"
      >
        Noté&nbsp;: la tâche est faite.
      </p>
    );
  }

  const socle = look === 'socle';
  const buyerButton = (
    <button
      type="button"
      className={
        socle
          ? taskButtonClass(filled('buyer'), 'socle')
          : filled('buyer')
            ? btnPrimary
            : btnSecondary
      }
      data-testid="offer-answer-buyer"
      onClick={() => prepare('buyer')}
    >
      Prévenir l’acquéreur
    </button>
  );

  return (
    <div
      className={
        socle ? 'flex w-full flex-col gap-2' : 'flex w-full flex-col gap-2 sm:w-auto sm:items-end'
      }
      data-testid="offer-answer-task"
      data-task-open={open ? '' : undefined}
    >
      {socle ? buyerButton : null}
      <div className="flex flex-wrap gap-2">
        {socle ? null : buyerButton}
        {decision === 'accepted' ? (
          <button
            type="button"
            className={filled('notary') ? btnPrimary : btnSecondary}
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
                setError('Connexion perdue\u00a0: réessayez.');
              });
          }}
        >
          Fait
        </button>
      </div>
      <OfferMessagePanel messages={messages} />
    </div>
  );
}
