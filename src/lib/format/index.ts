// Mission 74 — le seul formateur de nombres de l'application.
//
// Tout nombre affiché passe par ici : format français (virgule décimale, espace des milliers),
// 2 décimales au plus, aucun zéro inutile, vrai signe moins. Un test (no-raw-number.test.ts)
// interdit `toFixed(` et `toLocaleString(` partout ailleurs dans src/ : un nombre brut
// (« -1.7000000000000028 m² ») ne peut plus revenir.
//
// Ce module ne calcule rien : il n'arrondit que pour l'affichage.

import type { ClientLanguage } from '@/lib/client-language';

const LOCALE = 'fr-FR';
// Mission 140 — ce que voit le client suit sa langue (« 1 639 500 € » / « €1,639,500 ») ; le
// conseiller lit toujours le français (sans `language`, rien ne change, à l'octet près).
const LOCALES: Record<ClientLanguage, string> = {
  fr: 'fr-FR',
  en: 'en-GB',
  it: 'it-IT',
  de: 'de-DE',
  ru: 'ru-RU',
};
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
  // Mission 140 — la langue du client ; absente : le français.
  language?: ClientLanguage;
};

const formatters = new Map<string, Intl.NumberFormat>();

function formatterFor(
  minDecimals: number,
  maxDecimals: number,
  locale: string = LOCALE,
): Intl.NumberFormat {
  const key = `${locale}:${minDecimals}:${maxDecimals}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
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
  const locale = options.language ? LOCALES[options.language] : LOCALE;
  const body = formatterFor(minDecimals, maxDecimals, locale).format(Math.abs(value));
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

// Mission 140 — en anglais, l'euro se place devant le nombre, après son signe (« −€5,000 »).
function euroFirst(value: number, suffix: string, options: FormatNumberOptions): string {
  if (!Number.isFinite(value)) return MISSING;
  const number = formatNumber(value, options);
  const sign = number.startsWith(MINUS) || number.startsWith('+') ? number[0] : '';
  return `${sign}€${sign ? number.slice(1) : number}${suffix}`;
}

// Un montant : à l'euro près, sauf demande contraire (« 300 000 € »).
export function formatEuro(value: number, options: FormatNumberOptions = {}): string {
  const merged = { maxDecimals: 0, ...options };
  return options.language === 'en' ? euroFirst(value, '', merged) : withUnit(value, '€', merged);
}

// Un prix au m² : à l'euro près (« 4 739 €/m² »).
export function formatEuroPerSquareMeter(value: number, options: FormatNumberOptions = {}): string {
  const merged = { maxDecimals: 0, ...options };
  return options.language === 'en'
    ? euroFirst(value, '/m²', merged)
    : withUnit(value, '€/m²', merged);
}

// Une surface ou un écart de surface, au m² près (« 65 m² », « −2 m² ») : mission 97, partout
// comme dans les courriers (M87). Seul l'affichage arrondit ; la base garde la valeur saisie.
export function formatSquareMeters(value: number, options: FormatNumberOptions = {}): string {
  return withUnit(value, 'm²', { maxDecimals: 0, ...options });
}

export function formatPercent(value: number, options: FormatNumberOptions = {}): string {
  // Mission 140 — en anglais, « 5.8% », sans espace.
  if (options.language === 'en') {
    return Number.isFinite(value) ? `${formatNumber(value, options)}%` : MISSING;
  }
  return withUnit(value, '%', options);
}

// Mission 140 — un jour pour le client, à Paris : « 6 novembre 2026 » / « 6 November 2026 »
// (`long`), « 6 novembre » / « 6 November » (`dayMonth`), « 06/11/2026 » / « 06/11/2026 »
// (`numeric`, jour d'abord en anglais britannique comme en français).
export type DayStyle = 'long' | 'dayMonth' | 'numeric' | 'short';
const DAY_OPTIONS: Record<DayStyle, Intl.DateTimeFormatOptions> = {
  long: { day: 'numeric', month: 'long', year: 'numeric' },
  dayMonth: { day: 'numeric', month: 'long' },
  numeric: { day: '2-digit', month: '2-digit', year: 'numeric' },
  short: { day: '2-digit', month: '2-digit' },
};
export function formatDay(
  value: string | number | Date,
  language: ClientLanguage = 'fr',
  style: DayStyle = 'long',
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return MISSING;
  return new Intl.DateTimeFormat(LOCALES[language], {
    ...DAY_OPTIONS[style],
    timeZone: 'Europe/Paris',
  }).format(date);
}

// Une date et son heure (« 06/10/2026 21:14:03 »), pour « Validé le … ».
export function formatDateTime(value: string | number | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? MISSING : date.toLocaleString(LOCALE);
}

// Mission 143 (C1) — les dates des écrans du CONSEILLER, qui se lisent d'un coup d'œil : «
// aujourd'hui », « hier », « il y a 3 jours » (jusqu'à 6), puis « le 07/11 » dans l'année, « le
// 07/11/2025 » au-delà ; une date à venir, « le 14/11 ». Avec l'heure : « aujourd'hui à 12 h 32 »,
// « le 07/11 à 12 h 32 », jamais de secondes. À l'heure de Paris. Jamais devant le client ni dans
// les documents (décision de Jean-Guy, 07/11) : ils gardent des dates absolues, dans sa langue.
const PARIS_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Paris',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const parisDayOf = (date: Date) => PARIS_DAY.format(date); // AAAA-MM-JJ

function daysBetweenParis(from: Date, to: Date): number {
  const day = (date: Date) => Date.parse(`${parisDayOf(date)}T00:00:00Z`);
  return Math.round((day(to) - day(from)) / 86_400_000);
}

export function formatRelativeDay(value: string | number | Date, now: Date = new Date()): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return MISSING;
  const days = daysBetweenParis(date, now);
  if (days === 0) return 'aujourd’hui';
  if (days === 1) return 'hier';
  if (days >= 2 && days <= 6) return `il y a ${days} jours`;
  const [year, month, day] = parisDayOf(date).split('-');
  return year === parisDayOf(now).slice(0, 4) ? `le ${day}/${month}` : `le ${day}/${month}/${year}`;
}

// « depuis aujourd’hui », « depuis hier », « depuis 3 jours », « depuis le 31/10 » (M143, C1).
export function formatRelativeSince(value: string | number | Date, now: Date = new Date()): string {
  const day = formatRelativeDay(value, now);
  if (day === MISSING) return MISSING;
  return `depuis ${day.replace(/^il y a /, '')}`;
}

export function formatRelativeMoment(
  value: string | number | Date,
  now: Date = new Date(),
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return MISSING;
  const time = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
    .format(date)
    .replace(':', ' h ')
    .replace(/^0(\d) h/, '$1 h');
  const day = formatRelativeDay(date, now);
  // « il y a 3 jours à 9 h » se lit mal : au-delà d'hier, le jour daté.
  const dated = day.startsWith('il y a')
    ? (() => {
        const [year, month, dayOfMonth] = parisDayOf(date).split('-');
        return year === parisDayOf(now).slice(0, 4)
          ? `le ${dayOfMonth}/${month}`
          : `le ${dayOfMonth}/${month}/${year}`;
      })()
    : day;
  return `${dated} à ${time}`;
}
