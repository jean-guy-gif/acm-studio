'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';

import { Logo } from '@/components/brand/logo';
import { RemoteImage } from '@/components/ui/remote-image';
import {
  cancelVisitRequest,
  finishPresentation,
  requestVisit,
} from '@/features/buyer-presentation/actions/visit-requests';
import {
  countLabel,
  pricePerSqmLabel,
} from '@/features/buyer-presentation/services/build-presentation';
import { isPendingVisit } from '@/features/buyer-presentation/services/visit-request-row';
import type {
  BuyerPresentation,
  PresentationScreen,
  VisitRequest,
} from '@/features/buyer-presentation/types';
import { buyerDateLabel } from '@/features/buyers/services/buyer-criteria';
import { DPE_COLORS, dpeClass } from '@/features/dpe/services/dpe';
import {
  kicker,
  panel,
  panelSoft,
  question,
  questionHint,
  revealValue,
  stageGlow,
  stageGlowLayer,
  stageRoot,
  statLabel,
  statValue,
} from '@/features/live-seller/components/live-stage';
import type { LiveStageTheme } from '@/features/live-seller/components/live-comparative-shell';
import { formatEuro } from '@/lib/format';

// Mission 119 — la scène de la présentation à l'acquéreur (M72 : plein cadre, couleurs et logo de
// l'agence, Clair/Sombre, Plein écran, Quitter), un écran à la fois : l'ouverture, un bien par
// écran, la fin. « Demander une visite » se touche quand l'acquéreur le dit, et s'annule d'un
// second geste pendant la présentation ; chaque demande est un fait daté (serveur). Une
// présentation terminée se relit en lecture seule, « Terminé le [date] ».

export const REQUEST_VISIT = 'Demander une visite';
export const VISIT_REQUESTED = 'Visite demandée';
export const END_QUESTION = 'Quels biens souhaitez-vous visiter ?';
export const WHY_TITLE = 'Pourquoi ce bien correspond à votre recherche';
export const KNOW_TITLE = 'À savoir';

const chromeBtn =
  'inline-flex min-h-10 items-center justify-center rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand stage:text-white/60 stage:hover:bg-white/10 stage:hover:text-white';
const navBtn =
  'inline-flex min-h-12 items-center justify-center rounded-xl border border-zinc-200 bg-white px-5 py-3 font-title text-base font-semibold text-zinc-700 transition-colors hover:border-brand hover:text-brand-deep disabled:cursor-not-allowed disabled:opacity-40 stage:border-white/20 stage:bg-white/5 stage:text-white/80 stage:hover:border-brand stage:hover:text-white';
const primaryBtn =
  'inline-flex min-h-12 items-center justify-center rounded-xl bg-brand px-6 py-3 font-title text-base font-semibold text-white shadow-lg shadow-brand/30 transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-50';

