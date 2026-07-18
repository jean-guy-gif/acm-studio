const MAX_COUNT = 1000;

// Normalises a room/bedroom/bathroom count to a non-negative integer, or null.
// Decimal values (e.g. "3.5 pièces") are rejected.
export function normalizeCount(raw: unknown): number | null {
  if (typeof raw === 'number') {
    return Number.isInteger(raw) && raw >= 0 && raw <= MAX_COUNT ? raw : null;
  }
  if (typeof raw !== 'string') {
    return null;
  }
  const cleaned = raw.replace(/[\s ]/g, '');
  const match = cleaned.match(/^(\d+)([.,]\d+)?/);
  if (!match || match[2]) {
    return null;
  }
  const value = Number(match[1]);
  return Number.isInteger(value) && value >= 0 && value <= MAX_COUNT ? value : null;
}
