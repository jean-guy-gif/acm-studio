import { normalizeLabel } from '@/features/comparable-analysis/utils/normalize-label';

// Normalises a free-text list (strengths / watch points). Reuses the Mission 16
// text normalisation (trim + collapse spaces + accent/case-insensitive key) and
// keeps the first clean label per canonical key, in first-occurrence order.
// Empty and non-string values are dropped. Pure — no length/limit checks here
// (those belong to validation).
export function normalizePropertyList(values: readonly unknown[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const normalized = normalizeLabel(value);
    if (!normalized || seen.has(normalized.key)) {
      continue;
    }
    seen.add(normalized.key);
    result.push(normalized.label);
  }
  return result;
}
