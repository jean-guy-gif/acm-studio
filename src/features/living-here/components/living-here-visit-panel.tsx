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
  link,
} from '@/components/ui/styles';
import {
  buildLivingHereForVisit,
  confirmVisit,
} from '@/features/living-here/actions/living-here-actions';
import { LivingHereView } from '@/features/living-here/components/living-here-view';
import type { LivingHereSheet, SectorPriority } from '@/features/living-here/types';
import { followUpShareHrefs } from '@/features/meeting-conclusion/services/follow-up-share';

const LOST = 'Connexion perdue — réessayez.';
const linkButton = `${link} text-sm hover:underline disabled:cursor-not-allowed disabled:opacity-50`;

// Mission 142 — sur une visite, pour le conseiller : « Vivre ici » en français (construit en tâche
// de fond, « Construire » ou « Actualiser » en secours). Mission 146 (partie B) — replié, dans les
// liens de la carte ; il s'ouvre sur toute la largeur.
export function LivingHereDetails({
  visitId,
  sheet,
  sheetsFailed,
  priorities,
  livingPlace,
  livingPlaceMinutes,
}: {
  visitId: string;
  sheet: LivingHereSheet | null;
  sheetsFailed: boolean;
  priorities: readonly SectorPriority[];
  livingPlace: string | null;
  livingPlaceMinutes: number | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const build = () =>
    startTransition(async () => {
      setError(null);
      const result = await buildLivingHereForVisit(visitId).catch(() => ({
        ok: false as const,
        error: LOST,
      }));
      if (!result.ok) setError(result.error);
      else router.refresh();
    });

  const buildButton = (
    <button
      type="button"
      className={`${linkButton} self-start`}
      disabled={pending}
      onClick={build}
      data-testid="living-here-build"
    >
      {pending ? 'Lecture des sources…' : sheet ? 'Actualiser Vivre ici' : 'Construire Vivre ici'}
    </button>
  );

  return (
    <div data-testid="living-here-panel" className="contents">
      {sheetsFailed ? (
        <p role="alert" className={`${errorText} basis-full`}>
          « Vivre ici » n’a pas pu être lu : rechargez la page.
        </p>
      ) : sheet ? (
        <details className="group open:basis-full" data-testid="living-here-advisor">
          <summary className={`${linkButton} cursor-pointer list-none`}>
            <span className="group-open:hidden">▸</span>
            <span className="hidden group-open:inline">▾</span> Vivre ici
          </summary>
          <div className="mt-2 flex flex-col gap-3 rounded-xl bg-zinc-50 px-3 py-3 stage:bg-white/5">
            <p className={hintText}>Ce que l’acquéreur lira, dans sa langue.</p>
            <LivingHereView
              sheet={sheet}
              language="fr"
              priorities={priorities}
              livingPlace={livingPlace}
              livingPlaceMinutes={livingPlaceMinutes}
            />
            {buildButton}
          </div>
        </details>
      ) : (
        <span className="flex flex-wrap items-baseline gap-2">
          <span className={hintText} data-testid="living-here-pending">
            « Vivre ici » se prépare après la demande de visite.
          </span>
          {buildButton}
        </span>
      )}
      {error ? (
        <p role="alert" className={`${errorText} basis-full`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

// Mission 142 — « Confirmer la visite » : le jour et l'heure, un message dans la langue de
// l'acquéreur avec un lien vers sa sélection, où il lit « Vivre ici ». L'outil n'envoie rien.
// Mission 146 (partie B) — l'étape ou le lien de la carte l'ouvre (`VisitActions`).
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
            Un lien neuf vers sa sélection, valable 30 jours : il y lit « Vivre ici ». L’outil
            n’envoie rien.
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
