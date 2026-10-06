// Mission 74 — le seul formateur de nombres de l'application.
//
// Tout nombre affiché passe par ici : format français (virgule décimale, espace des milliers),
// 2 décimales au plus, aucun zéro inutile, vrai signe moins. Un test (no-raw-number.test.ts)
// interdit `toFixed(` et `toLocaleString(` partout ailleurs dans src/ : un nombre brut
// (« -1.7000000000000028 m² ») ne peut plus revenir.
//
// Ce module ne calcule rien : il n'arrondit que pour l'affichage.

const LOCALE = 'fr-FR';
const MAX_DECIMALS = 2;
const MINUS = '−';
const NBSP = ' ';
const MISSING = '—';

export type FormatNumberOptions = {
  // Décimales affichées au plus (plafonné à 2).
  maxDecimals?: number;
  // Décimales toujours affichées (un montant en centimes : « 0,20 € »).
  minDecimals?: number;
  // Affiche « + » devant un nombre positif (un écart).
  signed?: boolean;
};

const formatters = new Map<string, Intl.NumberFormat>();

function formatterFor(minDecimals: number, maxDecimals: number): Intl.NumberFormat {
  const key = `${minDecimals}:${maxDecimals}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(LOCALE, {
      minimumFractionDigits: minDecimals,
      maximumFractionDigits: maxDecimals,
    });
    formatters.set(key, formatter);
  }
  return formatter;
}

const clampDecimals = (value: number): number =>
  Math.min(Math.max(Math.trunc(value), 0), MAX_DECIMALS);

export function formatNumber(value: number, options: FormatNumberOptions = {}): string {
  if (!Number.isFinite(value)) {
    return MISSING;
  }
  const maxDecimals = clampDecimals(options.maxDecimals ?? MAX_DECIMALS);
  const minDecimals = Math.min(clampDecimals(options.minDecimals ?? 0), maxDecimals);
  const body = formatterFor(minDecimals, maxDecimals).format(Math.abs(value));
  // Un nombre qui s'arrondit à zéro ne porte aucun signe : jamais « −0 ».
  if (!/[1-9]/.test(body)) {
    return body;
  }
  if (value < 0) {
    return `${MINUS}${body}`;
  }
  return options.signed ? `+${body}` : body;
}

const withUnit = (value: number, unit: string, options: FormatNumberOptions): string =>
  Number.isFinite(value) ? `${formatNumber(value, options)}${NBSP}${unit}` : MISSING;

// Un montant : à l'euro près, sauf demande contraire (« 300 000 € »).
export function formatEuro(value: number, options: FormatNumberOptions = {}): string {
  return withUnit(value, '€', { maxDecimals: 0, ...options });
}

// Un prix au m² : à l'euro près (« 4 739 €/m² »).
export function formatEuroPerSquareMeter(value: number, options: FormatNumberOptions = {}): string {
  return withUnit(value, '€/m²', { maxDecimals: 0, ...options });
}

// Une surface ou un écart de surface (« 64,7 m² », « −1,7 m² »).
export function formatSquareMeters(value: number, options: FormatNumberOptions = {}): string {
  return withUnit(value, 'm²', options);
}

export function formatPercent(value: number, options: FormatNumberOptions = {}): string {
  return withUnit(value, '%', options);
}

// Une date et son heure (« 06/10/2026 21:14:03 »), pour « Validé le … ».
export function formatDateTime(value: string | number | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? MISSING : date.toLocaleString(LOCALE);
}
