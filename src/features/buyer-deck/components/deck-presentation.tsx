'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';

import { Logo } from '@/components/brand/logo';
import { RemoteImage } from '@/components/ui/remote-image';
import { answerItem, finishPresentation } from '@/features/buyer-deck/actions/deck-actions';
import { GridLegend, MustHaveStar, markClass } from '@/features/buyer-deck/components/deck-marks';
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
  AVAILABILITY_SLOTS,
  ITEM_ANSWERS,
  NO_REASONS,
  type AvailabilitySlot,
  type BuyerDeck,
  type DeckItem,
  type ItemAnswer,
  type ItemResponse,
  type NoReason,
} from '@/features/buyer-deck/types';
import { buyerDateIn } from '@/features/buyers/services/buyer-criteria';
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
import { clientTexts, type TextLanguage } from '@/lib/client-texts';
import { FRENCH_TEXTS } from '@/lib/client-texts/fr';

// Mission 122 — la présentation du dossier qui fait agir, plein cadre (M72), tablette d'abord : ses
// mots → la grille → un bien par écran → sa réponse. Il ne lit pas, il répond : le conseiller
// touche « Je veux le visiter », « Peut-être » ou « Pas pour moi » quand l'acquéreur le dit, puis
// ses raisons et ses disponibilités ; « Terminer » fige (M111). Une présentation terminée se relit
// en lecture seule (M119).

// Mission 140 — les mots vivent dans les textes du client ; ces noms gardent le français.
export const WORDS_TITLE = FRENCH_TEXTS.buyer.screens.wordsTitle;
export const PITCH_TITLE = FRENCH_TEXTS.buyer.screens.pitchTitle;
export const NEXT_TITLE = FRENCH_TEXTS.buyer.screens.nextTitle;
const screensOf = (language: TextLanguage) => clientTexts(language).buyer.screens;

const chromeBtn =
  'inline-flex min-h-10 items-center justify-center rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand stage:text-white/60 stage:hover:bg-white/10 stage:hover:text-white';
const navBtn =
  'inline-flex min-h-12 items-center justify-center whitespace-nowrap rounded-xl border border-zinc-200 bg-white px-5 py-3 font-title text-base font-semibold text-zinc-700 transition-colors hover:border-brand hover:text-brand-deep disabled:cursor-not-allowed disabled:opacity-40 stage:border-white/20 stage:bg-white/5 stage:text-white/80 stage:hover:border-brand stage:hover:text-white';
const primaryBtn =
  'inline-flex min-h-12 items-center justify-center whitespace-nowrap rounded-xl bg-brand-deep px-6 py-3 font-title text-base font-semibold text-white shadow-lg shadow-brand/30 transition-colors hover:bg-brand-darker disabled:cursor-not-allowed disabled:opacity-50 stage:bg-white stage:text-brand-deep stage:hover:bg-brand-soft';
// Essai de Jean-Guy (25/10) : la navigation est discrète, jamais plus visible que la réponse.
export const quietNavBtn =
  'inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-xl px-4 py-2.5 font-title text-sm font-semibold text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40 stage:text-white/65 stage:hover:bg-white/10 stage:hover:text-white';
// Essai de Jean-Guy (26/10) : la réponse choisie devient pleine, à la couleur de l'agence, avec
// « ✓ » ; les deux autres restent en contour — « Je veux le visiter » n'est jamais plein s'il
// n'est pas choisi.
export function answerBtn(_value: ItemAnswer, on: boolean): string {
  // Relue, la réponse choisie reste pleine, jamais pâlie (un bouton désactivé l'était).
  return on ? `${primaryBtn} disabled:opacity-100` : navBtn;
}
const chip = (on: boolean): string =>
  `inline-flex min-h-11 items-center rounded-full border px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed ${
    on
      ? 'border-brand bg-brand-deep text-white stage:border-white stage:bg-white stage:text-brand-deep'
      : 'border-zinc-300 bg-white text-zinc-700 hover:border-brand stage:border-white/25 stage:bg-white/5 stage:text-white/80'
  }`;

const lettersOf = (items: DeckItem[], language: TextLanguage = 'fr'): string =>
  screensOf(language).letters(items.map((item) => item.letter));

