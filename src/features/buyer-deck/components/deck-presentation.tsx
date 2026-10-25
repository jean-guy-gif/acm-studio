'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';

import { Logo } from '@/components/brand/logo';
import { RemoteImage } from '@/components/ui/remote-image';
import { answerItem, finishPresentation } from '@/features/buyer-deck/actions/deck-actions';
import { criteriaCountLabel, markSymbol } from '@/features/buyer-deck/services/buyer-deck';
import {
  ANSWER,
  GRID,
  WORDS,
  answerOf,
  finishConfirmation,
  nextScreen,
  previousScreen,
  screenPosition,
  unansweredLetters,
  type DeckScreen,
} from '@/features/buyer-deck/services/deck-navigation';
import {
  AVAILABILITY_LABELS,
  AVAILABILITY_SLOTS,
  GRID_ANSWER_LABELS,
  GRID_LEGEND,
  ITEM_ANSWER_LABELS,
  ITEM_ANSWERS,
  NO_REASON_LABELS,
  NO_REASONS,
  type AvailabilitySlot,
  type BuyerDeck,
  type DeckItem,
  type GridMark,
  type ItemAnswer,
  type ItemResponse,
  type NoReason,
} from '@/features/buyer-deck/types';
import { buyerDateLabel } from '@/features/buyers/services/buyer-criteria';
import {
  kicker,
  panel,
  panelSoft,
  question,
  questionHint,
  stageGlow,
  stageGlowLayer,
  stageRoot,
  statLabel,
  statValue,
} from '@/features/live-seller/components/live-stage';
import type { LiveStageTheme } from '@/features/live-seller/components/live-comparative-shell';

// Mission 122 — la présentation du dossier qui fait agir, plein cadre (M72), tablette d'abord : ses
// mots → la grille → un bien par écran → sa réponse. Il ne lit pas, il répond : le conseiller
// touche « Je veux le visiter », « Peut-être » ou « Pas pour moi » quand l'acquéreur le dit, puis
// ses raisons et ses disponibilités ; « Terminer » fige (M111). Une présentation terminée se relit
// en lecture seule (M119).

export const WORDS_TITLE = 'Vous m’avez dit :';
export const PITCH_TITLE = 'Pourquoi je vous le propose';
export const NEXT_TITLE = 'Ce que je fais ensuite';

const chromeBtn =
  'inline-flex min-h-10 items-center justify-center rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand stage:text-white/60 stage:hover:bg-white/10 stage:hover:text-white';
const navBtn =
  'inline-flex min-h-12 items-center justify-center whitespace-nowrap rounded-xl border border-zinc-200 bg-white px-5 py-3 font-title text-base font-semibold text-zinc-700 transition-colors hover:border-brand hover:text-brand-deep disabled:cursor-not-allowed disabled:opacity-40 stage:border-white/20 stage:bg-white/5 stage:text-white/80 stage:hover:border-brand stage:hover:text-white';
const primaryBtn =
  'inline-flex min-h-12 items-center justify-center whitespace-nowrap rounded-xl bg-brand px-6 py-3 font-title text-base font-semibold text-white shadow-lg shadow-brand/30 transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-50';
const chip = (on: boolean): string =>
  `inline-flex min-h-11 items-center rounded-full border px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed ${
    on
      ? 'border-brand bg-brand text-white'
      : 'border-zinc-300 bg-white text-zinc-700 hover:border-brand stage:border-white/25 stage:bg-white/5 stage:text-white/80'
  }`;

const MARK_STYLES: Record<GridMark, string> = {
  ok: 'text-emerald-700 stage:text-emerald-300',
  near: 'text-amber-700 stage:text-amber-300',
  no: 'text-red-700 stage:text-red-300',
  check: 'text-sky-700 stage:text-sky-300',
};

const lettersOf = (items: DeckItem[]): string =>
  items.length <= 1
    ? (items[0]?.letter ?? '')
    : `${items
        .slice(0, -1)
        .map((item) => item.letter)
        .join(', ')} et ${items.at(-1)!.letter}`;

