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
import {
  buildLivingHereForVisit,
  confirmVisit,
} from '@/features/living-here/actions/living-here-actions';
import { LivingHereView } from '@/features/living-here/components/living-here-view';
import type { LivingHereSheet, SectorPriority } from '@/features/living-here/types';
import { followUpShareHrefs } from '@/features/meeting-conclusion/services/follow-up-share';
import { formatRelativeMoment } from '@/lib/format';

const LOST = 'Connexion perdue — réessayez.';

// Mission 142 — sur une visite demandée, pour le conseiller : « Vivre ici » en français (construit
// en tâche de fond, « Construire » ou « Actualiser » en secours), puis « Confirmer la visite » : le
// jour et l'heure, un message dans la langue de l'acquéreur avec un lien vers sa sélection, où il lit
// « Vivre ici ». L'outil n'envoie rien.
export function LivingHereVisitPanel({
  visitId,
  sheet,
  sheetsFailed,
  scheduledAt,
  priorities,
  livingPlace,
  livingPlaceMinutes,
  canConfirm = true,
}: {
  visitId: string;
  sheet: LivingHereSheet | null;
  sheetsFailed: boolean;
  scheduledAt: string | null;
  priorities: readonly SectorPriority[];
  livingPlace: string | null;
  livingPlaceMinutes: number | null;
  canConfirm?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [day, setDay] = useState('');
  const [time, setTime] = useState('');
  const [prepared, setPrepared] = useState<{
    message: string;
    phone: string | null;
    email: string | null;
    subject: string;
  } | null>(null);
  const [note, setNote] = useState<string | null>(null);

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
    <div className="flex flex-col gap-3" data-testid="living-here-panel">
      {scheduledAt ? (
        <p className="text-sm font-medium text-emerald-700" data-testid="visit-scheduled">
          Visite planifiée {formatRelativeMoment(scheduledAt)}
        </p>
      ) : null}
      {sheetsFailed ? (
        <p role="alert" className={errorText}>
          « Vivre ici » n’a pas pu être lu : rechargez la page.
        </p>
      ) : sheet ? (
        <details className="rounded-xl bg-zinc-50 px-3 py-2" data-testid="living-here-advisor">
          <summary className="cursor-pointer text-sm font-semibold text-brand-darker">
            Vivre ici · ce que l’acquéreur lira, dans sa langue
          </summary>
          <div className="pt-3">
            <LivingHereView
              sheet={sheet}
              language="fr"
              priorities={priorities}
              livingPlace={livingPlace}
              livingPlaceMinutes={livingPlaceMinutes}
            />
          </div>
        </details>
      ) : (
        <p className={hintText} data-testid="living-here-pending">
          « Vivre ici » se prépare après la demande de visite.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {sheetsFailed ? null : (
          <button
            type="button"
            className={btnSecondary}
            disabled={pending}
            onClick={build}
            data-testid="living-here-build"
          >
            {pending
              ? 'Lecture des sources…'
              : sheet
                ? 'Actualiser Vivre ici'
                : 'Construire Vivre ici'}
          </button>
        )}
        {canConfirm ? (
          <button
            type="button"
            className={btnSecondary}
            onClick={() => setConfirming((open) => !open)}
            data-testid="visit-confirm-open"
          >
            Confirmer la visite
          </button>
        ) : null}
      </div>
      {confirming && canConfirm ? (
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
                      .catch(() =>
                        setError('La copie a échoué : sélectionnez le message ci-dessus.'),
                      );
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
