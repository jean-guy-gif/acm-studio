'use client';

import { checkChip, errorText, fieldLabel, hintText, inputBase } from '@/components/ui/styles';

// Small shared presentational input primitives for the seller-property form.
// Errors are rendered near their field.

// `data-field-error` : the save bar scrolls to the first field in error (Mission 77).
function FieldError({ error }: { error?: string }) {
  return error ? (
    <span data-field-error className={errorText}>
      {error}
    </span>
  ) : null;
}

// `hint` : d'où vient la valeur quand ce n'est pas le conseiller qui l'a saisie (« d’après le DPE
// du … », mission 79).
function FieldHint({ hint }: { hint?: string }) {
  return hint ? <span className={hintText}>{hint}</span> : null;
}

export function TextField({
  label,
  value,
  onChange,
  onBlur,
  error,
  hint,
  id,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  hint?: string;
  id?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={fieldLabel}>{label}</span>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        className={inputBase}
      />
      <FieldHint hint={hint} />
      <FieldError error={error} />
    </label>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  error,
  step = 'any',
  min,
  suffix,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  step?: string | number;
  min?: number;
  suffix?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={fieldLabel}>{label}</span>
      <span className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          step={step}
          min={min}
          onChange={(event) => onChange(event.target.value)}
          className={`${inputBase} w-full min-w-0 flex-1`}
        />
        {suffix ? (
          <span className="shrink-0 text-sm text-zinc-400 stage:text-white/50">{suffix}</span>
        ) : null}
      </span>
      <FieldError error={error} />
    </label>
  );
}

export function DateField({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={fieldLabel}>{label}</span>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputBase}
      />
      <FieldError error={error} />
    </label>
  );
}

export function TextareaField({
  label,
  value,
  onChange,
  error,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  maxLength?: number;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={fieldLabel}>{label}</span>
      <textarea
        rows={3}
        value={value}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        className={inputBase}
      />
      <FieldError error={error} />
    </label>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  error,
  hint,
  id,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  error?: string;
  hint?: string;
  id?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={fieldLabel}>{label}</span>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputBase}
      >
        <option value="">— Non renseigné —</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <FieldHint hint={hint} />
      <FieldError error={error} />
    </label>
  );
}

export function MultiCheckField({
  label,
  values,
  onChange,
  options,
  error,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  options: { value: string; label: string }[];
  error?: string;
}) {
  const toggle = (value: string) => {
    onChange(values.includes(value) ? values.filter((v) => v !== value) : [...values, value]);
  };
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className={`${fieldLabel} mb-1.5`}>{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label key={option.value} className={checkChip}>
            <input
              type="checkbox"
              checked={values.includes(option.value)}
              onChange={() => toggle(option.value)}
              className="accent-brand"
            />
            {option.label}
          </label>
        ))}
      </div>
      <FieldError error={error} />
    </fieldset>
  );
}
