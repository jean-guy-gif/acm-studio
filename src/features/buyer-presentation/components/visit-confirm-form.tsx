'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import {
  btnPrimary,
  btnSecondary,
  errorText,
  fieldLabel,
  hintText,
  inputBase,
} from '@/components/ui/styles';
import { confirmVisit } from '@/features/buyer-presentation/actions/confirm-visit';
import { followUpShareHrefs } from '@/features/meeting-conclusion/services/follow-up-share';

const LOST = 'Connexion perdue — réessayez.';

// Mission 142 — « Confirmer la visite » : le jour et l'heure, un message dans la langue de
// l'acquéreur avec un lien vers sa sélection. L'outil n'envoie rien. Mission 146 (partie B) —
// l'étape ou le lien de la carte l'ouvre (`VisitActions`). Mission 147 (partie A) — et le lien
// « Vivre ici » d'Academia du bien, s'il est collé sur le mandat.
export function VisitConfirmForm({ visitId }: { visitId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [day, setDay] = useState('');
  const [time, setTime] = useState('');
  const [prepared, setPrepared] = useState<{
    message: string;
    phone: string | null;
    email: string | null;
    subject: string;
  } | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const confirm = () =>
    startTransition(async () => {
      setError(null);
      const result = await confirmVisit(visitId, day, time).catch(() => ({
        ok: false as const,
        error: LOST,
      }));
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPrepared(result);
      router.refresh();
    });

  const hrefs = prepared
    ? followUpShareHrefs(prepared.message, prepared.phone, prepared.email, prepared.subject)
    : null;

  return (
    <div className="flex flex-col gap-2" data-testid="visit-confirm">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className={fieldLabel}>Jour</span>
          <input
            type="date"
            className={inputBase}
            value={day}
            onChange={(event) => setDay(event.target.value)}
            data-testid="visit-confirm-day"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={fieldLabel}>Heure</span>
          <input
            type="time"
            className={inputBase}
            value={time}
            onChange={(event) => setTime(event.target.value)}
            data-testid="visit-confirm-time"
          />
        </label>
        <button
          type="button"
          className={btnPrimary}
          disabled={pending}
          onClick={confirm}
          data-testid="visit-confirm-prepare"
        >
          Préparer le message
        </button>
      </div>
      {prepared ? (
        <div className="flex flex-col gap-2">
          <p
            className="rounded-xl bg-zinc-50 px-3 py-2 text-sm whitespace-pre-line text-zinc-700"
            data-testid="visit-confirm-message"
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
          <p className={hintText}>
            Un lien neuf vers sa sélection, valable 30 jours, et le lien « Vivre ici » du bien s’il
            est collé sur le mandat. L’outil n’envoie rien.
          </p>
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
