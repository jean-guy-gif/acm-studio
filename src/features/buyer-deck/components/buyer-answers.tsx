'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { btnGhost, btnSecondary, card, hintText } from '@/components/ui/styles';
import { applySuggestion, ignoreSuggestion } from '@/features/buyer-deck/actions/deck-actions';
import type { AnswerSuggestion } from '@/features/buyer-deck/services/answer-suggestions';
import {
  ANSWERED_DURING_LABELS,
  ITEM_ANSWER_REPORT,
  NO_REASON_LABELS,
  type ItemResponse,
} from '@/features/buyer-deck/types';
import {
  answersBySelection,
  type AnswerGroup,
} from '@/features/buyer-deck/services/answers-by-selection';
import { buyerDateLabel } from '@/features/buyers/services/buyer-criteria';

export type BuyerAnswerView = ItemResponse & {
  label: string;
  selectionId: string;
  selectionAt: string;
};

// Mission 122 — « Ce qu'il a répondu », sur la fiche : chaque réponse, datée, avec ses raisons et
// le moment où il l'a donnée ; et quand une même raison revient sur deux biens, une suggestion que
// le conseiller accepte ou ignore. Rien ne se modifie seul (décision de Jean-Guy, 25/10).
export function BuyerAnswers({
  buyerId,
  answers,
  suggestions,
}: {
  buyerId: string;
  answers: BuyerAnswerView[];
  suggestions: AnswerSuggestion[];
}) {
  return (
    <section className={`${card} flex flex-col gap-4 p-5`} data-testid="buyer-answers">
      <h2 className="font-title text-lg font-semibold text-brand-deep stage:text-white">
        Ce qu’il a répondu
      </h2>
      {suggestions.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {suggestions.map((suggestion) => (
            <SuggestionRow key={suggestion.kind} buyerId={buyerId} suggestion={suggestion} />
          ))}
        </ul>
      ) : null}
      {/* Essai de Jean-Guy (26/10) : groupé par sélection, la plus récente en premier ; les
          anciennes repliées sous « Sélections précédentes ». */}
      {(() => {
        const [latest, ...older] = answersBySelection(answers);
        return (
          <>
            {latest ? <AnswerGroupView group={latest} /> : null}
            {older.length > 0 ? (
              <details className="flex flex-col gap-3" data-testid="buyer-answers-older">
                <summary className="cursor-pointer text-sm font-semibold text-brand-deep stage:text-brand">
                  Sélections précédentes ({older.length})
                </summary>
                <div className="mt-3 flex flex-col gap-4">
                  {older.map((group) => (
                    <AnswerGroupView key={group.selectionId} group={group} />
                  ))}
                </div>
              </details>
            ) : null}
          </>
        );
      })()}
    </section>
  );
}

function SuggestionRow({ buyerId, suggestion }: { buyerId: string; suggestion: AnswerSuggestion }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const run = (action: typeof applySuggestion) =>
    startTransition(async () => {
      setError(null);
      const result = await action(buyerId, suggestion.kind).catch(() => ({
        ok: false as const,
        error: 'Connexion perdue — réessayez.',
      }));
      if (!result.ok) {
        setError(result.error);
        return;
      }
      // Mission 135 — appliquée, la fiche dit ce que le rapprochement donne désormais.
      if (action === applySuggestion) router.push(`/acquereurs/${buyerId}?ajuste=1`);
      else router.refresh();
    });
  return (
    <li
      className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 stage:border-amber-400/30 stage:bg-amber-500/10 stage:text-amber-100"
      data-testid="answer-suggestion"
      data-kind={suggestion.kind}
    >
      <p className="text-sm font-medium">{suggestion.text}</p>
      <div className="flex flex-wrap items-center gap-2">
        {suggestion.patch ? (
          <button
            type="button"
            className={btnSecondary}
            disabled={pending}
            onClick={() => run(applySuggestion)}
            data-testid="suggestion-apply"
          >
            Accepter
          </button>
        ) : null}
        <button
          type="button"
          className={btnGhost}
          disabled={pending}
          onClick={() => run(ignoreSuggestion)}
          data-testid="suggestion-ignore"
        >
          Ignorer
        </button>
        {error ? <span className="text-sm font-medium text-red-600">{error}</span> : null}
      </div>
    </li>
  );
}

function AnswerGroupView({ group }: { group: AnswerGroup<BuyerAnswerView> }) {
  return (
    <div className="flex flex-col gap-2" data-testid="buyer-answer-group">
      {group.selectionAt ? (
        <h3 className="text-xs font-semibold tracking-[0.12em] text-zinc-500 uppercase stage:text-white/60">
          Sélection du {buyerDateLabel(group.selectionAt)}
        </h3>
      ) : null}
      <ul className="flex flex-col gap-2">
        {group.answers.map((answer) => (
          <li
            key={answer.id}
            data-testid="buyer-answer"
            data-answer={answer.answer}
            className="flex flex-col gap-0.5 rounded-xl border border-zinc-200 px-4 py-2.5 stage:border-white/10"
          >
            <span className="font-medium text-zinc-900 stage:text-white">{answer.label}</span>
            <span className="text-sm text-zinc-700 stage:text-white/80">
              {ITEM_ANSWER_REPORT[answer.answer]}
              {answer.reasons.length > 0
                ? ` : ${answer.reasons.map((reason) => NO_REASON_LABELS[reason]).join(', ')}`
                : ''}
            </span>
            <span className={hintText}>
              {ANSWERED_DURING_LABELS[answer.answeredDuring]}, le{' '}
              {buyerDateLabel(answer.answeredAt)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
