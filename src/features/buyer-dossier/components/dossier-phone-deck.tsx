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
  AVAILABILITY_LABELS,
  AVAILABILITY_SLOTS,
  ITEM_ANSWER_LABELS,
  NO_REASON_LABELS,
  NO_REASONS,
  type AvailabilitySlot,
  type BuyerDeck,
  type DeckItem,
  type ItemAnswer,
  type ItemResponse,
  type NoReason,
} from '@/features/buyer-deck/types';
import { buyerDateLabel } from '@/features/buyers/services/buyer-criteria';
import { submitDossierAnswers } from '@/features/buyer-dossier/actions/submit-dossier-answers';
import { linkScreen, type LinkClosed } from '@/features/buyer-dossier/services/link-screen';
import {
  DOSSIER_DOWNLOAD,
  DOSSIER_NO_ANSWER,
  DOSSIER_SEEN_TOGETHER,
  DOSSIER_SEND,
  DOSSIER_THANKS,
} from '@/features/buyer-dossier/types';

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
const primaryBtn =
  'inline-flex min-h-12 flex-1 items-center justify-center whitespace-nowrap rounded-xl bg-brand px-4 py-3 font-title text-base font-semibold text-white shadow disabled:cursor-not-allowed disabled:opacity-50';
const chip = (on: boolean): string =>
  `inline-flex min-h-11 items-center rounded-full border px-4 py-2 text-sm font-semibold ${
    on ? 'border-brand bg-brand text-white' : 'border-zinc-300 bg-white text-zinc-700'
  }`;

const toLocal = (responses: ItemResponse[]): Map<string, LocalAnswer> =>
  new Map(
    responses.map((response) => [
      response.itemId,
      { answer: response.answer, reasons: response.reasons },
    ]),
  );

function DownloadButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="self-center py-3 text-sm font-medium text-zinc-500 underline underline-offset-4"
      data-testid="dossier-download"
    >
      {DOSSIER_DOWNLOAD}
    </button>
  );
}

const lettersOf = (items: DeckItem[]): string =>
  items.length <= 1
    ? (items[0]?.letter ?? '')
    : `${items
        .slice(0, -1)
        .map((item) => item.letter)
        .join(', ')} et ${items.at(-1)!.letter}`;