export function DeckPresentation({
  deck,
  initialResponses,
  initialAvailability,
  logoLightUrl,
  logoDarkUrl,
  agencyName,
  advisorName,
  advisorPhone,
  initialStage = 'dark',
}: {
  deck: BuyerDeck;
  initialResponses: ItemResponse[];
  initialAvailability: AvailabilitySlot[];
  logoLightUrl: string | null;
  logoDarkUrl: string | null;
  agencyName: string | null;
  advisorName: string | null;
  advisorPhone: string | null;
  initialStage?: LiveStageTheme;
}) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [screen, setScreen] = useState<DeckScreen>(WORDS);
  const [stage, setStage] = useState<LiveStageTheme>(initialStage);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [quitOpen, setQuitOpen] = useState(false);
  const [responses, setResponses] = useState<ItemResponse[]>(initialResponses);
  const readOnly = deck.presentedAt != null;
  const [availability, setAvailability] = useState<AvailabilitySlot[]>(initialAvailability);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [finishing, setFinishing] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState<string | null>(null);
  const confirmRef = useRef<HTMLDivElement | null>(null);
  // La confirmation de « Terminer » prend le focus dès qu'elle s'ouvre.
  useEffect(() => {
    if (confirmFinish) confirmRef.current?.focus();
  }, [confirmFinish]);
  const itemCount = deck.items.length;
  const current = screen.type === 'item' ? deck.items[screen.index] : undefined;
  const next = nextScreen(screen, itemCount);
  const previous = previousScreen(screen);
  const screenTotal = itemCount + 3;

  const go = useCallback((target: DeckScreen | null) => {
    if (!target) return;
    setScreen(target);
    setConfirmFinish(null);
    rootRef.current?.scrollTo({ top: 0 });
  }, []);

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
      // Les flèches suivent la navigation : jamais vers « Sa réponse ».
      if (event.key === 'ArrowRight') go(next);
      if (event.key === 'ArrowLeft') go(previous);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, next, previous]);

  const responseFor = (itemId: string): ItemResponse | undefined =>
    responses.find((response) => response.itemId === itemId);

  const send = (itemId: string, answer: ItemAnswer, reasons: NoReason[]) => {
    if (readOnly) return;
    setError(null);
    startTransition(async () => {
      const result = await answerItem(itemId, answer, reasons).catch(() => ({
        ok: false as const,
        error: 'Connexion perdue — réessayez.',
      }));
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setResponses((current) => [
        ...current.filter((response) => response.itemId !== itemId),
        result.response,
      ]);
    });
  };

  const toggleReason = (itemId: string, reason: NoReason) => {
    const current = responseFor(itemId)?.reasons ?? [];
    send(
      itemId,
      'no',
      current.includes(reason) ? current.filter((entry) => entry !== reason) : [...current, reason],
    );
  };

  // « Terminer » : secondaire, en bas de « Sa réponse » ; s'il reste des biens sans réponse, il
  // demande d'abord confirmation (essai de Jean-Guy, 25/10).
  const askFinish = () => {
    if (readOnly) {
      finish();
      return;
    }
    const question = finishConfirmation(
      unansweredLetters(
        deck.items.map((item) => ({ letter: item.letter, itemId: item.item.itemId })),
        responses,
      ),
    );
    if (question) setConfirmFinish(question);
    else finish();
  };

  const finish = () => {
    setError(null);
    setConfirmFinish(null);
    setFinishing(true);
    startTransition(async () => {
      const result = readOnly
        ? { ok: true as const }
        : await finishPresentation(deck.buyerId, deck.selectionId, availability).catch(() => ({
            ok: false as const,
            error: 'Connexion perdue — réessayez.',
          }));
      if (!result.ok) {
        setError(result.error);
        setFinishing(false);
        return;
      }
      void document.exitFullscreen?.().catch(() => {});
      router.push(`/acquereurs/${deck.buyerId}`);
    });
  };

  const answered = (answer: ItemAnswer): DeckItem[] =>
    deck.items.filter((item) => responseFor(item.item.itemId)?.answer === answer);
  const visits = answered('visit');
  const maybes = answered('maybe');
  const noes = answered('no');
  const leadItem = deck.leadLetter
    ? deck.items.find((item) => item.letter === deck.leadLetter)
    : undefined;
  const openItem = (item: DeckItem): DeckScreen => ({
    type: 'item',
    index: deck.items.indexOf(item),
  });

  const kickerText =
    screen.type === 'words'
      ? `Votre sélection · ${deck.items.length} bien${deck.items.length > 1 ? 's' : ''}`
      : screen.type === 'grid'
        ? 'Vos critères'
        : current
          ? `Bien ${current.letter} · ${criteriaCountLabel(current)}`
          : 'Votre réponse';

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
            {readOnly ? `Terminé le ${buyerDateLabel(deck.presentedAt!)}` : 'Rendez-vous acquéreur'}
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
          <span className={kicker} data-testid="deck-kicker">
            {kickerText}
          </span>
          <span className="text-xs text-zinc-400 stage:text-white/40">
            {screenPosition(screen, itemCount) + 1} / {screenTotal}
          </span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-zinc-200 stage:bg-white/10">
          <div
            className="h-full rounded-full bg-brand transition-all duration-500"
            style={{ width: `${((screenPosition(screen, itemCount) + 1) / screenTotal) * 100}%` }}
          />
        </div>
      </div>

      {readOnly ? (
        <p
          data-testid="presentation-finished"
          className="relative mx-auto mt-4 w-full max-w-5xl px-4 text-sm text-zinc-600 sm:px-8 stage:text-white/70"
        >
          Présentation terminée le {buyerDateLabel(deck.presentedAt!)} : pour en refaire une,{' '}
          <Link
            href={`/acquereurs/${deck.buyerId}/biens-ideaux`}
            className="font-medium text-brand-deep underline-offset-2 hover:underline stage:text-brand"
          >
            retenez une nouvelle sélection
          </Link>
          .
        </p>
      ) : null}

      <main
        key={`${screen.type}-${screen.type === 'item' ? screen.index : ''}`}
        className="live-fade-up relative mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-32 sm:px-8 sm:pt-8"
      >
        {screen.type === 'words' ? (
          <div className="flex flex-col gap-5" data-testid="deck-words">
            <h1 className={question}>{WORDS_TITLE}</h1>
            <p className="font-title text-2xl leading-snug font-semibold text-zinc-900 sm:text-3xl stage:text-white">
              « {deck.words} »
            </p>
          </div>
        ) : screen.type === 'grid' ? (
          <GridScreen
            deck={deck}
            responses={responses}
            onOpen={(item) => go(openItem(item))}
            onLead={leadItem ? () => go(openItem(leadItem)) : null}
            leadLetter={leadItem?.letter ?? null}
          />
        ) : current ? (
          <ItemScreen
            item={current}
            answer={responseFor(current.item.itemId)?.answer ?? null}
            readOnly={readOnly}
            busy={pending}
            onAnswer={(answer) =>
              send(
                current.item.itemId,
                answer,
                answer === 'no' ? (responseFor(current.item.itemId)?.reasons ?? []) : [],
              )
            }
          />
        ) : (
          <div className="flex flex-col gap-6" data-testid="deck-response">
            {visits.length === 0 && maybes.length === 0 && noes.length === 0 ? (
              <p className={questionHint}>Aucune réponse pour l’instant.</p>
            ) : null}
            {visits.length > 0 ? (
              <section className="flex flex-col gap-3">
                <h1 className={question}>
                  Vous voulez visiter {visits.length > 1 ? 'les biens' : 'le bien'}{' '}
                  {lettersOf(visits)}.
                </h1>
                <p className={questionHint}>Quand pouvez-vous visiter ?</p>
                <div className="flex flex-wrap gap-2">
                  {AVAILABILITY_SLOTS.map((slot) => {
                    const on = availability.includes(slot);
                    return (
                      <button
                        key={slot}
                        type="button"
                        className={chip(on)}
                        aria-pressed={on}
                        disabled={readOnly}
                        data-testid="deck-availability"
                        onClick={() =>
                          setAvailability((current) =>
                            current.includes(slot)
                              ? current.filter((entry) => entry !== slot)
                              : [...current, slot],
                          )
                        }
                      >
                        {AVAILABILITY_LABELS[slot]}
                      </button>
                    );
                  })}
                </div>
              </section>
            ) : null}
            {maybes.length > 0 ? (
              <p className={questionHint}>
                Vous hésitez pour {maybes.length > 1 ? 'les biens' : 'le bien'} {lettersOf(maybes)}.
              </p>
            ) : null}
            {noes.map((item) => {
              const reasons = responseFor(item.item.itemId)?.reasons ?? [];
              return (
                <section key={item.item.itemId} className="flex flex-col gap-3">
                  <p className={statValue}>Le bien {item.letter} : pas pour vous. Pourquoi ?</p>
                  <div className="flex flex-wrap gap-2">
                    {NO_REASONS.map((reason) => {
                      const on = reasons.includes(reason);
                      return (
                        <button
                          key={reason}
                          type="button"
                          className={chip(on)}
                          aria-pressed={on}
                          disabled={readOnly || pending}
                          data-testid="deck-reason"
                          onClick={() => toggleReason(item.item.itemId, reason)}
                        >
                          {NO_REASON_LABELS[reason]}
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
            {visits.length > 0 ? (
              <section className={`${panelSoft} flex flex-col gap-2`} data-testid="deck-next">
                <h2 className={statLabel}>{NEXT_TITLE}</h2>
                <p className="text-base text-zinc-800 stage:text-white/90">
                  Je contacte {visits.length > 1 ? 'les propriétaires' : 'le propriétaire'} de{' '}
                  {lettersOf(visits)} et je vous confirme les visites sous 24 h.
                </p>
                {advisorName ? (
                  <p className="text-sm font-semibold text-zinc-700 stage:text-white/80">
                    {[advisorName, advisorPhone].filter(Boolean).join(' · ')}
                  </p>
                ) : null}
              </section>
            ) : null}
            {/* « Terminer » n'est jamais le bouton principal : il vit en bas de « Sa réponse ». */}
            <div className="flex flex-col items-start gap-3 border-t border-zinc-200 pt-5 stage:border-white/10">
              {confirmFinish ? (
                <div
                  ref={confirmRef}
                  tabIndex={-1}
                  className="flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 outline-none focus-visible:ring-2 focus-visible:ring-amber-500 stage:border-amber-400/40 stage:bg-amber-500/10 stage:text-amber-100"
                  data-testid="deck-finish-confirm"
                  role="alertdialog"
                  aria-labelledby="deck-finish-confirm-text"
                >
                  <p id="deck-finish-confirm-text" className="font-semibold">
                    {confirmFinish}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className={navBtn} onClick={() => setConfirmFinish(null)}>
                      Annuler
                    </button>
                    <button
                      type="button"
                      className={navBtn}
                      disabled={finishing || pending}
                      onClick={finish}
                      data-testid="deck-finish-anyway"
                    >
                      Terminer quand même
                    </button>
                  </div>
                </div>
              ) : null}
              <button
                type="button"
                className={navBtn}
                disabled={finishing || pending}
                onClick={askFinish}
                data-testid="presentation-finish"
              >
                {readOnly ? 'Fermer' : finishing ? 'Enregistrement…' : 'Terminer la présentation'}
              </button>
            </div>
          </div>
        )}
        {error ? (
          <p role="alert" className="mt-4 text-sm font-medium text-red-600 stage:text-red-300">
            {error}
          </p>
        ) : null}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur stage:border-white/10 stage:bg-brand-darkest/90">
        {/* Une seule ligne, « Suivant » à droite (essai du 25/10) : sous 1024 px, les libellés se
            raccourcissent ; le libellé accessible reste entier. */}
        <div
          className="mx-auto flex w-full max-w-5xl flex-nowrap items-center justify-between gap-2"
          data-testid="deck-nav-bar"
        >
          <div className="flex flex-nowrap items-center gap-2">
            <button
              type="button"
              className={navBtn}
              disabled={previous == null}
              onClick={() => go(previous)}
              data-testid="presentation-previous"
            >
              Précédent
            </button>
            {screen.type === 'item' || screen.type === 'answer' ? (
              <button
                type="button"
                className={navBtn}
                onClick={() => go(GRID)}
                aria-label="Revenir à la grille"
                data-testid="deck-back-to-grid"
              >
                <span className="lg:hidden">Grille</span>
                <span className="hidden lg:inline">Revenir à la grille</span>
              </button>
            ) : null}
          </div>
          <div className="flex flex-nowrap items-center gap-2">
            {screen.type === 'grid' || screen.type === 'item' ? (
              <button
                type="button"
                className={navBtn}
                onClick={() => go(ANSWER)}
                aria-label="Passer à ses disponibilités"
                data-testid="deck-go-answer"
              >
                <span className="lg:hidden">Ses disponibilités</span>
                <span className="hidden lg:inline">Passer à ses disponibilités</span>
              </button>
            ) : null}
            {screen.type !== 'answer' ? (
              <button
                type="button"
                className={primaryBtn}
                disabled={next == null}
                onClick={() => go(next)}
                data-testid="presentation-next"
              >
                Suivant
              </button>
            ) : null}
          </div>
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
            <p className="text-sm text-zinc-600">Ses réponses sont enregistrées.</p>
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" className={navBtn} onClick={() => setQuitOpen(false)}>
                Rester
              </button>
              <Link href={`/acquereurs/${deck.buyerId}`} className={primaryBtn}>
                Quitter
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// Mission 122 (partie B) — partagé avec le lien du dossier, sur téléphone.
export function GridScreen({
  deck,
  responses,
  onOpen,
  onLead,
  leadLetter,
}: {
  deck: BuyerDeck;
  responses: ItemResponse[];
  onOpen: (item: DeckItem) => void;
  onLead: (() => void) | null;
  leadLetter: string | null;
}) {
  return (
    <div className="flex flex-col gap-5" data-testid="deck-grid">
      <div className="-mx-4 overflow-x-auto px-4">
        <table
          className={`${panel} w-full min-w-[20rem] border-separate border-spacing-0 text-left`}
        >
          <thead>
            <tr>
              <th className={`${statLabel} pb-2`}>Vos critères</th>
              {deck.items.map((item) => (
                <th key={item.item.itemId} className="pb-2 text-center">
                  <button
                    type="button"
                    onClick={() => onOpen(item)}
                    aria-label={`Voir le bien ${item.letter}`}
                    data-testid="deck-open-item"
                    data-letter={item.letter}
                    className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-zinc-300 px-3 font-title text-base font-bold text-brand-deep hover:border-brand stage:border-white/25 stage:text-brand"
                  >
                    {item.letter}
                  </button>
                </th>
              ))}
            </tr>
            {/* Les réponses déjà données, sur chaque colonne. */}
            <tr>
              <th className="sr-only">Votre réponse</th>
              {deck.items.map((item) => {
                const answer = answerOf(item.item.itemId, responses);
                return (
                  <td
                    key={item.item.itemId}
                    className="pb-2 text-center text-xs font-semibold text-zinc-600 stage:text-white/70"
                    data-testid="deck-grid-answer"
                    data-letter={item.letter}
                    data-answer={answer ?? ''}
                  >
                    {answer ? GRID_ANSWER_LABELS[answer] : ''}
                  </td>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {deck.criteria.map((row, rowIndex) => (
              <tr key={row.criterion} data-testid="deck-grid-row" data-must={row.mustHave}>
                <th
                  scope="row"
                  className="border-t border-zinc-100 py-2 pr-3 text-base font-medium text-zinc-800 stage:border-white/10 stage:text-white/90"
                >
                  {row.label}
                  {row.mustHave ? ' ★' : ''}
                </th>
                {deck.items.map((item) => {
                  const mark = item.marks[rowIndex]!;
                  return (
                    <td
                      key={item.item.itemId}
                      title={mark.text}
                      data-testid="deck-grid-cell"
                      data-mark={mark.mark}
                      className={`border-t border-zinc-100 py-2 text-center font-title text-xl font-bold stage:border-white/10 ${MARK_STYLES[mark.mark]}`}
                    >
                      {markSymbol(mark.mark)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-zinc-500 stage:text-white/50">{GRID_LEGEND}</p>
      {deck.lead ? (
        <div className="flex flex-col items-start gap-3">
          <p
            className="font-title text-xl font-semibold text-zinc-900 stage:text-white"
            data-testid="deck-lead"
          >
            {deck.lead}
          </p>
          {onLead && leadLetter ? (
            <button type="button" className={primaryBtn} onClick={onLead}>
              Voir le bien {leadLetter} →
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// Mission 122 (partie B) — partagé avec le lien du dossier, sur téléphone.
export function ItemScreen({
  item,
  answer,
  readOnly,
  busy,
  onAnswer,
}: {
  item: DeckItem;
  answer: ItemAnswer | null;
  readOnly: boolean;
  busy: boolean;
  onAnswer: (answer: ItemAnswer) => void;
}) {
  const where = [item.item.district, item.item.city]
    .filter((part): part is string => part != null && part !== '')
    .join(' · ');
  const hasBudget = item.marks.some((mark) => mark.criterion === 'budget');
  return (
    <div className="flex flex-col gap-6" data-testid="presentation-item">
      <div className="flex flex-col gap-2">
        <h1 className={question}>{item.item.label}</h1>
        {where ? <p className={questionHint}>{where}</p> : null}
      </div>
      {item.photos.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {item.photos.map((photo, photoIndex) => (
            <RemoteImage
              key={photo}
              src={photo}
              alt=""
              eager={photoIndex === 0}
              className={`h-36 w-full rounded-2xl object-cover sm:h-40 ${photoIndex === 0 ? 'col-span-2 row-span-2 h-56 sm:h-full' : ''}`}
              fallbackClassName="flex h-36 w-full items-center justify-center rounded-2xl bg-zinc-100 text-sm text-zinc-400 stage:bg-white/10 stage:text-white/50"
            />
          ))}
        </div>
      ) : null}
      <section className={panel}>
        <p className={`${statLabel} mb-3`} data-testid="deck-item-count">
          {criteriaCountLabel(item)}
        </p>
        <ul className="flex flex-col gap-2">
          {item.marks.map((mark) => (
            <li key={mark.criterion} data-testid="deck-mark" data-mark={mark.mark}>
              <span className={`text-base font-medium ${MARK_STYLES[mark.mark]}`}>
                {markSymbol(mark.mark)} {mark.text}
              </span>
              {mark.criterion === 'budget' && item.priceLine ? (
                <span
                  className="block pl-5 text-xs text-zinc-500 stage:text-white/55"
                  data-testid="deck-price-line"
                >
                  {item.priceLine}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
        {!hasBudget && item.priceLine ? (
          <p
            className="mt-3 text-xs text-zinc-500 stage:text-white/55"
            data-testid="deck-price-line"
          >
            {item.priceLine}
          </p>
        ) : null}
      </section>
      {item.pitch ? (
        <section className={panelSoft} data-testid="deck-pitch">
          <h2 className={`${statLabel} mb-2`}>{PITCH_TITLE}</h2>
          <p className="text-lg text-zinc-800 stage:text-white/90">« {item.pitch} »</p>
        </section>
      ) : null}
      {item.datedFact ? (
        <p className="text-sm text-zinc-600 stage:text-white/70" data-testid="deck-dated">
          ● {item.datedFact}
        </p>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-3">
        {ITEM_ANSWERS.map((value) => {
          const on = answer === value;
          return (
            <button
              key={value}
              type="button"
              className={on ? primaryBtn : navBtn}
              aria-pressed={on}
              disabled={readOnly || busy}
              data-testid="deck-answer"
              data-answer={value}
              onClick={() => onAnswer(value)}
            >
              {on ? `✓ ${ITEM_ANSWER_LABELS[value]}` : ITEM_ANSWER_LABELS[value]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
