// Mission 137 (partie B) — les montants en lettres de l'offre d'achat (« quatre cent vingt mille »),
// de 1 à 9 999 999, en orthographe traditionnelle : traits d'union sous cent seulement, « et » pour
// 21, 31… 71 (« soixante et onze »), « quatre-vingts » et « deux cents » au pluriel quand rien ne
// suit, « quatre-vingt-un » et « deux cent un » sinon, « mille » invariable, « million(s) ». Pur.

const UNITS = [
  'zéro',
  'un',
  'deux',
  'trois',
  'quatre',
  'cinq',
  'six',
  'sept',
  'huit',
  'neuf',
  'dix',
  'onze',
  'douze',
  'treize',
  'quatorze',
  'quinze',
  'seize',
  'dix-sept',
  'dix-huit',
  'dix-neuf',
];
const TENS = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante'];

// 0 à 99.
function belowHundred(n: number): string {
  if (n < 20) return UNITS[n]!;
  const tens = Math.floor(n / 10);
  const unit = n % 10;
  if (tens === 7 || tens === 9) {
    // 70-79 : soixante-dix… ; 90-99 : quatre-vingt-dix…
    const base = tens === 7 ? 'soixante' : 'quatre-vingt';
    const rest = 10 + unit;
    if (tens === 7 && unit === 1) return 'soixante et onze';
    return `${base}-${UNITS[rest]}`;
  }
  if (tens === 8) return unit === 0 ? 'quatre-vingts' : `quatre-vingt-${UNITS[unit]}`;
  if (unit === 0) return TENS[tens]!;
  if (unit === 1) return `${TENS[tens]} et un`;
  return `${TENS[tens]}-${UNITS[unit]}`;
}

// 0 à 999 ; `final` : le groupe est-il le dernier (« quatre-vingts », « deux cents » ne
// prennent le « s » qu'en fin de nombre, jamais devant « mille »).
function belowThousand(n: number, final: boolean): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  let restWords = rest > 0 ? belowHundred(rest) : '';
  if (!final && rest === 80) restWords = 'quatre-vingt';
  if (hundreds === 0) return restWords;
  const head = hundreds === 1 ? 'cent' : `${UNITS[hundreds]} cent${rest === 0 && final ? 's' : ''}`;
  return rest > 0 ? `${head} ${restWords}` : head;
}

export function numberInWords(value: number): string {
  if (!Number.isInteger(value) || value < 0 || value > 9_999_999) {
    throw new RangeError('Montant hors des bornes (0 à 9 999 999).');
  }
  if (value === 0) return 'zéro';
  const millions = Math.floor(value / 1_000_000);
  const thousands = Math.floor((value % 1_000_000) / 1000);
  const rest = value % 1000;
  const parts: string[] = [];
  if (millions > 0)
    parts.push(`${belowThousand(millions, true)} million${millions > 1 ? 's' : ''}`);
  if (thousands > 0) {
    parts.push(thousands === 1 ? 'mille' : `${belowThousand(thousands, false)} mille`);
  }
  if (rest > 0) parts.push(belowThousand(rest, true));
  return parts.join(' ');
}