export function DeckPresentation({
  deck,
  initialResponses,
  initialAvailability,
  logoLightUrl,
  logoDarkUrl,
  agencyName,
  advisorName,
  advisorPhone,
  advisorEmail = null,
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
  advisorEmail?: string | null;
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
  const language: TextLanguage = deck.language ?? 'fr';
  const t = screensOf(language);
  const shell = clientTexts(language).live.shell;
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
        error: t.connectionLost,
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
      language,
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
            error: t.connectionLost,
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
      ? t.kickerSelection(deck.items.length)
      : screen.type === 'grid'
        ? t.kickerCriteria
        : current
          ? t.kickerItem(current.letter, criteriaCountLabel(current, language))
          : t.kickerAnswer;

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
          <span className="hidden shrink-0 text-sm font-medium whitespace-nowrap text-zinc-500 sm:inline stage:text-white/50">
            {readOnly ? t.finishedOn(buyerDateIn(deck.presentedAt!, language)) : t.meetingLabel}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => setStage((s) => (s === 'dark' ? 'light' : 'dark'))}
            className={chromeBtn}
          >
            {stage === 'dark' ? shell.light : shell.dark}
          </button>
          <button type="button" onClick={toggleFullscreen} className={chromeBtn}>
            {isFullscreen ? shell.exitFullscreen : shell.fullscreen}
          </button>
          <button type="button" onClick={() => setQuitOpen(true)} className={chromeBtn}>
            {shell.quit}
          </button>
        </div>
      </header>

      <div className="relative mx-auto mt-4 flex w-full max-w-5xl flex-col gap-1.5 px-4 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={kicker} data-testid="deck-kicker">
            {kickerText}
          </span>
          <span className="text-xs text-zinc-500 stage:text-white/40">
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
          Présentation terminée le {buyerDateIn(deck.presentedAt!, 'fr')} : pour en refaire une,{' '}
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
            <h1 className={question}>{t.wordsTitle}</h1>
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
            compact
            language={language}
          />
        ) : current ? (
          <ItemScreen
            item={current}
            answer={responseFor(current.item.itemId)?.answer ?? null}
            readOnly={readOnly}
            busy={pending}
            language={language}
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
              <p className={questionHint}>{t.noAnswer}</p>
            ) : null}
            {visits.length > 0 ? (
              <section className="flex flex-col gap-3">
                <h1 className={question}>{t.visit(visits.length, lettersOf(visits, language))}</h1>
                <p className={questionHint}>{t.when}</p>
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
                        {t.slots[slot]}
                      </button>
                    );
                  })}
                </div>
              </section>
            ) : null}
            {maybes.length > 0 ? (
              <p className={questionHint}>
                {t.hesitate(maybes.length, lettersOf(maybes, language))}
              </p>
            ) : null}
            {noes.map((item) => {
              const reasons = responseFor(item.item.itemId)?.reasons ?? [];
              return (
                <section key={item.item.itemId} className="flex flex-col gap-3">
                  <p className={statValue}>{t.notForYou(item.letter)}</p>
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
                          {t.reasons[reason]}
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
            {visits.length > 0 ? (
              <section className={`${panelSoft} flex flex-col gap-2`} data-testid="deck-next">
                <h2 className={statLabel}>{t.nextTitle}</h2>
                <p className="text-base text-zinc-800 stage:text-white/90">
                  {t.nextStep(visits.length, lettersOf(visits, language))}
                </p>
                {advisorName ? (
                  <p className="text-sm font-semibold text-zinc-700 stage:text-white/80">
                    {advisorName}
                    {/* Mission 143 (I11) — le numéro s'appelle d'un toucher, et reste écrit. */}
                    {advisorPhone ? (
                      <>
                        {' · '}
                        <a
                          href={`tel:${advisorPhone.replace(/[^\d+]/g, '')}`}
                          className="inline-flex min-h-11 items-center whitespace-nowrap underline underline-offset-4"
                          data-testid="deck-advisor-phone"
                        >
                          {advisorPhone}
                        </a>
                      </>
                    ) : null}
                    {advisorEmail ? (
                      <>
                        {' · '}
                        <a
                          href={`mailto:${advisorEmail}`}
                          className="inline-flex min-h-11 items-center underline underline-offset-4"
                          data-testid="deck-advisor-email"
                        >
                          {advisorEmail}
                        </a>
                      </>
                    ) : null}
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
                      {t.cancel}
                    </button>
                    <button
                      type="button"
                      className={navBtn}
                      disabled={finishing || pending}
                      onClick={finish}
                      data-testid="deck-finish-anyway"
                    >
                      {t.finishAnyway}
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
                {readOnly ? t.close : finishing ? shell.saving : t.finish}
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
              className={quietNavBtn}
              disabled={previous == null}
              onClick={() => go(previous)}
              data-testid="presentation-previous"
            >
              {t.previous}
            </button>
            {screen.type === 'item' || screen.type === 'answer' ? (
              <button
                type="button"
                className={quietNavBtn}
                onClick={() => go(GRID)}
                aria-label={t.backToGrid}
                data-testid="deck-back-to-grid"
              >
                <span className="lg:hidden">{t.gridShort}</span>
                <span className="hidden lg:inline">{t.backToGrid}</span>
              </button>
            ) : null}
          </div>
          <div className="flex flex-nowrap items-center gap-2">
            {screen.type === 'grid' || screen.type === 'item' ? (
              <button
                type="button"
                className={quietNavBtn}
                onClick={() => go(ANSWER)}
                aria-label={t.toAvailability}
                data-testid="deck-go-answer"
              >
                <span className="lg:hidden">{t.availabilityShort}</span>
                <span className="hidden lg:inline">{t.toAvailability}</span>
              </button>
            ) : null}
            {screen.type !== 'answer' ? (
              <button
                type="button"
                className={quietNavBtn}
                disabled={next == null}
                onClick={() => go(next)}
                data-testid="presentation-next"
              >
                {t.next}
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
            <p className="font-title text-xl font-bold">{t.quitTitle}</p>
            <p className="text-sm text-zinc-600">{t.quitSaved}</p>
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" className={navBtn} onClick={() => setQuitOpen(false)}>
                {shell.stay}
              </button>
              <Link href={`/acquereurs/${deck.buyerId}`} className={primaryBtn}>
                {shell.quit}
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
  compact = false,
  language = 'fr',
}: {
  language?: TextLanguage;
  deck: BuyerDeck;
  responses: ItemResponse[];
  onOpen: (item: DeckItem) => void;
  onLead: (() => void) | null;
  leadLetter: string | null;
  // En présentation (essai de Jean-Guy, 26/10) : la grille, sa légende, la phrase de tête et
  // « Voir le bien A » tiennent dans l'écran en 1024 × 768 et 1280 × 800, sans défiler.
  compact?: boolean;
}) {
  const tablePanel = compact
    ? 'rounded-2xl border border-zinc-200 bg-white px-4 py-2 shadow-card stage:border-white/10 stage:bg-white/5 stage:shadow-none stage:backdrop-blur-sm'
    : panel;
  const rowPad = compact ? 'py-1' : 'py-2';
  const t = screensOf(language);
  return (
    <div className={`flex flex-col ${compact ? 'gap-3' : 'gap-5'}`} data-testid="deck-grid">
      {/* La phrase de tête au-dessus de la grille, avec « Voir le bien A » (essai, 26/10). */}
      {deck.lead ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p
            className={`font-title font-semibold text-zinc-900 stage:text-white ${compact ? 'text-lg' : 'text-xl'}`}
            data-testid="deck-lead"
          >
            {deck.lead}
          </p>
          {onLead && leadLetter ? (
            <button
              type="button"
              className={primaryBtn}
              onClick={onLead}
              data-testid="deck-lead-open"
            >
              {t.seeItem(leadLetter)} →
            </button>
          ) : null}
        </div>
      ) : null}
      <div className="-mx-4 overflow-x-auto px-4">
        <table
          className={`${tablePanel} w-full min-w-[20rem] border-separate border-spacing-0 text-left`}
        >
          <thead>
            <tr>
              <th className={`${statLabel} pb-1.5`}>{t.kickerCriteria}</th>
              {deck.items.map((item) => (
                <th key={item.item.itemId} className="px-1 pb-1.5 text-center align-bottom">
                  {/* Essai de Jean-Guy (25/10) : en tête de chaque colonne, la miniature du bien
                      et sa lettre. */}
                  <button
                    type="button"
                    onClick={() => onOpen(item)}
                    aria-label={t.seeItem(item.letter)}
                    data-testid="deck-open-item"
                    data-letter={item.letter}
                    className={`mx-auto flex w-full flex-col items-center gap-0.5 rounded-xl border border-zinc-300 p-1 font-title text-base font-bold text-brand-deep hover:border-brand stage:border-white/25 stage:text-brand ${compact ? 'max-w-20' : 'max-w-28'}`}
                  >
                    {item.photos[0] ? (
                      <RemoteImage
                        src={item.photos[0]}
                        alt=""
                        className="aspect-[4/3] w-full rounded-lg object-cover"
                        fallbackClassName="aspect-[4/3] w-full rounded-lg bg-zinc-100 text-[0.6rem] text-zinc-500 stage:bg-white/10"
                        fallbackLabel=""
                      />
                    ) : null}
                    <span data-testid="deck-grid-thumb-letter">{item.letter}</span>
                  </button>
                </th>
              ))}
            </tr>
            {/* Les réponses déjà données, sur chaque colonne. */}
            <tr>
              <th className="sr-only">{t.kickerAnswer}</th>
              {deck.items.map((item) => {
                const answer = answerOf(item.item.itemId, responses);
                return (
                  <td
                    key={item.item.itemId}
                    className="pb-1 text-center text-xs font-semibold text-zinc-600 stage:text-white/70"
                    data-testid="deck-grid-answer"
                    data-letter={item.letter}
                    data-answer={answer ?? ''}
                  >
                    {answer ? t.gridAnswers[answer] : ''}
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
                  className={`border-t border-zinc-100 ${rowPad} pr-3 font-medium text-zinc-800 stage:border-white/10 stage:text-white/90 ${compact ? 'text-sm' : 'text-base'}`}
                >
                  {row.label}
                  {row.mustHave ? (
                    <>
                      {' '}
                      <MustHaveStar language={language} />
                    </>
                  ) : null}
                </th>
                {deck.items.map((item) => {
                  const mark = item.marks[rowIndex]!;
                  return (
                    <td
                      key={item.item.itemId}
                      title={mark.text}
                      data-testid="deck-grid-cell"
                      data-mark={mark.mark}
                      data-tone={mark.tone ?? undefined}
                      className={`border-t border-zinc-100 ${rowPad} text-center font-title font-bold stage:border-white/10 ${compact ? 'text-base leading-6' : 'text-xl'} ${markClass(mark)}`}
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
      <GridLegend className="text-xs text-zinc-500 stage:text-white/50" language={language} />
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
  reasons,
  onReason,
  language = 'fr',
}: {
  language?: TextLanguage;
  item: DeckItem;
  answer: ItemAnswer | null;
  readOnly: boolean;
  busy: boolean;
  onAnswer: (answer: ItemAnswer) => void;
  // Sur le lien (essai de Jean-Guy, 26/10) : « Pas pour moi » choisi, ses raisons s'affichent
  // tout de suite dessous.
  reasons?: NoReason[];
  onReason?: (reason: NoReason) => void;
}) {
  const where = [item.item.district, item.item.city]
    .filter((part): part is string => part != null && part !== '')
    .join(' · ');
  const hasBudget = item.marks.some((mark) => mark.criterion === 'budget');
  const t = screensOf(language);
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
              fallbackClassName="flex h-36 w-full items-center justify-center rounded-2xl bg-zinc-100 text-sm text-zinc-500 stage:bg-white/10 stage:text-white/50"
            />
          ))}
        </div>
      ) : null}
      <section className={panel}>
        <p className={`${statLabel} mb-3`} data-testid="deck-item-count">
          {criteriaCountLabel(item, language)}
        </p>
        <ul className="flex flex-col gap-2">
          {item.marks.map((mark) => (
            <li
              key={mark.criterion}
              data-testid="deck-mark"
              data-mark={mark.mark}
              data-tone={mark.tone ?? undefined}
            >
              <span className={`text-base font-medium ${markClass(mark)}`}>
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
          <h2 className={`${statLabel} mb-2`}>{t.pitchTitle}</h2>
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
              className={answerBtn(value, on)}
              aria-pressed={on}
              disabled={readOnly || busy}
              data-testid="deck-answer"
              data-answer={value}
              onClick={() => onAnswer(value)}
            >
              {on ? `✓ ${t.answers[value]}` : t.answers[value]}
            </button>
          );
        })}
      </div>
      {answer === 'no' && onReason ? (
        <div className="flex flex-col gap-2" data-testid="item-reasons">
          <p className="text-base font-semibold text-zinc-900 stage:text-white">{t.why}</p>
          <div className="flex flex-wrap gap-2">
            {NO_REASONS.map((reason) => {
              const on = (reasons ?? []).includes(reason);
              return (
                <button
                  key={reason}
                  type="button"
                  className={chip(on)}
                  aria-pressed={on}
                  disabled={readOnly || busy}
                  data-testid="item-reason"
                  onClick={() => onReason(reason)}
                >
                  {t.reasons[reason]}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
