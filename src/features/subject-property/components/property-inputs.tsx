'use client';

import { checkChip, errorText, fieldLabel, inputBase } from '@/components/ui/styles';

// Small shared presentational input primitives for the seller-property form.
// Errors are rendered near their field.

function FieldError({ error }: { error?: string }) {
  return error ? <span className={errorText}>{error}</span> : null;
}

export function TextField({
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
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputBase}
      />
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  error?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={fieldLabel}>{label}</span>
      <select
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
