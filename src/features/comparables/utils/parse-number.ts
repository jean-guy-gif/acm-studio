export type ParsedNonNegative = number | null | 'invalid';

// Empty input -> null. Otherwise a finite number >= 0, or 'invalid'.
export function parseOptionalNonNegative(
  raw: FormDataEntryValue | null,
  integer = false,
): ParsedNonNegative {
  const value = String(raw ?? '').trim();
  if (value === '') {
    return null;
  }
  const parsed = integer ? Number.parseInt(value, 10) : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 'invalid';
  }
  return parsed;
}
