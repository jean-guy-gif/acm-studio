'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';

import { RemoteImage } from '@/components/ui/remote-image';

import {
  GridScreen,
  ItemScreen,
  quietNavBtn,
} from '@/features/buyer-deck/components/deck-presentation';
import { criteriaCountLabel } from '@/features/buyer-deck/services/buyer-deck';
import {
  ANSWER,
  GRID,
  WORDS,
  nextScreen,
  previousScreen,
  sendConfirmation,
  unansweredLetters,
  type DeckScreen,
} from '@/features/buyer-deck/services/deck-navigation';
import {
  AVAILABILITY_SLOTS,
  NO_REASONS,
  type AvailabilitySlot,
  type BuyerDeck,
  type DeckItem,
  type ItemAnswer,
  type ItemResponse,
  type NoReason,
} from '@/features/buyer-deck/types';
import { buyerDateIn } from '@/features/buyers/services/buyer-criteria';
import { submitDossierAnswers } from '@/features/buyer-dossier/actions/submit-dossier-answers';
import { linkScreen, type LinkClosed } from '@/features/buyer-dossier/services/link-screen';
import { DOSSIER_ALREADY_ANSWERED, DOSSIER_PRESENTED } from '@/features/buyer-dossier/types';
import { clientTexts, type TextLanguage } from '@/lib/client-texts';
import { FRENCH_TEXTS } from '@/lib/client-texts/fr';
import type { DossierAcademiaLink } from '@/features/buyer-dossier/types';
import { withFrenchSpacing } from '@/lib/typography/french-spacing';

// Mission 140 — dans la langue de l'acquéreur, celle de son déroulé (le français par défaut).
const screensOf = (deck: BuyerDeck) => clientTexts(deck.language ?? 'fr').buyer.screens;
const languageOf = (deck: BuyerDeck): TextLanguage => deck.language ?? 'fr';
// Les refus du serveur, redits dans sa langue ; un autre message, la connexion perdue.
function localError(message: string, deck: BuyerDeck): string {
  const t = screensOf(deck);
  if (message === DOSSIER_PRESENTED) return t.presented;
  if (message === DOSSIER_ALREADY_ANSWERED) return t.alreadyAnswered;
  if (languageOf(deck) === 'fr') return message;
  const french = FRENCH_TEXTS.buyer.screens;
  if (message === french.expired) return t.expired;
  if (message === french.noAnswerYet) return t.noAnswerYet;
  if (message === french.sendFailed) return t.sendFailed;
  return t.connectionLost;
}

// Mission 122 (partie B) — le lien du dossier, pensé pour le téléphone : le même déroulé que la
// présentation (M122 A), un écran à la fois, défilement vertical, boutons au pouce. Ses réponses
// restent sur l'appareil jusqu'à « Envoyer ma réponse » ; une seconde ouverture montre « Merci, j'ai
// bien reçu votre réponse » et ce qu'il a répondu, sans pouvoir répondre deux fois. Décisions de
// Jean-Guy (25/10) : l'envoi demande confirmation s'il reste des biens sans réponse ; la présentation
// terminée, le lien devient « Ce que nous avons vu ensemble », en lecture seule ; « Télécharger en
// PDF », discret, à la fin, imprime le dossier (le document est dans la page, caché à l'écran).

type LocalAnswer = { answer: ItemAnswer; reasons: NoReason[] };

const navBtn =
  'inline-flex min-h-12 flex-1 items-center justify-center whitespace-nowrap rounded-xl border border-zinc-300 bg-white px-3 py-3 font-title text-base font-semibold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-40';
// Mission 146 (partie B) — le repère du bouton plein (`btn-filled`), un seul par écran.
const primaryBtn =
  'btn-filled inline-flex min-h-12 flex-1 items-center justify-center whitespace-nowrap rounded-xl bg-brand-deep px-4 py-3 font-title text-base font-semibold text-white shadow disabled:cursor-not-allowed disabled:opacity-50';
const chip = (on: boolean): string =>
  `inline-flex min-h-11 items-center rounded-full border px-4 py-2 text-sm font-semibold ${
    on ? 'border-brand bg-brand-deep text-white' : 'border-zinc-300 bg-white text-zinc-700'
  }`;

