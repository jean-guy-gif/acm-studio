'use client';

import { useEffect, useRef, useState } from 'react';

import { btnSecondary, errorText, hintText, inputBase } from '@/components/ui/styles';
import {
  prepareVisitMessages,
  type VisitMessage,
} from '@/features/buyer-messages/actions/visit-messages';
import { followUpShareHrefs } from '@/features/meeting-conclusion/services/follow-up-share';

// Mission 139 — les deux messages prêts d'une visite faite, modifiables : à l'acquéreur (dans sa
// langue) et, pour un bien de l'agence, au vendeur. Copier / SMS / WhatsApp / E-mail, avec le texte
// tel qu'il est à l'écran ; l'outil n'envoie rien.
function MessageBox({
  title,
  testId,
  initial,
}: {
  title: string;
  testId: string;
  initial: VisitMessage;
}) {
  const [text, setText] = useState(initial.message);
  const [note, setNote] = useState<string | null>(null);
  const hrefs = followUpShareHrefs(text, initial.phone, initial.email, initial.subject);
  return (
    <div className="flex flex-col gap-2" data-testid={testId}>
      <span className="text-sm font-semibold text-zinc-800 stage:text-white">{title}</span>
      <textarea
        className={`${inputBase} w-full`}
        rows={Math.min(10, text.split('\n').length + 1)}
        value={text}
        aria-label={title}
        data-testid={`${testId}-text`}
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
              .catch(() => setNote('La copie a échoué : sélectionnez le message.'));
          }}
        >
          Copier
        </button>
        {hrefs.sms ? (
          <a className={btnSecondary} href={hrefs.sms}>
            SMS
          </a>
        ) : null}
        {hrefs.whatsapp ? (
          <a
            className={btnSecondary}
            href={hrefs.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
          >
            WhatsApp
          </a>
        ) : null}
        <a className={btnSecondary} href={hrefs.email}>
          E-mail
        </a>
      </div>
      {note ? (
        <p role="status" className={hintText}>
          {note}
        </p>
      ) : null}
    </div>
  );
}

export function VisitMessagesPanel({
  requestId,
  openAtOnce = false,
}: {
  requestId: string;
  // Juste après « Visite faite » : les messages se préparent aussitôt.
  openAtOnce?: boolean;
}) {
  const [open, setOpen] = useState(openAtOnce);
  const [messages, setMessages] = useState<{
    buyer: VisitMessage;
    seller: VisitMessage | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!open || started.current) return;
    started.current = true;
    void prepareVisitMessages(requestId)
      .then((result) => {
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setMessages({ buyer: result.buyer, seller: result.seller });
      })
      .catch(() => setError('Connexion perdue : réessayez.'));
  }, [open, requestId]);

  if (!open) {
    return (
      <button
        type="button"
        className={`${btnSecondary} self-start px-3 py-1.5 text-xs`}
        data-testid="visit-messages-open"
        onClick={() => setOpen(true)}
      >
        Messages prêts
      </button>
    );
  }
  return (
    <div className="flex w-full flex-col gap-3" data-testid="visit-messages">
      {error ? (
        <p role="alert" className={errorText}>
          {error}
        </p>
      ) : messages ? (
        <>
          <MessageBox title="À l’acquéreur" testId="visit-message-buyer" initial={messages.buyer} />
          {messages.seller ? (
            <MessageBox
              title="Au vendeur"
              testId="visit-message-seller"
              initial={messages.seller}
            />
          ) : null}
        </>
      ) : (
        <p className={hintText}>Préparation des messages…</p>
      )}
    </div>
  );
}
