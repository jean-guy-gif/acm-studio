'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  btnDanger,
  btnSecondary,
  errorText,
  fieldLabel,
  hintText,
  inputBase,
} from '@/components/ui/styles';
import {
  markBuyerContacted,
  setBuyerFinancing,
  setBuyerFinancingMode,
} from '@/features/buyers/actions/buyers';
import { buyerDateLabel } from '@/features/buyers/services/buyer-criteria';
import {
  BUYER_FINANCINGS,
  BUYER_FINANCING_HINT,
  BUYER_FINANCING_LABELS,
  BUYER_FINANCING_MODES,
  BUYER_FINANCING_MODE_LABELS,
  type BuyerFinancing,
  type BuyerFinancingMode,
} from '@/features/buyers/types';
import { GroupedDigitsInput, priceDigits } from '@/features/live-seller/components/price-input';
import { suggestsValidated } from '@/features/buyers/services/loan-agreement';

// Le choix d'une pastille : plein quand il est choisi, en contour sinon (aussi en tête de l'offre
// d'achat, lot B).
export const financingPill = (chosen: boolean) =>
  `min-h-10 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
    chosen
      ? 'border-emerald-600 bg-emerald-600 text-white'
      : 'border-zinc-300 bg-white text-zinc-700 hover:border-emerald-600 stage:border-white/20 stage:bg-white/5 stage:text-white/85'
  }`;

// Lot B — le prêt : l'apport, le montant du prêt et l'accord de principe, tous facultatifs.
export type BuyerLoan = {
  contribution: number | null;
  amount: number | null;
  agreement: boolean | null;
};
const NO_LOAN: BuyerLoan = { contribution: null, amount: null, agreement: null };
const AGREEMENT: Array<[boolean, string]> = [
  [true, 'Oui'],
  [false, 'Non'],
];
const digitsOf = (value: number | null) => (value == null ? '' : priceDigits(String(value)));
const euros = (digits: string) => (digits === '' ? null : Number(digits));

