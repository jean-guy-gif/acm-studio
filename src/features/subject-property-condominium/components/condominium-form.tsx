'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import type { SaveCondominiumResult } from '@/features/subject-property-condominium/actions/save-subject-property-condominium';
import type { SubjectPropertyCondominium } from '@/features/subject-property-condominium/types';
import {
  DateField,
  NumberField,
  SelectField,
  TextareaField,
  TextField,
} from '@/features/subject-property/components/property-inputs';

const TRI_STATE_OPTIONS = [
  { value: 'true', label: 'Oui' },
  { value: 'false', label: 'Non' },
];

const str = (value: string | number | null | undefined): string =>
  value == null ? '' : String(value);
const boolStr = (value: boolean | null | undefined): string =>
  value == null ? '' : value ? 'true' : 'false';

export function CondominiumForm({
  condominium,
  saveAction,
}: {
  condominium: SubjectPropertyCondominium | null;
  saveAction: (formData: FormData) => Promise<SaveCondominiumResult>;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>({
    is_condominium: boolStr(condominium?.is_condominium ?? false),
    total_lots: str(condominium?.total_lots),
    residential_lots: str(condominium?.residential_lots),
    annual_charges: str(condominium?.annual_charges),
    works_fund: str(condominium?.works_fund),
    syndic_name: str(condominium?.syndic_name),
    ongoing_procedures: boolStr(condominium?.ongoing_procedures),
    procedures_details: str(condominium?.procedures_details),
    voted_works: boolStr(condominium?.voted_works),
    voted_works_details: str(condominium?.voted_works_details),
    planned_works: boolStr(condominium?.planned_works),
    planned_works_details: str(condominium?.planned_works_details),
    known_unpaid_charges: boolStr(condominium?.known_unpaid_charges),
    known_unpaid_charges_amount: str(condominium?.known_unpaid_charges_amount),
    last_general_assembly_date: str(condominium?.last_general_assembly_date),
    notes: str(condominium?.notes),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = (name: string, value: string) =>
    setValues((previous) => ({ ...previous, [name]: value }));
  const isCondo = values.is_condominium === 'true';

  function submit() {
    setBanner(null);
    setMessage(null);
    const formData = new FormData();
    for (const [name, value] of Object.entries(values)) {
      formData.set(name, value);
    }
    startTransition(async () => {
      const result = await saveAction(formData);
      if (result.ok) {
        setErrors({});
        setMessage('Copropriété enregistrée.');
        router.refresh();
      } else {
        setErrors(result.fieldErrors ?? {});
        setBanner(result.error ?? 'L’enregistrement a échoué.');
      }
    });
  }

  const tri = (name: string, label: string) => (
    <SelectField
      label={label}
      value={values[name]}
      onChange={(value) => set(name, value)}
      options={TRI_STATE_OPTIONS}
      error={errors[name]}
    />
  );

  return (
    <section className="flex max-w-2xl flex-col gap-4">
      <h2 className="text-lg font-medium">Copropriété</h2>
      {banner ? (
        <p role="alert" className="text-sm text-red-600">
          {banner}
        </p>
      ) : null}
      {message ? <p className="text-sm text-emerald-600">{message}</p> : null}

      <SelectField
        label="Bien en copropriété"
        value={values.is_condominium}
        onChange={(value) => set('is_condominium', value)}
        options={TRI_STATE_OPTIONS}
        error={errors.is_condominium}
      />

      {isCondo ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <NumberField
              label="Nombre total de lots"
              value={values.total_lots}
              min={0}
              step={1}
              onChange={(v) => set('total_lots', v)}
              error={errors.total_lots}
            />
            <NumberField
              label="Lots d’habitation"
              value={values.residential_lots}
              min={0}
              step={1}
              onChange={(v) => set('residential_lots', v)}
              error={errors.residential_lots}
            />
            <NumberField
              label="Charges annuelles"
              value={values.annual_charges}
              min={0}
              suffix="€/an"
              onChange={(v) => set('annual_charges', v)}
              error={errors.annual_charges}
            />
            <NumberField
              label="Fonds travaux"
              value={values.works_fund}
              min={0}
              suffix="€"
              onChange={(v) => set('works_fund', v)}
              error={errors.works_fund}
            />
          </div>

          <TextField
            label="Syndic"
            value={values.syndic_name}
            onChange={(v) => set('syndic_name', v)}
            error={errors.syndic_name}
          />

          {tri('ongoing_procedures', 'Procédures en cours')}
          {values.ongoing_procedures === 'true' ? (
            <TextareaField
              label="Détail des procédures"
              value={values.procedures_details}
              maxLength={2000}
              onChange={(v) => set('procedures_details', v)}
              error={errors.procedures_details}
            />
          ) : null}

          {tri('voted_works', 'Travaux votés')}
          {values.voted_works === 'true' ? (
            <TextareaField
              label="Détail des travaux votés"
              value={values.voted_works_details}
              maxLength={2000}
              onChange={(v) => set('voted_works_details', v)}
              error={errors.voted_works_details}
            />
          ) : null}

          {tri('planned_works', 'Travaux à prévoir')}
          {values.planned_works === 'true' ? (
            <TextareaField
              label="Détail des travaux à prévoir"
              value={values.planned_works_details}
              maxLength={2000}
              onChange={(v) => set('planned_works_details', v)}
              error={errors.planned_works_details}
            />
          ) : null}

          {tri('known_unpaid_charges', 'Impayés connus')}
          {values.known_unpaid_charges === 'true' ? (
            <NumberField
              label="Montant des impayés"
              value={values.known_unpaid_charges_amount}
              min={0}
              suffix="€"
              onChange={(v) => set('known_unpaid_charges_amount', v)}
              error={errors.known_unpaid_charges_amount}
            />
          ) : null}

          <DateField
            label="Dernière assemblée générale"
            value={values.last_general_assembly_date}
            onChange={(v) => set('last_general_assembly_date', v)}
            error={errors.last_general_assembly_date}
          />

          <TextareaField
            label="Notes"
            value={values.notes}
            maxLength={2000}
            onChange={(v) => set('notes', v)}
            error={errors.notes}
          />
        </>
      ) : null}

      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="self-start rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-200 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        {pending ? 'Enregistrement…' : 'Enregistrer la copropriété'}
      </button>
    </section>
  );
}
