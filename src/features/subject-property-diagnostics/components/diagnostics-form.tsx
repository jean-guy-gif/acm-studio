'use client';

import { useImperativeHandle, useState, type Ref } from 'react';

import { formSection, formSectionTitle } from '@/components/ui/styles';
import type { BrochureDiagnosticsPrefill } from '@/features/subject-property-import/types';
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
import type { SheetSectionHandle } from '@/features/subject-property/services/sheet-form';

const STATUS_OPTIONS = DIAGNOSTIC_STATUSES.map((value) => ({
  value,
  label: DIAGNOSTIC_STATUS_LABELS[value],
}));

const str = (value: string | number | null | undefined): string =>
  value == null ? '' : String(value);

// An imported value (from a brochure) pre-fills the field; otherwise the saved
// value is used. Same guardrail-friendly pattern as the property form (Mission 38).
const pick = (
  importedValue: number | null | undefined,
  savedValue: string | number | null | undefined,
): string => (importedValue != null ? String(importedValue) : str(savedValue));

// MISSION 77 — one section of the sheet: it no longer saves. The save bar reads its values
// (`ref`) and hands back the field errors.
export function DiagnosticsForm({
  diagnostics,
  imported,
  errors = {},
  onDirty,
  ref,
}: {
  diagnostics: SubjectPropertyDiagnostics | null;
  imported?: BrochureDiagnosticsPrefill;
  errors?: Record<string, string>;
  onDirty?: () => void;
  ref?: Ref<SheetSectionHandle>;
}) {
  const [values, setValues] = useState<Record<string, string>>({
    dpe_date: str(diagnostics?.dpe_date),
    energy_consumption: pick(imported?.energy_consumption, diagnostics?.energy_consumption),
    ges_emissions: pick(imported?.ges_emissions, diagnostics?.ges_emissions),
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

  const set = (name: string, value: string) => {
    setValues((previous) => ({ ...previous, [name]: value }));
    onDirty?.();
  };

  useImperativeHandle(ref, () => ({ entries: () => Object.entries(values) }));

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
    </section>
  );
}
