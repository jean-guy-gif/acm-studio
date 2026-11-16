'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition, type ReactNode } from 'react';

import {
  btnSecondary,
  errorText,
  fieldLabel,
  hintText,
  link as linkStyle,
} from '@/components/ui/styles';
import {
  createLivingHereLink,
  refreshLivingHereLink,
  type LivingHereLinkState,
} from '@/features/academia/actions/living-here-link';
import { AGE_WARN_CLASS } from '@/features/academia/components/living-here-field';
import type { LivingHereApiInitial } from '@/features/academia/queries/living-here-api-view';
import {
  livingHereExpiry,
  type LivingHereExpiry,
} from '@/features/academia/services/living-here-age';
import { setAcademiaLivingHereLink } from '@/features/projects/actions/set-academia-link';
import { formatDay } from '@/lib/format';

// Mission 157 — le lien « Vivre ici » en un clic, sur la carte « Le bien dans Academia » du bien
// vendeur (planche M157-1) : « Créer le lien « Vivre ici » » (en contour : le seul plein de la page
// reste « Enregistrer »), l'attente pendant qu'Academia prépare le dossier (relancée toutes les
// 10 s, 2 minutes au plus, puis à l'ouverture suivante), le lien et sa date de validité, trois jours
// avant l'expiration en orange, expiré « Créer un lien neuf », une adresse ambiguë à choisir, et le
// repli : le champ à coller d'aujourd'hui, replié.

const POLL_EVERY_MS = 10_000;
const POLL_MAX = 12;

type View =
  | { kind: 'idle' }
  | { kind: 'waiting'; gaveUp: boolean }
  | { kind: 'ready'; url: string; expiresAt: string; expiry: LivingHereExpiry | null }
  | { kind: 'ambiguous'; propositions: string[] }
  | { kind: 'no_address' }
  | { kind: 'failed'; message: string };

function fromState(result: LivingHereLinkState, previous: View): View {
  switch (result.state) {
    case 'ready':
      return {
        kind: 'ready',
        url: result.url,
        expiresAt: result.expiresAt,
        expiry: livingHereExpiry(result.expiresAt, new Date()),
      };
    case 'waiting':
      return { kind: 'waiting', gaveUp: false };
    case 'ambiguous':
      return { kind: 'ambiguous', propositions: result.propositions };
    case 'no_address':
      return { kind: 'no_address' };
    case 'failed':
      return { kind: 'failed', message: result.message };
    case 'closed':
      return {
        kind: 'failed',
        message: 'Academia n’est pas ouvert pour votre agence : collez le lien vous-même.',
      };
    case 'idle':
      return previous.kind === 'waiting' ? { kind: 'idle' } : previous;
  }
}

