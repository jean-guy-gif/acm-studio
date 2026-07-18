const MAX_PRICE = 1e11;

// Normalises French/EU price strings ("450 000 €", "450.000 €", "450 000 EUR",
// "450000") to a non-negative number, or null when not usable.
export function normalizePrice(raw: unknown): number | null {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) && raw >= 0 && raw <= MAX_PRICE ? raw : null;
  }
  if (typeof raw !== 'string') {
    return null;
  }

  let s = raw.replace(/ /g, ' ');
  s = s.replace(/eur(os?)?|€/gi, ' ');
  s = s.replace(/[^\d.,-]/g, '');
  if (s === '' || s === '-') {
    return null;
  }

  if (s.includes(',')) {
    // Comma is the decimal separator (FR); dots are thousands.
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) {
    // Dot-grouped thousands, e.g. "450.000".
    s = s.replace(/\./g, '');
  }

  const value = Number(s);
  if (!Number.isFinite(value) || value < 0 || value > MAX_PRICE) {
    return null;
  }
  return value;
}