const toLocal = (responses: ItemResponse[]): Map<string, LocalAnswer> =>
  new Map(
    responses.map((response) => [
      response.itemId,
      { answer: response.answer, reasons: response.reasons },
    ]),
  );

function DownloadButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="self-center py-3 text-sm font-medium text-zinc-500 underline underline-offset-4"
      data-testid="dossier-download"
    >
      {label}
    </button>
  );
}

const lettersOf = (items: DeckItem[], deck: BuyerDeck): string =>
  screensOf(deck).letters(items.map((item) => item.letter));

function Recap({
  deck,
  answers,
  availability,
}: {
  deck: BuyerDeck;
  answers: Map<string, LocalAnswer>;
  availability: AvailabilitySlot[];
}) {
  const t = screensOf(deck);
  return (
    <ul className="flex flex-col gap-2" data-testid="dossier-recap">
      {deck.items.map((entry) => {
        const given = answers.get(entry.item.itemId);
        if (!given) return null;
        return (
          <li
            key={entry.item.itemId}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-3"
            data-testid="dossier-recap-item"
            data-answer={given.answer}
          >
            <span className="block font-semibold">
              {t.kickerItem(entry.letter, entry.item.label)}
            </span>
            <span className="text-sm text-zinc-700">
              {t.answers[given.answer]}
              {given.reasons.length > 0
                ? t.reasonsSuffix(given.reasons.map((reason) => t.reasons[reason]).join(', '))
                : ''}
            </span>
          </li>
        );
      })}
      {availability.length > 0 ? (
        <li className="text-sm text-zinc-700" data-testid="dossier-recap-availability">
          {t.yourSlots(availability.map((slot) => t.slots[slot]).join(', '))}
        </li>
      ) : null}
    </ul>
  );
}

type FrameProps = {
  agencyName: string;
  logoUrl: string | null;
  advisorName: string | null;
  advisorPhone: string | null;
  advisorEmail?: string | null;
};

function LinkHeader({ agencyName, logoUrl }: Pick<FrameProps, 'agencyName' | 'logoUrl'>) {
  return (
    <header className="flex items-center justify-between gap-3 px-4 pt-4">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt={agencyName} className="max-h-9 max-w-36 object-contain" />
      ) : (
        <span className="font-title text-base font-semibold text-brand-deep">{agencyName}</span>
      )}
    </header>
  );
}

// Le numéro ne se coupe jamais en deux lignes (rendus du 26/10 : « 06 00 / 00 00 01 »). Mission 143
// (I11) — il s'appelle d'un toucher (`tel:`), l'e-mail s'écrit (`mailto:`) : le geste n° 1 sur un
// téléphone ; le numéro reste écrit en clair (un `tel:` ne marche pas partout).
const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;
const contactLink =
  'inline-flex min-h-11 items-center whitespace-nowrap font-semibold text-brand-deep underline decoration-brand-deep/30 underline-offset-4';

function AdvisorContact({
  name,
  phone,
  email = null,
}: {
  name: string;
  phone: string | null;
  email?: string | null;
}) {
  return (
    <>
      {name}
      {phone ? (
        <>
          {' · '}
          <a href={telHref(phone)} className={contactLink} data-testid="dossier-advisor-phone">
            {phone}
          </a>
        </>
      ) : null}
      {email ? (
        <>
          {' · '}
          <a href={`mailto:${email}`} className={contactLink} data-testid="dossier-advisor-email">
            {email}
          </a>
        </>
      ) : null}
    </>
  );
}

function AdvisorLine({
  advisorName,
  advisorPhone,
  advisorEmail = null,
}: Pick<FrameProps, 'advisorName' | 'advisorPhone' | 'advisorEmail'>) {
  return advisorName ? (
    <p className="text-sm font-semibold text-zinc-700" data-testid="dossier-advisor-line">
      <AdvisorContact name={advisorName} phone={advisorPhone} email={advisorEmail} />
    </p>
  ) : null;
}

