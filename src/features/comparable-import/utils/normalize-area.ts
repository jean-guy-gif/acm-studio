const MAX_AREA = 1e7;

// Normalises surface/area strings ("82 m²", "82,5 m2", "82.5") to a
// non-negative number, or null when not usable.
export function normalizeArea(raw: unknown): number | null {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) && raw >= 0 && raw <= MAX_AREA ? raw : null;
  }
  if (typeof raw !== 'string') {
    return null;
  }

  let s = raw.replace(/ /g, ' ').toLowerCase();
  s = s.replace(/m²|m2|m\^2/g, ' ');
  s = s.replace(/[^\d.,-]/g, '');
  if (s === '' || s === '-') {
    return null;
  }

  if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, '');
  }

  const value = Number(s);
  if (!Number.isFinite(value) || value < 0 || value > MAX_AREA) {
    return null;
  }
  return value;
}