export function PresentationShell({
  presentation,
  initialRequests,
  logoLightUrl,
  logoDarkUrl,
  agencyName,
  initialStage = 'dark',
}: {
  presentation: BuyerPresentation;
  initialRequests: VisitRequest[];
  logoLightUrl: string | null;
  logoDarkUrl: string | null;
  agencyName: string | null;
  initialStage?: LiveStageTheme;
}) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(0);
  const [stage, setStage] = useState<LiveStageTheme>(initialStage);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [quitOpen, setQuitOpen] = useState(false);
  const [requests, setRequests] = useState<VisitRequest[]>(initialRequests);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [finishing, setFinishing] = useState(false);
  const readOnly = presentation.presentedAt != null;
  const screens = presentation.screens;
  const screen = screens[index]!;

  const go = useCallback(
    (delta: number) => {
      setIndex((current) => Math.min(screens.length - 1, Math.max(0, current + delta)));
      rootRef.current?.scrollTo({ top: 0 });
    },
    [screens.length],
  );

  const toggleFullscreen = useCallback(() => {
    const element = rootRef.current;
    if (document.fullscreenElement) {
      void document.exitFullscreen?.();
    } else if (element?.requestFullscreen) {
      void element.requestFullscreen().catch(() => {});
    }
  }, []);
  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement != null);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (document.body.dataset.lightbox === 'open') return;
      if (event.key === 'ArrowRight') go(1);
      if (event.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  const pendingFor = (itemId: string): VisitRequest | undefined =>
    requests.find((request) => request.itemId === itemId && isPendingVisit(request));

  const toggleVisit = (itemId: string) => {
    if (readOnly) return;
    setError(null);
    const existing = pendingFor(itemId);
    startTransition(async () => {
      const result = existing
        ? await cancelVisitRequest(existing.id).catch(() => ({
            ok: false as const,
            error: 'Connexion perdue — réessayez.',
          }))
        : await requestVisit(itemId, 'presentation').catch(() => ({
            ok: false as const,
            error: 'Connexion perdue — réessayez.',
          }));
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setRequests((current) =>
        existing
          ? current.map((request) => (request.id === result.request.id ? result.request : request))
          : [...current, result.request],
      );
    });
  };

  const finish = () => {
    setError(null);
    setFinishing(true);
    startTransition(async () => {
      const result = readOnly
        ? { ok: true as const }
        : await finishPresentation(presentation.buyerId).catch(() => ({
            ok: false as const,
            error: 'Connexion perdue — réessayez.',
          }));
      if (!result.ok) {
        setError(result.error);
        setFinishing(false);
        return;
      }
      void document.exitFullscreen?.().catch(() => {});
      router.push(`/acquereurs/${presentation.buyerId}`);
    });
  };

  const requestedItems = screens
    .filter((entry): entry is PresentationScreen & { type: 'item' } => entry.type === 'item')
    .filter((entry) => pendingFor(entry.item.itemId) != null);

  return (
    <div
      ref={rootRef}
      data-stage={stage}
      data-testid="buyer-presentation"
      data-screen={screen.type}
      className={`${stageRoot} ${isFullscreen ? 'overflow-x-hidden overflow-y-auto' : 'overflow-hidden'}`}
    >
      <div className={stageGlowLayer} aria-hidden>
        <div className={stageGlow} />
      </div>

      <header className="relative flex items-center justify-between gap-3 px-4 pt-4 sm:px-8 sm:pt-5">
        <div className="flex min-w-0 items-center gap-3">
          <Logo
            onDark={stage === 'dark'}
            className="h-8 sm:h-9"
            lightSrc={logoLightUrl}
            darkSrc={logoDarkUrl}
            fallbackName={agencyName}
          />
          <span className="hidden shrink-0 text-sm font-medium whitespace-nowrap text-zinc-400 sm:inline stage:text-white/50">
            {readOnly
              ? `Terminé le ${buyerDateLabel(presentation.presentedAt!)}`
              : 'Rendez-vous acquéreur'}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => setStage((s) => (s === 'dark' ? 'light' : 'dark'))}
            className={chromeBtn}
          >
            {stage === 'dark' ? 'Clair' : 'Sombre'}
          </button>
          <button type="button" onClick={toggleFullscreen} className={chromeBtn}>
            {isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
          </button>
          <button type="button" onClick={() => setQuitOpen(true)} className={chromeBtn}>
            Quitter
          </button>
        </div>
      </header>

      <div className="relative mx-auto mt-4 flex w-full max-w-5xl flex-col gap-1.5 px-4 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={kicker}>
            {screen.type === 'intro'
              ? 'Votre recherche'
              : screen.type === 'end'
                ? 'Pour finir'
                : `Bien ${index} sur ${screens.length - 2}`}
          </span>
          <span className="text-xs text-zinc-400 stage:text-white/40">
            {index + 1} / {screens.length}
          </span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-zinc-200 stage:bg-white/10">
          <div
            className="h-full rounded-full bg-brand transition-all duration-500"
            style={{ width: `${((index + 1) / screens.length) * 100}%` }}
          />
        </div>
      </div>

      <main
        key={index}
        className="live-fade-up relative mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-32 sm:px-8 sm:pt-8"
      >
        {screen.type === 'intro' ? (
          <div className="flex flex-col gap-6">
            <h1 className={question}>Votre recherche, {screen.buyerName}</h1>
            <p className={questionHint}>
              Nous avons retenu {countLabel(screen.count)} pour vous. Voici d’abord ce que vous nous
              avez dit.
            </p>
            <ul
              className={`${panel} grid gap-2 sm:grid-cols-2`}
              data-testid="presentation-criteria"
            >
              {screen.criteria.map((line) => (
                <li key={line} className={statValue}>
                  {line}
                </li>
              ))}
            </ul>
          </div>
        ) : screen.type === 'item' ? (
          <ItemScreen
            screen={screen}
            requested={pendingFor(screen.item.itemId) != null}
            readOnly={readOnly}
            busy={pending}
            onToggle={() => toggleVisit(screen.item.itemId)}
          />
        ) : (
          <div className="flex flex-col gap-6">
            <h1 className={question}>{END_QUESTION}</h1>
            {requestedItems.length === 0 ? (
              <p className={questionHint}>Aucune visite demandée pour l’instant.</p>
            ) : (
              <ul className={`${panel} flex flex-col gap-3`} data-testid="presentation-recap">
                {requestedItems.map((entry) => (
                  <li
                    key={entry.item.itemId}
                    className="flex flex-wrap items-baseline justify-between gap-2"
                  >
                    <span className={statValue}>{entry.item.label}</span>
                    {entry.item.price != null ? (
                      <span className="text-zinc-500 stage:text-white/60">
                        {formatEuro(entry.item.price)}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {error ? (
          <p role="alert" className="mt-4 text-sm font-medium text-red-600 stage:text-red-300">
            {error}
          </p>
        ) : null}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur stage:border-white/10 stage:bg-brand-darkest/90">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3">
          <button type="button" className={navBtn} disabled={index === 0} onClick={() => go(-1)}>
            Précédent
          </button>
          {screen.type === 'end' ? (
            <button
              type="button"
              className={primaryBtn}
              disabled={finishing}
              onClick={finish}
              data-testid="presentation-finish"
            >
              {readOnly ? 'Fermer' : finishing ? 'Enregistrement…' : 'Terminer'}
            </button>
          ) : (
            <button
              type="button"
              className={primaryBtn}
              onClick={() => go(1)}
              data-testid="presentation-next"
            >
              Suivant
            </button>
          )}
        </div>
      </div>

      {quitOpen ? (
        <div
          className="fixed inset-0 z-20 flex items-center justify-center bg-black/50 px-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl bg-white p-6 text-zinc-900 shadow-xl">
            <p className="font-title text-xl font-bold">Quitter la présentation&nbsp;?</p>
            <p className="text-sm text-zinc-600">Les demandes de visite sont enregistrées.</p>
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" className={navBtn} onClick={() => setQuitOpen(false)}>
                Rester
              </button>
              <Link href={`/acquereurs/${presentation.buyerId}`} className={primaryBtn}>
                Quitter
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ItemScreen({
  screen,
  requested,
  readOnly,
  busy,
  onToggle,
}: {
  screen: PresentationScreen & { type: 'item' };
  requested: boolean;
  readOnly: boolean;
  busy: boolean;
  onToggle: () => void;
}) {
  const { item } = screen;
  const dpe = dpeClass(item.energyRating);
  const where = [item.district, item.city]
    .filter((part): part is string => part != null && part !== '')
    .join(' · ');
  return (
    <div className="flex flex-col gap-6" data-testid="presentation-item">
      <div className="flex flex-col gap-2">
        <h1 className={question}>{item.label}</h1>
        {where ? <p className={questionHint}>{where}</p> : null}
      </div>
      {item.photos.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-3">
          {item.photos.slice(0, 3).map((photo, photoIndex) => (
            <RemoteImage
              key={photo}
              src={photo}
              alt=""
              eager={photoIndex === 0}
              className={`h-48 w-full rounded-2xl object-cover sm:h-56 ${photoIndex === 0 ? 'sm:col-span-2 sm:row-span-2 sm:h-full' : ''}`}
              fallbackClassName="flex h-48 w-full items-center justify-center rounded-2xl bg-zinc-100 text-sm text-zinc-400 stage:bg-white/10 stage:text-white/50"
            />
          ))}
        </div>
      ) : null}
      <div className={`${panel} flex flex-wrap items-end justify-between gap-4`}>
        <div className="flex flex-col gap-1">
          <span className={statLabel}>Prix affiché</span>
          {item.price != null ? (
            <span className={revealValue} data-testid="presentation-price">
              {formatEuro(item.price)}
            </span>
          ) : (
            <span className={statValue}>Prix à confirmer avec le propriétaire</span>
          )}
          <span className="text-sm text-zinc-500 stage:text-white/60">
            {[
              screen.pricePerSqm != null ? pricePerSqmLabel(screen.pricePerSqm) : null,
              screen.seenOnLabel,
            ]
              .filter((part): part is string => part != null)
              .join(' · ')}
          </span>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
          {screen.facts.map((fact) => (
            <div key={fact.label} className="flex flex-col">
              <dt className={statLabel}>{fact.label}</dt>
              <dd className={statValue}>
                {fact.label === 'DPE' && dpe ? (
                  <span
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md font-bold"
                    style={{ background: DPE_COLORS[dpe].background, color: DPE_COLORS[dpe].text }}
                  >
                    {dpe}
                  </span>
                ) : (
                  fact.value
                )}
              </dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <section className={panelSoft} data-testid="presentation-why">
          <h2 className={`${statLabel} mb-2`}>{WHY_TITLE}</h2>
          {screen.why.length > 0 ? (
            <ul className="flex flex-col gap-1.5">
              {screen.why.map((line) => (
                <li key={line} className="text-base text-zinc-800 stage:text-white/90">
                  ✓ {line}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-500 stage:text-white/60">
              Aucun critère indispensable sur votre fiche.
            </p>
          )}
        </section>
        <section className={panelSoft} data-testid="presentation-know">
          <h2 className={`${statLabel} mb-2`}>{KNOW_TITLE}</h2>
          {item.gaps.length > 0 ? (
            <ul className="flex flex-col gap-1.5">
              {item.gaps.map((gap) => (
                <li key={gap} className="text-base text-zinc-800 stage:text-white/90">
                  {gap}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-500 stage:text-white/60">
              Rien de particulier à signaler.
            </p>
          )}
        </section>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className={requested ? primaryBtn : navBtn}
          disabled={busy || readOnly}
          aria-pressed={requested}
          onClick={onToggle}
          data-testid="presentation-visit"
        >
          {requested ? `✓ ${VISIT_REQUESTED}` : REQUEST_VISIT}
        </button>
        {requested && !readOnly ? (
          <span className="text-sm text-zinc-500 stage:text-white/60">
            Un second geste l’annule.
          </span>
        ) : null}
      </div>
    </div>
  );
}