function Recap({
  deck,
  answers,
  availability,
}: {
  deck: BuyerDeck;
  answers: Map<string, LocalAnswer>;
  availability: AvailabilitySlot[];
}) {
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
              Bien {entry.letter} · {entry.item.label}
            </span>
            <span className="text-sm text-zinc-700">
              {ITEM_ANSWER_LABELS[given.answer]}
              {given.reasons.length > 0
                ? ` : ${given.reasons.map((reason) => NO_REASON_LABELS[reason]).join(', ')}`
                : ''}
            </span>
          </li>
        );
      })}
      {availability.length > 0 ? (
        <li className="text-sm text-zinc-700" data-testid="dossier-recap-availability">
          Vos créneaux : {availability.map((slot) => AVAILABILITY_LABELS[slot]).join(', ')}
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

function AdvisorLine({
  advisorName,
  advisorPhone,
}: Pick<FrameProps, 'advisorName' | 'advisorPhone'>) {
  return advisorName ? (
    <p className="text-sm font-semibold text-zinc-700" data-testid="dossier-advisor-line">
      {[advisorName, advisorPhone].filter(Boolean).join(' · ')}
    </p>
  ) : null;
}

// La présentation terminée : « Ce que nous avons vu ensemble », ses réponses du rendez-vous et ses
// créneaux du rendez-vous (rangés dans le déroulé figé), le conseiller, en lecture seule.
export function SeenTogetherView({
  deck,
  answers,
  availability,
  note,
  ...frame
}: FrameProps & {
  deck: BuyerDeck;
  answers: ItemResponse[];
  availability: AvailabilitySlot[];
  note: string | null;
}) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-white" data-testid="dossier-seen-together">
      <LinkHeader agencyName={frame.agencyName} logoUrl={frame.logoUrl} />
      <main className="mx-auto flex w-full max-w-xl flex-col gap-5 px-4 py-6">
        <h1 className="font-title text-2xl font-bold text-brand-deep">{DOSSIER_SEEN_TOGETHER}</h1>
        {note ? <p className="text-base text-zinc-700">{note}</p> : null}
        {answers.length > 0 ? (
          <>
            <p className="text-base text-zinc-700">Ce que vous m’avez répondu :</p>
            <Recap deck={deck} answers={toLocal(answers)} availability={availability} />
          </>
        ) : (
          <p className="text-base text-zinc-700">
            {deck.items.length > 1 ? 'Les biens' : 'Le bien'} {lettersOf(deck.items)}, que nous
            avons regardés ensemble.
          </p>
        )}
        <AdvisorLine advisorName={frame.advisorName} advisorPhone={frame.advisorPhone} />
        <DownloadButton />
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
  ...frame
}: FrameProps & {
  deck: BuyerDeck;
  answers: Map<string, LocalAnswer>;
  availability: AvailabilitySlot[];
  note: string | null;
}) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-white" data-testid="dossier-thanks">
      <LinkHeader agencyName={frame.agencyName} logoUrl={frame.logoUrl} />
      <main className="mx-auto flex w-full max-w-xl flex-col gap-5 px-4 py-6">
        <h1 className="font-title text-2xl font-bold text-brand-deep">{DOSSIER_THANKS}</h1>
        {note ? <p className="text-base text-zinc-700">{note}</p> : null}
        {answers.size > 0 ? (
          <>
            <p className="text-base text-zinc-700">Voici ce que vous m’avez répondu :</p>
            <Recap deck={deck} answers={answers} availability={availability} />
          </>
        ) : null}
        <AdvisorLine advisorName={frame.advisorName} advisorPhone={frame.advisorPhone} />
        <DownloadButton />
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
}) {
  const router = useRouter();
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
      setError(DOSSIER_NO_ANSWER);
      return;
    }
    setError(null);
    const question = sendConfirmation(
      unansweredLetters(
        deck.items.map((entry) => ({ letter: entry.letter, itemId: entry.item.itemId })),
        asResponses,
      ),
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
      ).catch(() => ({ ok: false as const, error: 'Connexion perdue — réessayez.' }));
      if (!result.ok) {
        if ('closed' in result && result.closed) {
          setClosed({ kind: result.closed, message: result.error });
          router.refresh();
          window.scrollTo({ top: 0 });
          return;
        }
        setError(result.error);
        return;
      }
      setSent(true);
      window.scrollTo({ top: 0 });
    });
  };

  const frame = { agencyName, logoUrl, advisorName, advisorPhone };
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
            ? 'Vos critères'
            : current
              ? `Bien ${current.letter} · ${criteriaCountLabel(current)}`
              : 'Votre réponse'}
        </p>
      )}
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 px-4 pt-4 pb-6">
        {screen.type === 'words' ? (
          // Essai de Jean-Guy (26/10) : le premier écran est la couverture du PDF — la photo du
          // bien A, « Votre sélection du [date] », sa phrase, le conseiller — et un seul bouton
          // principal, « Voir ma sélection → ».
          <div className="flex flex-col gap-5" data-testid="dossier-cover">
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
                Votre sélection du {buyerDateLabel(deck.selectedAt)}
              </h1>
              <p className="text-xs font-semibold tracking-[0.14em] text-zinc-500 uppercase">
                Vous m’avez dit :
              </p>
              <p className="font-title text-lg leading-snug font-semibold text-zinc-800">
                « {deck.words} »
              </p>
              <p className="text-sm text-zinc-600">
                {itemCount} bien{itemCount > 1 ? 's' : ''} pour vous
              </p>
            </div>
            {advisorName ? (
              <p className="text-sm font-semibold text-zinc-700" data-testid="dossier-advisor-line">
                Votre conseiller : {[advisorName, advisorPhone].filter(Boolean).join(' · ')}
              </p>
            ) : null}
            <button
              type="button"
              className={`${primaryBtn} w-full`}
              onClick={() => go(GRID)}
              data-testid="dossier-start"
            >
              Voir ma sélection →
            </button>
          </div>
        ) : screen.type === 'grid' ? (
          <GridScreen
            deck={deck}
            responses={asResponses}
            onOpen={(item) => go({ type: 'item', index: deck.items.indexOf(item) })}
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
          />
        ) : current ? (
          <ItemScreen
            item={current}
            answer={answers.get(current.item.itemId)?.answer ?? null}
            readOnly={false}
            busy={false}
            onAnswer={(answer) => setAnswer(current.item.itemId, answer)}
            reasons={answers.get(current.item.itemId)?.reasons ?? []}
            onReason={(reason) => toggleReason(current.item.itemId, reason)}
          />
        ) : (
          <div className="flex flex-col gap-6" data-testid="dossier-answer">
            {answers.size === 0 ? (
              <p className="text-base text-zinc-600">
                Vous n’avez pas encore répondu : ouvrez un bien depuis la grille.
              </p>
            ) : null}
            {visits.length > 0 ? (
              <section className="flex flex-col gap-3">
                <h1 className="font-title text-xl font-bold text-zinc-900">
                  Vous voulez visiter {visits.length > 1 ? 'les biens' : 'le bien'}{' '}
                  {lettersOf(visits)}.
                </h1>
                <p className="text-base text-zinc-700">Quand pouvez-vous visiter ?</p>
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
                        {AVAILABILITY_LABELS[slot]}
                      </button>
                    );
                  })}
                </div>
              </section>
            ) : null}
            {maybes.length > 0 ? (
              <p className="text-base text-zinc-700">
                Vous hésitez pour {maybes.length > 1 ? 'les biens' : 'le bien'} {lettersOf(maybes)}.
              </p>
            ) : null}
            {noes.map((entry) => {
              const reasons = answers.get(entry.item.itemId)?.reasons ?? [];
              return (
                <section key={entry.item.itemId} className="flex flex-col gap-3">
                  <p className="font-semibold text-zinc-900">
                    Le bien {entry.letter} : pas pour vous. Pourquoi ?
                  </p>
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
                          {NO_REASON_LABELS[reason]}
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
                  Ce que je fais ensuite
                </h2>
                <p className="text-base text-zinc-800">
                  Je contacte {visits.length > 1 ? 'les propriétaires' : 'le propriétaire'} de{' '}
                  {lettersOf(visits)} et je vous confirme les visites sous 24 h.
                </p>
                {advisorName ? (
                  <p className="text-sm font-semibold text-zinc-700">
                    {[advisorName, advisorPhone].filter(Boolean).join(' · ')}
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
                    Annuler
                  </button>
                  <button
                    type="button"
                    className={primaryBtn}
                    disabled={pending}
                    onClick={send}
                    data-testid="dossier-send-anyway"
                  >
                    Envoyer quand même
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
              {pending ? 'Envoi…' : DOSSIER_SEND}
            </button>
            <DownloadButton />
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
            Précédent
          </button>
          {lastItem ? (
            // Sur le dernier bien, à la place de « Suivant » grisé (essai de Jean-Guy, 26/10).
            <button
              type="button"
              className={`${primaryBtn} flex-1`}
              onClick={() => go(ANSWER)}
              data-testid="dossier-last-send"
            >
              {DOSSIER_SEND}
            </button>
          ) : screen.type !== 'answer' ? (
            <button
              type="button"
              className={quietNavBtn}
              disabled={next == null}
              onClick={() => go(next)}
              data-testid="dossier-next"
            >
              Suivant
            </button>
          ) : null}
        </div>
      </nav>

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
            {DOSSIER_SEND}
          </button>
        </div>
      ) : null}
    </div>
  );
}
