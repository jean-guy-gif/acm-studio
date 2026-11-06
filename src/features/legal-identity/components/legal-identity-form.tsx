'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import {
  btnPrimary,
  card,
  errorText,
  fieldLabel,
  hintText,
  inputBase,
  okText,
  sectionTitle,
} from '@/components/ui/styles';
import { IDENTITY_MANAGER_ONLY_MESSAGE } from '@/features/branding/constants';
import { saveLegalIdentity } from '@/features/legal-identity/actions/save-legal-identity';
import {
  GUARANTEE_AMOUNT_LABEL,
  LEGAL_TEXT_FIELDS,
  type LegalIdentity,
} from '@/features/legal-identity/services/legal-identity';

type FieldKey = (typeof LEGAL_TEXT_FIELDS)[number]['key'];

const GROUPS = [...new Set(LEGAL_TEXT_FIELDS.map((field) => field.group))];

// Mission 137 — « Identité légale », sous l'identité de l'agence : ce que le bon de visite et
// l'offre d'achat disent d'elle (société, RCS, TVA, téléphone et e-mail, responsabilité civile
// professionnelle, garantie financière, représentant légal). Le manager la saisit une fois ; tant
// qu'elle est incomplète, aucun de ces documents ne se produit.
export function LegalIdentityForm({
  initial,
  initialGuaranteeText,
  gaps,
  readOnly,
}: {
  initial: LegalIdentity;
  // La garantie en texte libre, d'avant (M102), reprise pour pré-remplir l'organisme.
  initialGuaranteeText: string | null;
  gaps: string[];
  readOnly: boolean;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<FieldKey, string>>(() => {
    const start = Object.fromEntries(
      LEGAL_TEXT_FIELDS.map((field) => [field.key, initial[field.key] ?? '']),
    ) as Record<FieldKey, string>;
    return start;
  });
  const [amount, setAmount] = useState(
    initial.guaranteeAmount != null ? String(initial.guaranteeAmount) : '',
  );
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<{ ok: boolean; message: string } | null>(null);

  return (
    <section className={`${card} flex flex-col gap-4 p-5`} data-testid="legal-identity">
      <div className="flex flex-col gap-1">
        <h2 className={sectionTitle}>Identité légale</h2>
        <p className={hintText}>
          Ce que le bon de visite et l’offre d’achat disent de l’agence. À saisir une fois.
        </p>
        {gaps.length > 0 ? (
          <p className="text-sm font-medium text-amber-700" data-testid="legal-identity-gaps">
            À compléter pour produire un bon de visite : {gaps.join(', ')}.
          </p>
        ) : (
          <p className={okText} data-testid="legal-identity-complete">
            Identité légale complète.
          </p>
        )}
        {readOnly ? <p className={hintText}>{IDENTITY_MANAGER_ONLY_MESSAGE}</p> : null}
        {initialGuaranteeText ? (
          <p className={hintText} data-testid="legal-identity-old-guarantee">
            Votre garantie financière en texte libre : « {initialGuaranteeText} ». Saisie ci-dessous
            champ par champ, elle le remplace sur tous vos documents.
          </p>
        ) : null}
      </div>
      <form
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (readOnly) return;
          setState(null);
          startTransition(async () => {
            const result = await saveLegalIdentity({ ...values, guaranteeAmount: amount }).catch(
              () => ({ ok: false as const, error: 'Connexion perdue : réessayez.' }),
            );
            if (!result.ok) {
              setState({ ok: false, message: result.error });
              return;
            }
            setState({ ok: true, message: 'Identité légale enregistrée.' });
            router.refresh();
          });
        }}
      >
        {GROUPS.map((group) => (
          <fieldset key={group} className="flex flex-col gap-3">
            <legend className="font-title text-base font-semibold text-zinc-900 stage:text-white">
              {group}
            </legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {LEGAL_TEXT_FIELDS.filter((field) => field.group === group).map((field) => (
                <label key={field.key} className="flex flex-col gap-1">
                  <span className={fieldLabel}>{field.label}</span>
                  <input
                    className={inputBase}
                    name={field.key}
                    value={values[field.key]}
                    maxLength={field.max}
                    disabled={readOnly}
                    onChange={(event) =>
                      setValues((current) => ({ ...current, [field.key]: event.target.value }))
                    }
                  />
                </label>
              ))}
              {group === 'Garantie financière' ? (
                <label className="flex flex-col gap-1">
                  <span className={fieldLabel}>{GUARANTEE_AMOUNT_LABEL}</span>
                  <input
                    className={inputBase}
                    name="guaranteeAmount"
                    inputMode="decimal"
                    value={amount}
                    disabled={readOnly}
                    onChange={(event) => setAmount(event.target.value)}
                  />
                </label>
              ) : null}
            </div>
          </fieldset>
        ))}
        {!readOnly ? (
          <button
            type="submit"
            className={`${btnPrimary} self-start`}
            disabled={pending}
            data-testid="legal-identity-save"
          >
            {pending ? 'Enregistrement…' : 'Enregistrer l’identité légale'}
          </button>
        ) : null}
        {state ? (
          <p role={state.ok ? 'status' : 'alert'} className={state.ok ? okText : errorText}>
            {state.message}
          </p>
        ) : null}
      </form>
    </section>
  );
}
