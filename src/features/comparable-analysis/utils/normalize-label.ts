import type { CountEntry } from '@/features/comparable-analysis/types/comparable-analysis';

export type NormalizedLabel = {
  // Canonical grouping key: lowercased, accent-free, space-collapsed.
  key: string;
  // Clean display label: trimmed and space-collapsed, original case/accents kept.
  label: string;
};

// Pure text normalisation used to group free-text values (features, cities,
// districts) without being fooled by case, accents or extra spaces. Never
// mutates stored data. Returns null for empty or non-textual values.
export function normalizeLabel(value: unknown): NormalizedLabel | null {
  if (typeof value !== 'string') {
    return null;
  }
  const label = value.trim().replace(/\s+/g, ' ');
  if (label === '') {
    return null;
  }
  const key = label
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
  return { key, label };
}

// Counts values grouped by their canonical key. The displayed label is the first
// clean label seen for each key (deterministic given the input order). Empty or
// non-textual values are ignored. Sorted by count desc, then label asc.
export function countCanonical(values: unknown[]): CountEntry[] {
  const groups = new Map<string, { label: string; count: number }>();
  for (const value of values) {
    const normalized = normalizeLabel(value);
    if (!normalized) {
      continue;
    }
    const existing = groups.get(normalized.key);
    if (existing) {
      existing.count += 1;
    } else {
      groups.set(normalized.key, { label: normalized.label, count: 1 });
    }
  }
  return [...groups.values()]
    .map(({ label, count }) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}