// Mission 147 (partie A) — le lien client « Vivre ici » d'Academia, collé sur le mandat : sous chaque
// bien de l'agence de sa sélection qui en a un, sur l'écran du bien et après sa réponse (merci,
// « Ce que nous avons vu ensemble ») ; il ouvre Academia dans un nouvel onglet.
function AcademiaLinkList({ deck, entries }: { deck: BuyerDeck; entries: DossierAcademiaLink[] }) {
  const t = screensOf(deck);
  return (
    <>
      {entries.map((entry) => {
        const item = deck.items.find((candidate) => candidate.item.itemId === entry.itemId);
        if (!item) return null;
        return (
          <a
            key={entry.itemId}
            href={entry.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between gap-3 rounded-2xl border border-brand-soft bg-brand-soft/40 p-4"
            data-testid="dossier-living-here"
          >
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-sm text-zinc-600">
                {item.letter} · {item.item.label}
              </span>
              <span className="font-title text-base font-bold text-brand-deep">
                {t.livingHereLink}
              </span>
              <span className="text-sm text-zinc-600">{t.livingHereLinkHint}</span>
            </span>
            <span aria-hidden className="text-xl text-brand-deep">
              ↗
            </span>
          </a>
        );
      })}
    </>
  );
}

// La présentation terminée : « Ce que nous avons vu ensemble », ses réponses du rendez-vous et ses
// créneaux du rendez-vous (rangés dans le déroulé figé), le conseiller, en lecture seule.
export function SeenTogetherView({
  deck,
  answers,
  availability,
  note,
  academiaLinks = [],
  ...frame
}: FrameProps & {
  deck: BuyerDeck;
  answers: ItemResponse[];
  availability: AvailabilitySlot[];
  note: string | null;
  academiaLinks?: DossierAcademiaLink[];
}) {
  const t = screensOf(deck);
  return (
    <div className="flex min-h-[100dvh] flex-col bg-white" data-testid="dossier-seen-together">
      <LinkHeader agencyName={frame.agencyName} logoUrl={frame.logoUrl} />
      <main className="mx-auto flex w-full max-w-xl flex-col gap-5 px-4 py-6">
        <h1 className="font-title text-2xl font-bold text-brand-deep">{t.seenTogetherTitle}</h1>
        {note ? <p className="text-base text-zinc-700">{note}</p> : null}
        {answers.length > 0 ? (
          <>
            <p className="text-base text-zinc-700">{t.answeredTitle}</p>
            <Recap deck={deck} answers={toLocal(answers)} availability={availability} />
          </>
        ) : (
          <p className="text-base text-zinc-700">
            {t.seenTogether(deck.items.length, lettersOf(deck.items, deck))}
          </p>
        )}
        <AcademiaLinkList deck={deck} entries={academiaLinks} />
        <AdvisorLine
          advisorName={frame.advisorName}
          advisorPhone={frame.advisorPhone}
          advisorEmail={frame.advisorEmail}
        />
        <DownloadButton label={t.download} />
      </main>
    </div>
  );
}

// Sa réponse donnée : « Merci, j'ai bien reçu votre réponse » et ce qu'il a répondu sur le lien,
// sans formulaire ; `note` dit pourquoi un envoi a été refusé (déjà répondu).
export function ThanksView({
  deck,
  answers,
  availability,
  note,
  academiaLinks = [],
  ...frame
}: FrameProps & {
  deck: BuyerDeck;
  answers: Map<string, LocalAnswer>;
  availability: AvailabilitySlot[];
  note: string | null;
  academiaLinks?: DossierAcademiaLink[];
}) {
  const t = screensOf(deck);
  return (
    <div className="flex min-h-[100dvh] flex-col bg-white" data-testid="dossier-thanks">
      <LinkHeader agencyName={frame.agencyName} logoUrl={frame.logoUrl} />
      <main className="mx-auto flex w-full max-w-xl flex-col gap-5 px-4 py-6">
        <h1 className="font-title text-2xl font-bold text-brand-deep">{t.thanks}</h1>
        {note ? <p className="text-base text-zinc-700">{note}</p> : null}
        {answers.size > 0 ? (
          <>
            <p className="text-base text-zinc-700">{t.hereIsWhat}</p>
            <Recap deck={deck} answers={answers} availability={availability} />
          </>
        ) : null}
        <AcademiaLinkList deck={deck} entries={academiaLinks} />
        <AdvisorLine
          advisorName={frame.advisorName}
          advisorPhone={frame.advisorPhone}
          advisorEmail={frame.advisorEmail}
        />
        <DownloadButton label={t.download} />
      </main>
    </div>
  );
}

export function DossierPhoneDeck({
  token,
  deck,
  answered,
  initialAnswers,
  initialAvailability,
  meetingAnswers,
  meetingAvailability,
  agencyName,
  logoUrl,
  advisorName,
  advisorPhone,
  advisorEmail = null,
  academiaLinks = [],
}: {
  token: string;
  deck: BuyerDeck;
  answered: boolean;
  initialAnswers: ItemResponse[];
  initialAvailability: AvailabilitySlot[];
  meetingAnswers: ItemResponse[];
  meetingAvailability: AvailabilitySlot[];
  agencyName: string;
  logoUrl: string | null;
  advisorName: string | null;
  advisorPhone: string | null;
  advisorEmail?: string | null;
  // Mission 147 (partie A) — le lien « Vivre ici » d'Academia de chaque mandat signé de sa sélection.
  academiaLinks?: DossierAcademiaLink[];
}) {
  const router = useRouter();
  const t = screensOf(deck);
  const language = languageOf(deck);
  const [screen, setScreen] = useState<DeckScreen>(WORDS);
  const [answers, setAnswers] = useState<Map<string, LocalAnswer>>(() => new Map());
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  // Envoyée depuis cet écran ; ou refusée parce que déjà donnée (ou la présentation terminée) :
  // le merci, jamais de nouveau le formulaire, et la page se recharge pour relire ce qui est en base.
  const [sent, setSent] = useState(false);
  const [closed, setClosed] = useState<{ kind: LinkClosed; message: string } | null>(null);
  const [confirmSend, setConfirmSend] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const confirmRef = useRef<HTMLDivElement | null>(null);
  // La confirmation de l'envoi prend le focus dès qu'elle s'ouvre.
  useEffect(() => {
    if (confirmSend) confirmRef.current?.focus();
  }, [confirmSend]);
  const itemCount = deck.items.length;
  // La photo de couverture : la première du bien A, sinon la première de la sélection (comme le PDF).
  const coverPhoto = deck.items.flatMap((entry) => entry.photos)[0] ?? null;
  const current = screen.type === 'item' ? deck.items[screen.index] : undefined;
  const next = nextScreen(screen, itemCount);
  const previous = previousScreen(screen);
  const lastItem = screen.type === 'item' && next == null;
  // La barre fixée « Envoyer ma réponse » : dès la première réponse, sur la grille et les biens,
  // sauf le dernier, où le bouton tient la place de « Suivant ».
  const sendBar =
    answers.size > 0 && (screen.type === 'grid' || (screen.type === 'item' && !lastItem));

  const go = (target: DeckScreen | null) => {
    if (!target) return;
    setScreen(target);
    setError(null);
    window.scrollTo({ top: 0 });
  };

  const setAnswer = (itemId: string, answer: ItemAnswer) =>
    setAnswers((map) => {
      const copy = new Map(map);
      copy.set(itemId, {
        answer,
        reasons: answer === 'no' ? (map.get(itemId)?.reasons ?? []) : [],
      });
      return copy;
    });
  const toggleReason = (itemId: string, reason: NoReason) =>
    setAnswers((map) => {
      const copy = new Map(map);
      const reasons = map.get(itemId)?.reasons ?? [];
      copy.set(itemId, {
        answer: 'no',
        reasons: reasons.includes(reason)
          ? reasons.filter((entry) => entry !== reason)
          : [...reasons, reason],
      });
      return copy;
    });

  // Les réponses locales, sous la forme que la grille sait lire.
  const asResponses: ItemResponse[] = [...answers.entries()].map(([itemId, given]) => ({
    id: itemId,
    itemId,
    answer: given.answer,
    reasons: given.reasons,
    answeredDuring: 'dossier',
    answeredAt: '',
  }));
  const answeredWith = (answer: ItemAnswer): DeckItem[] =>
    deck.items.filter((entry) => answers.get(entry.item.itemId)?.answer === answer);
  const visits = answeredWith('visit');
  const maybes = answeredWith('maybe');
  const noes = answeredWith('no');

  const askSend = () => {
    if (answers.size === 0) {
      setError(t.noAnswerYet);
      return;
    }
    setError(null);
    const question = sendConfirmation(
      unansweredLetters(
        deck.items.map((entry) => ({ letter: entry.letter, itemId: entry.item.itemId })),
        asResponses,
      ),
      language,
    );
    if (question) {
      setConfirmSend(question);
      return;
    }
    send();
  };

  const send = () => {
    setConfirmSend(null);
    startTransition(async () => {
      const result = await submitDossierAnswers(
        token,
        [...answers.entries()].map(([itemId, given]) => ({ itemId, ...given })),
        visits.length > 0 ? availability : [],
      ).catch(() => ({ ok: false as const, error: t.connectionLost }));
      if (!result.ok) {
        if ('closed' in result && result.closed) {
          setClosed({ kind: result.closed, message: localError(result.error, deck) });
          router.refresh();
          window.scrollTo({ top: 0 });
          return;
        }
        setError(localError(result.error, deck));
        return;
      }
      setSent(true);
      window.scrollTo({ top: 0 });
    });
  };

  const frame = { agencyName, logoUrl, advisorName, advisorPhone, advisorEmail };
  const header = <LinkHeader agencyName={agencyName} logoUrl={logoUrl} />;
  const shown = linkScreen({
    presented: deck.presentedAt != null,
    answered,
    sent,
    closed: closed?.kind ?? null,
  });
  if (shown === 'seen-together') {
    return (
      <SeenTogetherView
        {...frame}
        deck={deck}
        answers={meetingAnswers}
        availability={meetingAvailability}
        note={deck.presentedAt == null ? (closed?.message ?? null) : null}
        academiaLinks={academiaLinks}
      />
    );
  }
  if (shown === 'thanks') {
    // Relue en base (déjà répondu, ou refusé parce qu'elle l'était), ou envoyée depuis cet écran.
    const fromServer = answered || !sent;
    return (
      <ThanksView
        {...frame}
        deck={deck}
        answers={fromServer ? toLocal(initialAnswers) : answers}
        availability={fromServer ? initialAvailability : visits.length > 0 ? availability : []}
        note={closed && !answered ? closed.message : null}
        academiaLinks={academiaLinks}
      />
    );
  }

  return (
    <div
      // La place de la barre d'envoi est gardée sous TOUTE la page, navigation comprise : en fin
      // de défilement, ni une réponse ni « Précédent » / « Suivant » ne sont sous elle.
      className={`flex min-h-[100dvh] flex-col bg-white ${sendBar ? 'pb-28' : ''}`}
      data-testid="dossier-phone-deck"
      data-screen={screen.type}
    >
      {header}
      {screen.type === 'words' ? null : (
        <p className="px-4 pt-3 text-xs font-semibold tracking-[0.14em] text-zinc-500 uppercase">
          {screen.type === 'grid'
            ? t.kickerCriteria
            : current
              ? t.kickerItem(current.letter, criteriaCountLabel(current, language))
              : t.kickerAnswer}
        </p>
      )}
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 px-4 pt-4 pb-6">
        {screen.type === 'words' ? (
          // Essai de Jean-Guy (26/10) : le premier écran est la couverture du PDF — la photo du
          // bien A, « Votre sélection du [date] », sa phrase, le conseiller — et un seul bouton
          // principal, « Voir ma sélection → ».
          <div className="flex flex-col gap-5" data-testid="dossier-link-cover">
            {coverPhoto ? (
              <RemoteImage
                src={coverPhoto}
                alt=""
                className="aspect-[4/3] w-full rounded-2xl object-cover"
                fallbackClassName="aspect-[4/3] w-full rounded-2xl bg-zinc-100"
                fallbackLabel=""
              />
            ) : null}
            <div className="flex flex-col gap-2">
              <h1 className="font-title text-2xl font-bold text-zinc-900">
                {t.selectionOf(buyerDateIn(deck.selectedAt, language))}
              </h1>
              <p className="text-xs font-semibold tracking-[0.14em] text-zinc-500 uppercase">
                {t.wordsTitle}
              </p>
              <p className="font-title text-lg leading-snug font-semibold text-zinc-800">
                «&nbsp;{withFrenchSpacing(deck.words)}&nbsp;»
              </p>
              <p className="text-sm text-zinc-600">{t.propertiesForYou(itemCount)}</p>
            </div>
            {advisorName ? (
              <p className="text-sm font-semibold text-zinc-700" data-testid="dossier-advisor-line">
                {t.advisorLabel}
                <AdvisorContact name={advisorName} phone={advisorPhone} email={advisorEmail} />
              </p>
            ) : null}
            <button
              type="button"
              className={`${primaryBtn} w-full`}
              onClick={() => go(GRID)}
              data-testid="dossier-start"
            >
              {t.seeSelection}
            </button>
          </div>
        ) : screen.type === 'grid' ? (
          <GridScreen
            deck={deck}
            responses={asResponses}
            onOpen={(item) => go({ type: 'item', index: deck.items.indexOf(item) })}
            leadFilled={!sendBar}
            onLead={
              deck.leadLetter
                ? () =>
                    go({
                      type: 'item',
                      index: deck.items.findIndex((item) => item.letter === deck.leadLetter),
                    })
                : null
            }
            leadLetter={deck.leadLetter}
            language={language}
          />
        ) : current ? (
          <>
            <ItemScreen
              item={current}
              answer={answers.get(current.item.itemId)?.answer ?? null}
              readOnly={false}
              busy={false}
              onAnswer={(answer) => setAnswer(current.item.itemId, answer)}
              reasons={answers.get(current.item.itemId)?.reasons ?? []}
              onReason={(reason) => toggleReason(current.item.itemId, reason)}
              language={language}
            />
            <div className="mt-6">
              <AcademiaLinkList
                deck={deck}
                entries={academiaLinks.filter((entry) => entry.itemId === current.item.itemId)}
              />
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-6" data-testid="dossier-answer">
            {answers.size === 0 ? (
              <p className="text-base text-zinc-600">{t.notYetAnswered}</p>
            ) : null}
            {visits.length > 0 ? (
              <section className="flex flex-col gap-3">
                <h1 className="font-title text-xl font-bold text-zinc-900">
                  {t.visit(visits.length, lettersOf(visits, deck))}
                </h1>
                <p className="text-base text-zinc-700">{t.when}</p>
                <div className="flex flex-wrap gap-2">
                  {AVAILABILITY_SLOTS.map((slot) => {
                    const on = availability.includes(slot);
                    return (
                      <button
                        key={slot}
                        type="button"
                        className={chip(on)}
                        aria-pressed={on}
                        data-testid="dossier-availability"
                        onClick={() =>
                          setAvailability((list) =>
                            list.includes(slot)
                              ? list.filter((entry) => entry !== slot)
                              : [...list, slot],
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
              <p className="text-base text-zinc-700">
                {t.hesitate(maybes.length, lettersOf(maybes, deck))}
              </p>
            ) : null}
            {noes.map((entry) => {
              const reasons = answers.get(entry.item.itemId)?.reasons ?? [];
              return (
                <section key={entry.item.itemId} className="flex flex-col gap-3">
                  <p className="font-semibold text-zinc-900">{t.notForYou(entry.letter)}</p>
                  <div className="flex flex-wrap gap-2">
                    {NO_REASONS.map((reason) => {
                      const on = reasons.includes(reason);
                      return (
                        <button
                          key={reason}
                          type="button"
                          className={chip(on)}
                          aria-pressed={on}
                          data-testid="dossier-reason"
                          onClick={() => toggleReason(entry.item.itemId, reason)}
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
              <section className="flex flex-col gap-1 rounded-xl bg-zinc-50 px-4 py-3">
                <h2 className="text-xs font-semibold tracking-[0.14em] text-zinc-500 uppercase">
                  {t.nextTitle}
                </h2>
                <p className="text-base text-zinc-800">
                  {t.nextStep(visits.length, lettersOf(visits, deck))}
                </p>
                {advisorName ? (
                  <p className="text-sm font-semibold text-zinc-700">
                    <AdvisorContact name={advisorName} phone={advisorPhone} email={advisorEmail} />
                  </p>
                ) : null}
              </section>
            ) : null}
            {confirmSend ? (
              <div
                ref={confirmRef}
                tabIndex={-1}
                className="flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                data-testid="dossier-send-confirm"
                role="alertdialog"
                aria-labelledby="dossier-send-confirm-text"
              >
                <p id="dossier-send-confirm-text" className="font-semibold">
                  {confirmSend}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={navBtn} onClick={() => setConfirmSend(null)}>
                    {t.cancel}
                  </button>
                  <button
                    type="button"
                    className={primaryBtn}
                    disabled={pending}
                    onClick={send}
                    data-testid="dossier-send-anyway"
                  >
                    {t.sendAnyway}
                  </button>
                </div>
              </div>
            ) : null}
            <button
              type="button"
              className={primaryBtn}
              disabled={pending}
              onClick={askSend}
              data-testid="dossier-send"
            >
              {pending ? t.sending : t.send}
            </button>
            <DownloadButton label={t.download} />
          </div>
        )}
        {error ? (
          <p role="alert" className="text-sm font-medium text-red-600" data-testid="dossier-error">
            {error}
          </p>
        ) : null}
      </main>

      {/* Essai de Jean-Guy (25/10) : une barre fixée en bas recouvrait « Pas pour moi », et un
          toucher sur la barre juste après un défilement pouvait arriver sur ce bouton (Safari sur
          iPhone). La barre suit le contenu, sous les réponses, séparée d'elles : rien ne se
          superpose jamais. */}
      <nav
        hidden={screen.type === 'words'}
        className="mx-auto mt-2 flex w-full max-w-xl flex-col gap-2 border-t border-zinc-200 px-4 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]"
        data-testid="dossier-nav"
      >
        <div className="flex gap-2">
          <button
            type="button"
            className={quietNavBtn}
            disabled={previous == null}
            onClick={() => go(previous)}
            data-testid="dossier-previous"
          >
            {t.previous}
          </button>
          {lastItem ? (
            // Sur le dernier bien, à la place de « Suivant » grisé (essai de Jean-Guy, 26/10).
            <button
              type="button"
              className={`${primaryBtn} flex-1`}
              onClick={() => go(ANSWER)}
              data-testid="dossier-last-send"
            >
              {t.send}
            </button>
          ) : screen.type !== 'answer' ? (
            <button
              type="button"
              className={quietNavBtn}
              disabled={next == null}
              onClick={() => go(next)}
              data-testid="dossier-next"
            >
              {t.next}
            </button>
          ) : null}
        </div>
      </nav>
      {/* Mission 143 (I11) — le conseiller, à appeler ou à écrire, en bas de chaque écran. */}
      {advisorName && screen.type !== 'words' ? (
        <footer
          className="mx-auto w-full max-w-xl px-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] text-sm text-zinc-700"
          data-testid="dossier-advisor-footer"
        >
          <AdvisorContact name={advisorName} phone={advisorPhone} email={advisorEmail} />
        </footer>
      ) : null}

      {/* Essai de Jean-Guy (26/10) : dès qu'un bien a une réponse, « Envoyer ma réponse » est le
          bouton principal, fixé en bas de chaque bien et de la grille ; il mène à ses créneaux,
          puis à l'envoi avec sa confirmation. Le contenu garde sous lui la place de la barre :
          aucune réponse n'y reste cachée en fin de défilement. */}
      {sendBar ? (
        <div
          className="fixed inset-x-0 bottom-0 z-10 border-t border-zinc-200 bg-white px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]"
          data-testid="dossier-send-bar"
        >
          <button
            type="button"
            className={`${primaryBtn} mx-auto w-full max-w-xl`}
            onClick={() => go(ANSWER)}
            data-testid="dossier-to-answer"
          >
            {t.send}
          </button>
        </div>
      ) : null}
    </div>
  );
}
