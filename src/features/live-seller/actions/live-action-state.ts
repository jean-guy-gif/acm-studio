// Shared useActionState shape for the Live seller actions. Kept in a plain module
// because a 'use server' file may only export async functions. On a validation or
// business error the action RETURNS this state (no redirect) so the form keeps the
// seller's answers and can surface errors next to their fields.
export type LiveActionState = {
  ok: boolean;
  error: string | null;
  fieldErrors: Record<string, string>;
  values: Record<string, string> | null;
};

export const initialLiveActionState: LiveActionState = {
  ok: false,
  error: null,
  fieldErrors: {},
  values: null,
};

// Echo the raw string fields so the form repopulates exactly what was entered.
export function collectLiveValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string') {
      values[key] = value;
    }
  }
  return values;
}

export function numberOrNull(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? '').trim();
  if (raw === '') {
    return null;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : Number.NaN; // NaN -> caught by validation
}

export function textOrNull(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? '').trim();
  return text === '' ? null : text;
}
