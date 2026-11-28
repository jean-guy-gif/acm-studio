'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition, type ReactNode } from 'react';

import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  btnPrimary,
  fieldLabel,
  inputBase,
  link,
  socleBtnFilled,
  socleBtnOutline,
} from '@/components/ui/styles';
import { PriceInput } from '@/features/live-seller/components/price-input';
import {
  addMandateAmendment,
  cancelMandateEnd,
  compromiseFell,
  endMandateWithoutSale,
  recordCompromise,
  recordSale,
  removeLastMandateAmendment,
  setMandateEnd,
  type MandateActionResult,
} from '@/features/mandate-life/actions/mandate-actions';
import { mandateEndFrom, MANDATE_MONTHS_MAX } from '@/features/mandate-life/services/mandate-dates';
import type {
  MandateConfirmKey,
  MandateFormKey,
} from '@/features/mandate-life/services/mandate-sheet';

// Lot C (maquette C0, validée le 28/11) — les saisies de « Son mandat », ouvertes sur place : le
// seul bouton plein de l'écran est le leur (M146). Chaque saisie appelle son geste au serveur, qui
// relit tout ; un refus se dit sous la saisie, rien n'est écrit. Enregistrée, la saisie se ferme et
// la fiche se relit.

export type MandateFormContext = {
  projectId: string;
  today: string; // AAAA-MM-JJ, à Paris
  signedOn: string; // AAAA-MM-JJ
  endsOn: string | null;
  tacit: boolean;
  // « Gardés : 1 639 500 € le 28/10 → 1 590 000 € le 14/11. »
  priceChain: string | null;
  currentPriceText: string | null;
  compromise: {
    signedOn: string | null;
    deedPlannedOn: string | null;
    origin: 'agency' | 'outside' | null;
    buyerId: string | null;
  };
  // « Famille Keller · offre acceptée le 28/11 »
  offerBuyer: { id: string; label: string } | null;
  // Les acquéreurs de l'agence qui ont visité le mandat ; null : la lecture a échoué.
  visitors: { id: string; label: string }[] | null;
  sale: { deedSignedOn: string | null; salePrice: number | null };
};

const TITLES: Record<MandateFormKey, string> = {
  fin: 'Fin du mandat',
  avenant: 'Avenant de baisse',
  compromis: 'Noter le compromis',
  ailleurs: 'Noter le compromis',
  vente: 'Noter la vente',
  terminer: 'Mandat terminé sans vente',
};

function useSave(projectId: string) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const save = (call: () => Promise<MandateActionResult>) =>
    start(async () => {
      setError(null);
      const result = await call();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.replace(`/builder/${projectId}#son-mandat`, { scroll: false });
      router.refresh();
    });
  return { pending, error, save };
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className={fieldLabel}>{label}</span>
      {children}
      {hint ? <span className="text-xs text-zinc-500 stage:text-white/50">{hint}</span> : null}
    </label>
  );
}

