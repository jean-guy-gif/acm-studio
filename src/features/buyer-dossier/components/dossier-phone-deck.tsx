'use client';

import { useState, useTransition } from 'react';

import { GridScreen, ItemScreen } from '@/features/buyer-deck/components/deck-presentation';
import { criteriaCountLabel } from '@/features/buyer-deck/services/buyer-deck';
import {
  ANSWER,
  WORDS,
  nextScreen,
  previousScreen,
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
import { submitDossierAnswers } from '@/features/buyer-dossier/actions/submit-dossier-answers';
import { DOSSIER_NO_ANSWER, DOSSIER_SEND, DOSSIER_THANKS } from '@/features/buyer-dossier/types';

// Mission 122 (partie B) — le lien du dossier, pensé pour le téléphone : le même déroulé que la
// présentation (M122 A), un écran à la fois, défilement vertical, boutons au pouce. Ses réponses
// restent sur l'appareil jusqu'à « Envoyer ma réponse » ; une seconde ouverture montre « Merci, j'ai
// bien reçu votre réponse » et ce qu'il a répondu, sans pouvoir répondre deux fois.

type LocalAnswer = { answer: ItemAnswer; reasons: NoReason[] };

const navBtn =
  'inline-flex min-h-12 flex-1 items-center justify-center whitespace-nowrap rounded-xl border border-zinc-300 bg-white px-3 py-3 font-title text-base font-semibold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-40';
const primaryBtn =
  'inline-flex min-h-12 flex-1 items-center justify-center whitespace-nowrap rounded-xl bg-brand px-4 py-3 font-title text-base font-semibold text-white shadow disabled:cursor-not-allowed disabled:opacity-50';
const chip = (on: boolean): string =>
  `inline-flex min-h-11 items-center rounded-full border px-4 py-2 text-sm font-semibold ${
    on ? 'border-brand bg-brand text-white' : 'border-zinc-300 bg-white text-zinc-700'
  }`;

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

export function DossierPhoneDeck({
  token,
  deck,
  initialAnswers,
  initialAvailability,
  agencyName,
  logoUrl,
  advisorName,
  advisorPhone,
}: {
  token: string;
  deck: BuyerDeck;
  initialAnswers: ItemResponse[];
  initialAvailability: AvailabilitySlot[];
  agencyName: string;
  logoUrl: string | null;
  advisorName: string | null;
  advisorPhone: string | null;
}) {
  const [screen, setScreen] = useState<DeckScreen>(WORDS);
  const [answers, setAnswers] = useState<Map<string, LocalAnswer>>(
    () =>
      new Map(
        initialAnswers.map((response) => [
          response.itemId,
          { answer: response.answer, reasons: response.reasons },
        ]),
      ),
  );
  const [availability, setAvailability] = useState<AvailabilitySlot[]>(initialAvailability);
  const [sent, setSent] = useState(initialAnswers.length > 0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const itemCount = deck.items.length;
  const current = screen.type === 'item' ? deck.items[screen.index] : undefined;
  const next = nextScreen(screen, itemCount);
  const previous = previousScreen(screen);

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

  const send = () => {
    if (answers.size === 0) {
      setError(DOSSIER_NO_ANSWER);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await submitDossierAnswers(
        token,
        [...answers.entries()].map(([itemId, given]) => ({ itemId, ...given })),
        visits.length > 0 ? availability : [],
      ).catch(() => ({ ok: false as const, error: 'Connexion perdue — réessayez.' }));
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSent(true);
      window.scrollTo({ top: 0 });
    });
  };

  const header = (
    <header className="flex items-center justify-between gap-3 px-4 pt-4">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt={agencyName} className="max-h-9 max-w-36 object-contain" />
      ) : (
        <span className="font-title text-base font-semibold text-brand-deep">{agencyName}</span>
      )}
    </header>
  );

  if (sent) {
    return (
      <div className="flex min-h-[100dvh] flex-col bg-white" data-testid="dossier-thanks">
        {header}
        <main className="mx-auto flex w-full max-w-xl flex-col gap-5 px-4 py-6">
          <h1 className="font-title text-2xl font-bold text-brand-deep">{DOSSIER_THANKS}</h1>
          <p className="text-base text-zinc-700">Voici ce que vous m’avez répondu :</p>
          <Recap
            deck={deck}
            answers={answers}
            availability={visits.length > 0 ? availability : []}
          />
          {advisorName ? (
            <p className="text-sm font-semibold text-zinc-700">
              {[advisorName, advisorPhone].filter(Boolean).join(' · ')}
            </p>
          ) : null}
        </main>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-[100dvh] flex-col bg-white"
      data-testid="dossier-phone-deck"
      data-screen={screen.type}
    >
      {header}
      <p className="px-4 pt-3 text-xs font-semibold tracking-[0.14em] text-zinc-500 uppercase">
        {screen.type === 'words'
          ? `Votre sélection · ${itemCount} bien${itemCount > 1 ? 's' : ''}`
          : screen.type === 'grid'
            ? 'Vos critères'
            : current
              ? `Bien ${current.letter} · ${criteriaCountLabel(current)}`
              : 'Votre réponse'}
      </p>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 px-4 pt-4 pb-40">
        {screen.type === 'words' ? (
          <div className="flex flex-col gap-4">
            <h1 className="font-title text-2xl font-bold text-zinc-900">Vous m’avez dit :</h1>
            <p className="font-title text-xl leading-snug font-semibold text-zinc-900">
              « {deck.words} »
            </p>
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
            <button
              type="button"
              className={primaryBtn}
              disabled={pending}
              onClick={send}
              data-testid="dossier-send"
            >
              {pending ? 'Envoi…' : DOSSIER_SEND}
            </button>
          </div>
        )}
        {error ? (
          <p role="alert" className="text-sm font-medium text-red-600" data-testid="dossier-error">
            {error}
          </p>
        ) : null}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-10 flex flex-col gap-2 border-t border-zinc-200 bg-white/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] backdrop-blur"
        data-testid="dossier-nav"
      >
        {screen.type === 'grid' || screen.type === 'item' ? (
          <button
            type="button"
            className={navBtn}
            onClick={() => go(ANSWER)}
            data-testid="dossier-go-answer"
          >
            Ma réponse
          </button>
        ) : null}
        <div className="flex gap-2">
          <button
            type="button"
            className={navBtn}
            disabled={previous == null}
            onClick={() => go(previous)}
            data-testid="dossier-previous"
          >
            Précédent
          </button>
          {screen.type !== 'answer' ? (
            <button
              type="button"
              className={primaryBtn}
              disabled={next == null}
              onClick={() => go(next)}
              data-testid="dossier-next"
            >
              Suivant
            </button>
          ) : null}
        </div>
      </nav>
    </div>
  );
}
