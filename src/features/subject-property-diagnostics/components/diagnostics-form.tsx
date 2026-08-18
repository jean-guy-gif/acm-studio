'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import {
  alertError,
  alertOk,
  btnPrimary,
  formSection,
  formSectionTitle,
} from '@/components/ui/styles';
import type { SaveDiagnosticsResult } from '@/features/subject-property-diagnostics/actions/save-subject-property-diagnostics';
import {
  DIAGNOSTIC_STATUS_LABELS,
  DIAGNOSTIC_STATUSES,
} from '@/features/subject-property-diagnostics/constants/diagnostic-statuses';
import type { SubjectPropertyDiagnostics } from '@/features/subject-property-diagnostics/types';
import {
  DateField,
  NumberField,
  SelectField,
  TextareaField,
} from '@/features/subject-property/components/property-inputs';

const STATUS_OPTIONS = DIAGNOSTIC_STATUSES.map((value) => ({
  value,
  label: DIAGNOSTIC_STATUS_LABELS[value],
}));

const str = (value: string | number | null | undefined): string =>
  value == null ? '' : String(value);

export function DiagnosticsForm({
  diagnostics,
  saveAction,
}: {
  diagnostics: SubjectPropertyDiagnostics | null;
  saveAction: (formData: FormData) => Promise<SaveDiagnosticsResult>;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>({
    dpe_date: str(diagnostics?.dpe_date),
    energy_consumption: str(diagnostics?.energy_consumption),
    ges_emissions: str(diagnostics?.ges_emissions),
    asbestos_status: str(diagnostics?.asbestos_status),
    lead_status: str(diagnostics?.lead_status),
    electricity_status: str(diagnostics?.electricity_status),
    gas_status: str(diagnostics?.gas_status),
    termites_status: str(diagnostics?.termites_status),
    erp_status: str(diagnostics?.erp_status),
    diagnostics_completed_at: str(diagnostics?.diagnostics_completed_at),
    diagnostics_valid_until: str(diagnostics?.diagnostics_valid_until),
    notes: str(diagnostics?.notes),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = (name: string, value: string) =>
    setValues((previous) => ({ ...previous, [name]: value }));

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
        setMessage('Diagnostics enregistrés.');
        router.refresh();
      } else {
        setErrors(result.fieldErrors ?? {});
        setBanner(result.error ?? 'L’enregistrement a échoué.');
      }
    });
  }

  const status = (name: string, label: string) => (
    <SelectField
      label={label}
      value={values[name]}
      onChange={(value) => set(name, value)}
      options={STATUS_OPTIONS}
      error={errors[name]}
    />
  );

  return (
    <section className={`${formSection} max-w-3xl`}>
      <h2 className={formSectionTitle}>Diagnostics</h2>
      {banner ? (
        <p role="alert" className={alertError}>
          {banner}
        </p>
      ) : null}
      {message ? <p className={alertOk}>{message}</p> : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <DateField
          label="Date DPE"
          value={values.dpe_date}
          onChange={(v) => set('dpe_date', v)}
          error={errors.dpe_date}
        />
        <NumberField
          label="Consommation"
          value={values.energy_consumption}
          min={0}
          step={1}
          suffix="kWhEP/m²/an"
          onChange={(v) => set('energy_consumption', v)}
          error={errors.energy_consumption}
        />
        <NumberField
          label="Émissions GES"
          value={values.ges_emissions}
          min={0}
          step={1}
          suffix="kgCO₂/m²/an"
          onChange={(v) => set('ges_emissions', v)}
          error={errors.ges_emissions}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {status('asbestos_status', 'Amiante')}
        {status('lead_status', 'Plomb')}
        {status('electricity_status', 'Électricité')}
        {status('gas_status', 'Gaz')}
        {status('termites_status', 'Termites')}
        {status('erp_status', 'Risques et pollutions')}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <DateField
          label="Date de réalisation"
          value={values.diagnostics_completed_at}
          onChange={(v) => set('diagnostics_completed_at', v)}
          error={errors.diagnostics_completed_at}
        />
        <DateField
          label="Date de validité"
          value={values.diagnostics_valid_until}
          onChange={(v) => set('diagnostics_valid_until', v)}
          error={errors.diagnostics_valid_until}
        />
      </div>

      <TextareaField
        label="Notes"
        value={values.notes}
        maxLength={2000}
        onChange={(v) => set('notes', v)}
        error={errors.notes}
      />

      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className={`${btnPrimary} self-start`}
      >
        {pending ? 'Enregistrement…' : 'Enregistrer les diagnostics'}
      </button>
    </section>
  );
}