function Shell({
  form,
  context,
  pending,
  error,
  onSubmit,
  children,
}: {
  form: MandateFormKey;
  context: MandateFormContext;
  pending: boolean;
  error: string | null;
  onSubmit: () => void;
  children: ReactNode;
}) {
  return (
    <form
      className="flex flex-col gap-4 rounded-[20px] border-2 border-brand-deep bg-white p-5 stage:border-brand stage:bg-white/5"
      data-testid={`mandate-form-${form}`}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <h4 className="text-[17px] font-extrabold text-brand-darker stage:text-white">
        {TITLES[form]}
      </h4>
      {children}
      {error ? (
        <p role="alert" className="text-sm font-semibold text-red-700" data-testid="mandate-error">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className={socleBtnFilled} disabled={pending}>
          {pending ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        <Link
          href={`/builder/${context.projectId}#son-mandat`}
          scroll={false}
          className={socleBtnOutline}
        >
          Annuler
        </Link>
      </div>
    </form>
  );
}

function EndForm({ context }: { context: MandateFormContext }) {
  const { pending, error, save } = useSave(context.projectId);
  const [months, setMonths] = useState('');
  const [endsOn, setEndsOn] = useState(context.endsOn ?? '');
  const [tacit, setTacit] = useState(context.tacit);
  return (
    <Shell
      form="fin"
      context={context}
      pending={pending}
      error={error}
      onSubmit={() =>
        save(() =>
          setMandateEnd(
            context.projectId,
            months !== '' ? { months: Number(months), tacit } : { endsOn, tacit },
          ),
        )
      }
    >
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Durée, en mois" hint="ou une date">
          <input
            type="number"
            min={1}
            max={MANDATE_MONTHS_MAX}
            step={1}
            inputMode="numeric"
            className={`${inputBase} w-28`}
            value={months}
            onChange={(event) => {
              const value = event.target.value;
              setMonths(value);
              const computed =
                value === '' ? null : mandateEndFrom(context.signedOn, Number(value));
              if (computed) setEndsOn(computed);
            }}
            data-testid="mandate-end-months"
          />
        </Field>
        <Field label="Fin le" hint="calculée depuis la signature, ou saisie">
          <input
            type="date"
            min={context.signedOn}
            className={inputBase}
            value={endsOn}
            onChange={(event) => {
              setEndsOn(event.target.value);
              setMonths('');
            }}
            data-testid="mandate-end-date"
          />
        </Field>
      </div>
      <label className="flex items-start gap-2.5">
        <input
          type="checkbox"
          className="mt-1 size-4"
          checked={tacit}
          onChange={(event) => setTacit(event.target.checked)}
          data-testid="mandate-end-tacit"
        />
        <span className="flex flex-col gap-0.5">
          <span className="text-base font-semibold text-brand-darker stage:text-white">
            Reconduction tacite
          </span>
          <span className="text-xs text-zinc-500 stage:text-white/50">
            Cochée&nbsp;: 30 jours avant, «&nbsp;Faire le point avant la reconduction&nbsp;» au lieu
            de «&nbsp;Préparer le renouvellement&nbsp;».
          </span>
        </span>
      </label>
    </Shell>
  );
}

function AmendmentForm({ context }: { context: MandateFormContext }) {
  const { pending, error, save } = useSave(context.projectId);
  const [amendedOn, setAmendedOn] = useState(context.today);
  const [digits, setDigits] = useState('');
  return (
    <Shell
      form="avenant"
      context={context}
      pending={pending}
      error={error}
      onSubmit={() =>
        save(() =>
          addMandateAmendment(context.projectId, {
            amendedOn,
            price: digits === '' ? Number.NaN : Number(digits),
          }),
        )
      }
    >
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Date de l’avenant">
          <input
            type="date"
            min={context.signedOn}
            max={context.today}
            className={inputBase}
            value={amendedOn}
            onChange={(event) => setAmendedOn(event.target.value)}
            data-testid="mandate-amendment-date"
          />
        </Field>
        <Field
          label="Nouveau prix"
          hint={
            context.currentPriceText
              ? `sous le prix du mandat (${context.currentPriceText})`
              : undefined
          }
        >
          <PriceInput
            name="mandate_amendment_price"
            language="fr"
            className={`${inputBase} w-40`}
            onDigitsChange={setDigits}
          />
        </Field>
      </div>
      {context.priceChain ? (
        <p className="text-sm text-[#5B6380] stage:text-white/60">
          Gardés&nbsp;: {context.priceChain}.
        </p>
      ) : null}
    </Shell>
  );
}

function CompromiseForm({
  context,
  preset,
}: {
  context: MandateFormContext;
  preset: 'outside' | null;
}) {
  const { pending, error, save } = useSave(context.projectId);
  const current = context.compromise;
  const [signedOn, setSignedOn] = useState(current.signedOn ?? context.today);
  const [deedOn, setDeedOn] = useState(current.deedPlannedOn ?? '');
  const others = (context.visitors ?? []).filter(
    (visitor) => visitor.id !== context.offerBuyer?.id,
  );
  const initialChoice = (): string => {
    if (preset === 'outside') return 'outside';
    if (current.origin === 'outside') return 'outside';
    if (current.buyerId && current.buyerId === context.offerBuyer?.id) return 'offer';
    if (current.buyerId && others.some((visitor) => visitor.id === current.buyerId)) {
      return `agency:${current.buyerId}`;
    }
    return context.offerBuyer ? 'offer' : '';
  };
  const [choice, setChoice] = useState(initialChoice);
  const option = (value: string, label: string) => (
    <label key={value} className="flex items-center gap-2.5">
      <input
        type="radio"
        name="mandate-compromise-buyer"
        className="size-4"
        value={value}
        checked={choice === value}
        onChange={() => setChoice(value)}
      />
      <span className="text-base text-brand-darker stage:text-white">{label}</span>
    </label>
  );
  return (
    <Shell
      form={preset === 'outside' ? 'ailleurs' : 'compromis'}
      context={context}
      pending={pending}
      error={error}
      onSubmit={() =>
        save(() =>
          recordCompromise(context.projectId, {
            compromiseSignedOn: signedOn,
            deedPlannedOn: deedOn,
            ...(choice === 'offer'
              ? { buyer: 'offer' }
              : choice === 'outside'
                ? { buyer: 'outside' }
                : choice.startsWith('agency:')
                  ? { buyer: 'agency', buyerId: choice.slice('agency:'.length) }
                  : {}),
          }),
        )
      }
    >
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Date du compromis">
          <input
            type="date"
            min={context.signedOn}
            max={context.today}
            className={inputBase}
            value={signedOn}
            onChange={(event) => setSignedOn(event.target.value)}
            data-testid="mandate-compromise-date"
          />
        </Field>
        <Field label="Date prévue de l’acte">
          <input
            type="date"
            min={signedOn || context.signedOn}
            className={inputBase}
            value={deedOn}
            onChange={(event) => setDeedOn(event.target.value)}
            data-testid="mandate-deed-planned"
          />
        </Field>
      </div>
      <fieldset className="flex flex-col gap-2" data-testid="mandate-compromise-buyer">
        <legend className={`${fieldLabel} mb-1`}>L’acquéreur</legend>
        {context.offerBuyer ? option('offer', context.offerBuyer.label) : null}
        {others.map((visitor) => option(`agency:${visitor.id}`, visitor.label))}
        {option('outside', 'Un acquéreur venu d’ailleurs')}
        {context.visitors == null ? (
          <p role="alert" className="text-sm font-semibold text-red-700">
            Les visites de ce bien n’ont pas pu être lues&nbsp;: rechargez la page pour choisir un
            acquéreur qui l’a visité.
          </p>
        ) : null}
      </fieldset>
    </Shell>
  );
}

function SaleForm({ context }: { context: MandateFormContext }) {
  const { pending, error, save } = useSave(context.projectId);
  const planned = context.compromise.deedPlannedOn;
  const [deedOn, setDeedOn] = useState(
    context.sale.deedSignedOn ?? (planned && planned <= context.today ? planned : context.today),
  );
  const [digits, setDigits] = useState(
    context.sale.salePrice != null ? String(Math.round(context.sale.salePrice)) : '',
  );
  return (
    <Shell
      form="vente"
      context={context}
      pending={pending}
      error={error}
      onSubmit={() =>
        save(() =>
          recordSale(context.projectId, {
            deedSignedOn: deedOn,
            salePrice: digits === '' ? Number.NaN : Number(digits),
          }),
        )
      }
    >
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Date de l’acte">
          <input
            type="date"
            min={context.compromise.signedOn ?? context.signedOn}
            max={context.today}
            className={inputBase}
            value={deedOn}
            onChange={(event) => setDeedOn(event.target.value)}
            data-testid="mandate-deed-date"
          />
        </Field>
        <Field label="Prix de vente" hint="tel que signé chez le notaire">
          <PriceInput
            name="mandate_sale_price"
            language="fr"
            className={`${inputBase} w-40`}
            defaultValue={context.sale.salePrice}
            onDigitsChange={setDigits}
          />
        </Field>
      </div>
    </Shell>
  );
}

function EndedForm({ context }: { context: MandateFormContext }) {
  const { pending, error, save } = useSave(context.projectId);
  const [endedOn, setEndedOn] = useState(
    context.endsOn && context.endsOn <= context.today ? context.endsOn : context.today,
  );
  return (
    <Shell
      form="terminer"
      context={context}
      pending={pending}
      error={error}
      onSubmit={() => save(() => endMandateWithoutSale(context.projectId, { endedOn }))}
    >
      <Field
        label="Le mandat s’est terminé le"
        hint="Le dossier rejoindra « Vendus ailleurs · retirés · terminés » dans le Suivi."
      >
        <input
          type="date"
          min={context.signedOn}
          max={context.today}
          className={`${inputBase} self-start`}
          value={endedOn}
          onChange={(event) => setEndedOn(event.target.value)}
          data-testid="mandate-ended-date"
        />
      </Field>
    </Shell>
  );
}

export function MandateForm({
  form,
  context,
}: {
  form: MandateFormKey;
  context: MandateFormContext;
}) {
  switch (form) {
    case 'fin':
      return <EndForm context={context} />;
    case 'avenant':
      return <AmendmentForm context={context} />;
    case 'compromis':
      return <CompromiseForm context={context} preset={null} />;
    case 'ailleurs':
      return <CompromiseForm context={context} preset="outside" />;
    case 'vente':
      return <SaleForm context={context} />;
    case 'terminer':
      return <EndedForm context={context} />;
  }
}

const CONFIRMS: Record<
  MandateConfirmKey,
  {
    title: string;
    text: string;
    confirm: string;
    call: (projectId: string) => Promise<MandateActionResult>;
  }
> = {
  'retirer-avenant': {
    title: 'Retirer le dernier avenant ?',
    text: 'Le prix du mandat redevient celui d’avant. À faire seulement s’il a été mal saisi.',
    confirm: 'Retirer l’avenant',
    call: removeLastMandateAmendment,
  },
  tombe: {
    title: 'Le compromis est tombé ?',
    text: 'Le compromis et l’acte prévu sont effacés du mandat. Le dossier revient à l’étape d’avant : « Offre acceptée » si l’offre tient encore, sinon « Mandat signé », et le Point marché reprend.',
    confirm: 'Oui, il est tombé',
    call: compromiseFell,
  },
  'annuler-fin': {
    title: 'Annuler la fin du mandat ?',
    text: 'Le mandat redevient « Mandat signé ».',
    confirm: 'Annuler la fin',
    call: cancelMandateEnd,
  },
};

// Un geste confirmé dans l'écran (M146), jamais par la boîte du navigateur.
export function MandateConfirm({
  projectId,
  kind,
  label,
}: {
  projectId: string;
  kind: MandateConfirmKey;
  label: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const spec = CONFIRMS[kind];
  return (
    <>
      <button
        type="button"
        className={`${link} text-sm underline`}
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        data-testid={`mandate-confirm-${kind}`}
      >
        {label}
      </button>
      {open ? (
        <ConfirmDialog
          title={spec.title}
          text={
            <>
              {spec.text}
              {error ? (
                <span role="alert" className="mt-2 block font-semibold text-red-700">
                  {error}
                </span>
              ) : null}
            </>
          }
          onCancel={() => setOpen(false)}
        >
          <button
            type="button"
            className={btnPrimary}
            disabled={pending}
            onClick={() =>
              start(async () => {
                const result = await spec.call(projectId);
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                setOpen(false);
                router.refresh();
              })
            }
            data-testid={`mandate-confirm-${kind}-yes`}
          >
            {pending ? 'Enregistrement…' : spec.confirm}
          </button>
        </ConfirmDialog>
      ) : null}
    </>
  );
}