export function LivingHereApiPanel({
  projectId,
  address,
  initial,
  fallback,
  pasted = false,
}: {
  projectId: string;
  address: string | null;
  initial: LivingHereApiInitial;
  // Le champ à coller d'aujourd'hui (M147 A, M156), le repli ; ouvert quand un lien y est collé.
  fallback: ReactNode;
  pasted?: boolean;
}) {
  const router = useRouter();
  const [view, setView] = useState<View>(() =>
    !address
      ? { kind: 'no_address' }
      : initial.kind === 'waiting'
        ? { kind: 'waiting', gaveUp: false }
        : initial,
  );
  const [chosen, setChosen] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const polls = useRef(0);

  const create = (choice: string | null = null) =>
    startTransition(async () => {
      setCopied(false);
      const result = await createLivingHereLink(projectId, choice).catch(
        (): LivingHereLinkState => ({
          state: 'failed',
          message: 'Connexion perdue : réessayez dans un moment.',
        }),
      );
      polls.current = 0;
      setView((previous) => fromState(result, previous));
      if (result.state === 'ready') router.refresh();
    });

  const remove = () =>
    startTransition(async () => {
      const result = await setAcademiaLivingHereLink(projectId, null);
      if (result.ok) {
        setView({ kind: 'idle' });
        router.refresh();
      } else {
        setView({ kind: 'failed', message: result.error });
      }
    });

  // La préparation chez Academia : relancée toutes les 10 s, 2 minutes au plus.
  const waiting = view.kind === 'waiting' && !view.gaveUp;
  useEffect(() => {
    if (!waiting) return;
    const timer = setInterval(() => {
      if (polls.current >= POLL_MAX) {
        clearInterval(timer);
        setView({ kind: 'waiting', gaveUp: true });
        return;
      }
      polls.current += 1;
      void refreshLivingHereLink(projectId)
        .then((result) => {
          if (result.state !== 'waiting') {
            clearInterval(timer);
            setView((previous) => fromState(result, previous));
            if (result.state === 'ready') router.refresh();
          }
        })
        .catch(() => undefined);
    }, POLL_EVERY_MS);
    return () => clearInterval(timer);
  }, [waiting, projectId, router]);

  const button = (label: string) => (
    <button
      type="button"
      className={`${btnSecondary} self-start text-sm`}
      disabled={pending}
      onClick={() => create()}
      data-testid="living-here-create"
    >
      {pending ? 'Demande à Academia…' : label}
    </button>
  );

  return (
    <div className="flex flex-col gap-2" data-testid="living-here-api">
      <span className={fieldLabel}>Lien « Vivre ici » pour les acquéreurs</span>
      {view.kind === 'idle' ? (
        <>
          <p className={hintText}>
            Academia prépare la page du quartier de{' '}
            <b className="font-semibold text-zinc-800">{address}</b> : les écoles, les commerces,
            les transports. Montrée sur le lien de chaque acquéreur qui a ce bien dans sa sélection,
            et dans « Confirmer la visite ».
          </p>
          {button('Créer le lien « Vivre ici »')}
          <details
            className="text-sm text-zinc-600"
            data-testid="living-here-fallback"
            open={pasted || undefined}
          >
            <summary className="cursor-pointer">Coller le lien à la main</summary>
            <div className="pt-2">{fallback}</div>
          </details>
        </>
      ) : null}
      {view.kind === 'waiting' ? (
        <p
          className="flex items-center gap-2 rounded-xl bg-zinc-100 px-3 py-2 text-sm text-zinc-700"
          role="status"
          data-testid="living-here-waiting"
        >
          {view.gaveUp
            ? 'Academia prépare toujours le dossier de l’adresse : revenez dans un moment, le lien vous attendra.'
            : 'Academia prépare le dossier de l’adresse… jusqu’à 2 minutes. Vous pouvez quitter la page : le lien vous attendra.'}
        </p>
      ) : null}
      {view.kind === 'ready' ? (
        view.expiry?.level === 'expired' ? (
          <>
            <p className={AGE_WARN_CLASS} data-testid="living-here-expired">
              Le lien a expiré le {formatDay(view.expiresAt, 'fr', 'short')} : il n’est plus montré
              aux acquéreurs.
            </p>
            {button('Créer un lien neuf')}
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span
                className="rounded-lg bg-zinc-100 px-2.5 py-1.5 font-mono text-xs break-all text-zinc-900"
                data-testid="living-here-url"
              >
                {view.url}
              </span>
              <a
                href={view.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`${linkStyle} text-sm`}
              >
                Ouvrir ↗
              </a>
              <button
                type="button"
                className={`${linkStyle} text-sm`}
                onClick={() =>
                  void navigator.clipboard
                    ?.writeText(view.url)
                    .then(() => setCopied(true))
                    .catch(() => setCopied(false))
                }
              >
                {copied ? 'Copié' : 'Copier'}
              </button>
            </div>
            {view.expiry?.level === 'soon' ? (
              <p className={AGE_WARN_CLASS} data-testid="living-here-soon">
                Valable jusqu’au {formatDay(view.expiresAt, 'fr', 'short')}
                {view.expiry.days > 1
                  ? `, dans ${view.expiry.days} jours`
                  : view.expiry.days === 1
                    ? ', demain'
                    : ', aujourd’hui'}
                .{' '}
                <button
                  type="button"
                  className={`${linkStyle} text-sm`}
                  disabled={pending}
                  onClick={() => create()}
                >
                  Créer un lien neuf
                </button>
              </p>
            ) : (
              <p className="text-xs text-zinc-500" data-testid="living-here-valid">
                Valable jusqu’au {formatDay(view.expiresAt, 'fr', 'short')} · montré à chaque
                acquéreur qui a ce bien dans sa sélection
              </p>
            )}
            <button
              type="button"
              className={`${linkStyle} self-start text-sm`}
              disabled={pending}
              onClick={remove}
              data-testid="living-here-remove"
            >
              Retirer
            </button>
          </>
        )
      ) : null}
      {view.kind === 'ambiguous' ? (
        <fieldset className="flex flex-col gap-2" data-testid="living-here-ambiguous">
          <p className={AGE_WARN_CLASS}>
            Academia ne reconnaît pas l’adresse avec certitude. Laquelle est la bonne ?
          </p>
          {view.propositions.map((proposition) => (
            <label key={proposition} className="flex items-center gap-2 text-sm text-zinc-800">
              <input
                type="radio"
                name="living-here-address"
                checked={chosen === proposition}
                onChange={() => setChosen(proposition)}
              />
              {proposition}
            </label>
          ))}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className={`${btnSecondary} text-sm`}
              disabled={pending || !chosen}
              onClick={() => create(chosen)}
            >
              Créer le lien avec cette adresse
            </button>
            <a href="#champ-address" className={`${linkStyle} text-sm`}>
              Corriger l’adresse du bien
            </a>
          </div>
        </fieldset>
      ) : null}
      {view.kind === 'no_address' ? (
        <p className={hintText} data-testid="living-here-no-address">
          Il faut l’adresse du bien pour créer le lien.{' '}
          <a href="#champ-address" className={linkStyle}>
            Ajoutez l’adresse du bien
          </a>
        </p>
      ) : null}
      {view.kind === 'failed' ? (
        <>
          <p className={errorText} role="alert" data-testid="living-here-failed">
            {view.message}
          </p>
          {button('Réessayer')}
          <details className="text-sm text-zinc-600" data-testid="living-here-fallback">
            <summary className="cursor-pointer">Coller le lien à la main</summary>
            <div className="pt-2">{fallback}</div>
          </details>
        </>
      ) : null}
    </div>
  );
}