// Mission 132 — « Prêt à visiter » se nourrit de deux gestes du conseiller, sur la fiche : son
// financement (validé, en cours, inconnu), et « J'ai eu l'acquéreur aujourd'hui », qui date le
// dernier contact à l'heure du serveur. Chacun s'enregistre seul, sans toucher à sa recherche.
// Lot B (Jean-Guy, 27/11) — sous l'état du financement, « Comment finance-t-il ? » : comptant,
// avec prêt, ou pas encore dit, un toucher l'enregistre ; avec un prêt, l'apport, le montant du
// prêt et l'accord de principe, tous facultatifs, « Enregistrer le prêt » ; quitter « Avec prêt »
// efface ce qui est noté, l'écran le demande d'abord. Lu dans les notes, le mode est « À vérifier »
// jusqu'au toucher du conseiller (réponse 10). « Prêt à visiter » ne le lit pas (réponse 8).
export function BuyerReadinessActions({
  buyerId,
  financing,
  financingChangedAt,
  contactedToday,
  financingMode,
  loan,
  modeToVerify,
}: {
  buyerId: string;
  financing: BuyerFinancing;
  financingChangedAt: string | null;
  contactedToday: boolean;
  financingMode: BuyerFinancingMode;
  loan: BuyerLoan;
  modeToVerify: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState({ financing, changedAt: financingChangedAt });
  const [contacted, setContacted] = useState(contactedToday);
  const [mode, setMode] = useState({ mode: financingMode, loan, toVerify: modeToVerify });
  const [draft, setDraft] = useState({
    contribution: digitsOf(loan.contribution),
    amount: digitsOf(loan.amount),
    agreement: loan.agreement,
  });
  const [leaving, setLeaving] = useState<BuyerFinancingMode | null>(null);

  const choose = (next: BuyerFinancing) => {
    if (next === current.financing) return;
    setError(null);
    startTransition(async () => {
      const result = await setBuyerFinancing(buyerId, next).catch(() => ({
        ok: false as const,
        error: 'Le financement n’a pas pu être enregistré\u00a0: réessayez.',
      }));
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCurrent({ financing: result.buyer.financing, changedAt: result.buyer.financingChangedAt });
      router.refresh();
    });
  };

  const saveMode = (next: BuyerFinancingMode, details: BuyerLoan) => {
    setError(null);
    startTransition(async () => {
      const result = await setBuyerFinancingMode(buyerId, { mode: next, ...details }).catch(() => ({
        ok: false as const,
        error: 'Le mode de financement n’a pas pu être enregistré\u00a0: réessayez.',
      }));
      setLeaving(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const saved = {
        contribution: result.buyer.loanContribution,
        amount: result.buyer.loanAmount,
        agreement: result.buyer.loanAgreement,
      };
      setMode({ mode: result.buyer.financingMode, loan: saved, toVerify: false });
      setDraft({
        contribution: digitsOf(saved.contribution),
        amount: digitsOf(saved.amount),
        agreement: saved.agreement,
      });
      router.refresh();
    });
  };

  const noted =
    mode.loan.contribution != null || mode.loan.amount != null || mode.loan.agreement != null;
  const chooseMode = (next: BuyerFinancingMode) => {
    // Le même choix ne réécrit rien, sauf pour confirmer un mode lu dans les notes.
    if (next === mode.mode && !mode.toVerify) return;
    if (mode.mode === 'loan' && next !== 'loan' && noted) {
      setLeaving(next);
      return;
    }
    saveMode(next, next === 'loan' && mode.mode === 'loan' ? mode.loan : NO_LOAN);
  };
  const typed: BuyerLoan = {
    contribution: euros(draft.contribution),
    amount: euros(draft.amount),
    agreement: draft.agreement,
  };
  const loanChanged =
    typed.contribution !== mode.loan.contribution ||
    typed.amount !== mode.loan.amount ||
    typed.agreement !== mode.loan.agreement;

  const contact = () => {
    setError(null);
    startTransition(async () => {
      const result = await markBuyerContacted(buyerId).catch(() => ({
        ok: false as const,
        error: 'Le contact n’a pas pu être noté\u00a0: réessayez.',
      }));
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setContacted(true);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-3" data-testid="buyer-readiness-actions">
      <div className="flex flex-col gap-1.5">
        <span className={fieldLabel}>Financement</span>
        <div className="flex flex-wrap gap-2" data-testid="buyer-financing">
          {BUYER_FINANCINGS.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={current.financing === value}
              disabled={pending}
              onClick={() => choose(value)}
              className={financingPill(current.financing === value)}
            >
              {BUYER_FINANCING_LABELS[value]}
            </button>
          ))}
        </div>
        <span className={hintText}>
          {BUYER_FINANCING_HINT}
          {current.changedAt ? ` Posé le ${buyerDateLabel(current.changedAt)}.` : ''}
        </span>
      </div>
      <div className="flex flex-col gap-1.5" data-testid="buyer-financing-mode">
        <div className="flex flex-wrap items-center gap-2">
          <span className={fieldLabel}>Comment finance-t-il&#x202f;?</span>
          {mode.toVerify ? (
            <span
              className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800"
              data-testid="buyer-financing-mode-to-verify"
            >
              À vérifier · lu dans vos notes
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {BUYER_FINANCING_MODES.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode.mode === value}
              disabled={pending}
              onClick={() => chooseMode(value)}
              className={financingPill(mode.mode === value)}
            >
              {BUYER_FINANCING_MODE_LABELS[value]}
            </button>
          ))}
        </div>
        {mode.toVerify ? (
          <span className={hintText}>
            Un toucher sur le bon choix le confirme&nbsp;: l’offre d’achat le demande.
          </span>
        ) : null}
        {mode.mode === 'loan' ? (
          <div
            className="mt-1 flex flex-col gap-3 rounded-xl border border-zinc-200 p-3 stage:border-white/10"
            data-testid="buyer-loan"
          >
            <div className="flex flex-wrap gap-4">
              <label className="flex flex-col gap-1.5">
                <span className={fieldLabel}>Apport</span>
                <span className="flex items-center gap-1.5 text-sm text-zinc-700 stage:text-white/80">
                  <GroupedDigitsInput
                    language="fr"
                    digits={draft.contribution}
                    onDigits={(digits) => setDraft((last) => ({ ...last, contribution: digits }))}
                    className={`${inputBase} w-32 min-w-0 text-right tabular-nums`}
                    placeholder="0"
                    data-testid="buyer-loan-contribution"
                  />
                  €
                </span>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={fieldLabel}>Montant du prêt</span>
                <span className="flex items-center gap-1.5 text-sm text-zinc-700 stage:text-white/80">
                  <GroupedDigitsInput
                    language="fr"
                    digits={draft.amount}
                    onDigits={(digits) => setDraft((last) => ({ ...last, amount: digits }))}
                    className={`${inputBase} w-32 min-w-0 text-right tabular-nums`}
                    placeholder="0"
                    data-testid="buyer-loan-amount"
                  />
                  €
                </span>
              </label>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className={fieldLabel}>Accord de principe de sa banque</span>
              <div className="flex flex-wrap gap-2" data-testid="buyer-loan-agreement">
                {AGREEMENT.map(([value, text]) => (
                  <button
                    key={text}
                    type="button"
                    aria-pressed={draft.agreement === value}
                    disabled={pending}
                    onClick={() =>
                      setDraft((last) => ({
                        ...last,
                        agreement: last.agreement === value ? null : value,
                      }))
                    }
                    className={financingPill(draft.agreement === value)}
                  >
                    {text}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className={btnSecondary}
                disabled={pending || !loanChanged}
                onClick={() => saveMode('loan', typed)}
                data-testid="buyer-loan-save"
              >
                {loanChanged || !noted ? 'Enregistrer le prêt' : 'Prêt enregistré ✓'}
              </button>
              <span className={hintText}>Facultatifs&nbsp;: à noter quand il les donne.</span>
            </div>
            {/* Jean-Guy (28/11) — l'accord de principe noté propose de passer le financement en
                « Validé », sans rien changer de lui-même ; rien dans l'autre sens. */}
            {suggestsValidated({
              mode: mode.mode,
              agreement: mode.loan.agreement,
              financing: current.financing,
            }) ? (
              <div
                className="flex flex-wrap items-center gap-3 border-t border-zinc-100 pt-3 stage:border-white/10"
                data-testid="buyer-loan-suggest-validated"
              >
                <span className="text-sm text-zinc-700 stage:text-white/80">
                  Accord de principe obtenu&nbsp;: passer le financement en
                  «&nbsp;Validé&nbsp;»&#x202f;?
                </span>
                <button
                  type="button"
                  className={btnSecondary}
                  disabled={pending}
                  onClick={() => choose('validated')}
                >
                  Passer en Validé
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      <button
        type="button"
        onClick={contact}
        disabled={pending || contacted}
        className={`${btnSecondary} w-full`}
        data-testid="buyer-contacted"
      >
        {contacted ? 'Contact noté aujourd’hui ✓' : 'J’ai eu l’acquéreur aujourd’hui'}
      </button>
      {leaving ? (
        <ConfirmDialog
          title={`Passer en «\u00a0${BUYER_FINANCING_MODE_LABELS[leaving]}\u00a0»\u202f?`}
          text="L’apport, le montant du prêt et l’accord de principe notés seront effacés."
          onCancel={() => setLeaving(null)}
        >
          <button
            type="button"
            className={btnDanger}
            disabled={pending}
            onClick={() => saveMode(leaving, NO_LOAN)}
            data-testid="buyer-loan-erase"
          >
            Effacer le prêt
          </button>
        </ConfirmDialog>
      ) : null}
      {error ? (
        <p role="alert" className={errorText}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
