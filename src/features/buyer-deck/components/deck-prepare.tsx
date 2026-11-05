'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import {
  alertError,
  btnDangerGhost,
  btnGhost,
  btnSecondary,
  card,
  fieldLabel,
  hintText,
  inputBase,
  okText,
} from '@/components/ui/styles';
import {
  removeSelectionItem,
  saveBuyerWords,
  saveItemPitch,
} from '@/features/buyer-deck/actions/deck-actions';
import { criteriaCountLabel } from '@/features/buyer-deck/services/buyer-deck';
import { PITCH_MAX, WORDS_MAX, type BuyerDeck, type DeckItem } from '@/features/buyer-deck/types';

type Result = { ok: true } | { ok: false; error: string };
const LOST = { ok: false as const, error: 'Connexion perdue — réessayez.' };

// Mission 122 — « Avant de présenter », réservé au conseiller : il relit et modifie « Vous m'avez
// dit » et la phrase « Pourquoi je vous le propose » de chaque bien (140 caractères au plus) ; un
// bien qui ne satisfait plus un indispensable est signalé, avec « Retirer de la sélection »
// (décision du 25/10). Une fois la sélection présentée, tout est figé (M111).
export function DeckPrepare({ deck }: { deck: BuyerDeck }) {
  return (
    <section className={`${card} flex flex-col gap-5 p-5`} data-testid="deck-prepare">
      <h2 className="font-title text-lg font-semibold text-brand-deep stage:text-white">
        Avant de présenter
      </h2>
      <DeckPrepareBody deck={deck} />
    </section>
  );
}

function DeckPrepareBody({ deck }: { deck: BuyerDeck }) {
  return (
    <div className="flex flex-col gap-5" data-testid="deck-prepare-body">
      <div className="flex flex-col gap-1">
        <p className={hintText}>
          Relisez ses mots et la phrase de chaque bien : c’est ce que l’acquéreur verra. Les phrases
          proposées ne disent que ce que la grille dit.
        </p>
      </div>
      <TextEditor
        label="Vous m’avez dit :"
        testId="deck-words-editor"
        value={deck.words}
        proposed={deck.wordsProposed}
        max={WORDS_MAX}
        multiline
        save={(text) => saveBuyerWords(deck.selectionId, text)}
      />
      <ol className="flex flex-col gap-4">
        {deck.items.map((item) => (
          <PrepareItem key={item.item.itemId} item={item} />
        ))}
      </ol>
    </div>
  );
}

function PrepareItem({ item }: { item: DeckItem }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const remove = () =>
    startTransition(async () => {
      const result: Result = await removeSelectionItem(item.item.itemId).catch(() => LOST);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  return (
    <li
      className="flex flex-col gap-3 rounded-xl border border-zinc-200 px-4 py-3 stage:border-white/10"
      data-testid="deck-prepare-item"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-title text-base font-bold text-zinc-900 stage:text-white">
          Bien {item.letter} · {item.item.label}
        </span>
        <span className="text-sm text-zinc-500 stage:text-white/60">
          {criteriaCountLabel(item)}
        </span>
      </div>
      {item.blocked ? (
        <div className={`${alertError} flex flex-col gap-2`} data-testid="deck-blocked">
          <p>
            Ce bien ne satisfait plus un critère indispensable : {item.blockedBy.join(' · ')}. Il ne
            sera pas recommandé en tête.
          </p>
          {confirming ? (
            <div className="flex flex-wrap items-center gap-2">
              <span>Retirer le bien {item.letter} de la sélection ?</span>
              <button type="button" className={btnGhost} onClick={() => setConfirming(false)}>
                Annuler
              </button>
              <button
                type="button"
                className={btnDangerGhost}
                disabled={pending}
                onClick={remove}
                data-testid="deck-remove-confirm"
              >
                Retirer
              </button>
            </div>
          ) : (
            <button
              type="button"
              className={`${btnDangerGhost} self-start`}
              onClick={() => setConfirming(true)}
              data-testid="deck-remove"
            >
              Retirer de la sélection
            </button>
          )}
          {error ? <p>{error}</p> : null}
        </div>
      ) : null}
      <TextEditor
        label="Pourquoi je vous le propose"
        testId="deck-pitch-editor"
        value={item.pitch ?? ''}
        proposed={item.pitchProposed ?? ''}
        max={PITCH_MAX}
        save={(text) => saveItemPitch(item.item.itemId, text)}
      />
    </li>
  );
}

function TextEditor({
  label,
  testId,
  value,
  proposed,
  max,
  multiline = false,
  save,
}: {
  label: string;
  testId: string;
  value: string;
  proposed: string;
  max: number;
  multiline?: boolean;
  save: (text: string | null) => Promise<Result>;
}) {
  const router = useRouter();
  const [text, setText] = useState(value);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const run = (next: string | null) =>
    startTransition(async () => {
      setMessage(null);
      const result = await save(next).catch(() => LOST);
      if (!result.ok) {
        setMessage({ ok: false, text: result.error });
        return;
      }
      if (next == null) setText(proposed);
      setMessage({ ok: true, text: 'Enregistré.' });
      router.refresh();
    });
  const Field = multiline ? 'textarea' : 'input';
  return (
    <div className="flex flex-col gap-1.5" data-testid={testId}>
      <label className="flex flex-col gap-1.5">
        <span className={fieldLabel}>{label}</span>
        <Field
          className={`${inputBase} ${multiline ? 'min-h-20' : ''}`}
          value={text}
          maxLength={max}
          onChange={(event) => setText(event.target.value)}
        />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-zinc-400 stage:text-white/40">
          {text.length} / {max}
        </span>
        <button
          type="button"
          className={btnSecondary}
          disabled={pending || text.trim() === '' || text.trim() === value.trim()}
          onClick={() => run(text)}
        >
          Enregistrer
        </button>
        {value.trim() !== proposed.trim() ? (
          <button type="button" className={btnGhost} disabled={pending} onClick={() => run(null)}>
            Reprendre la phrase proposée
          </button>
        ) : null}
        {message ? (
          <span className={message.ok ? okText : 'text-sm font-medium text-red-600'}>
            {message.text}
          </span>
        ) : null}
      </div>
    </div>
  );
}
