// Parses a French date as portals write it, into an ISO date (UTC midnight) or null.
// Two forms, both measured on real pages (10 September):
//   - numeric: "23/07/2026", and the day on ONE digit too — "3/07/2026" (Green Acres
//     « Vu … fois depuis le 3/07/2026 »); the sondage that missed this captured
//     "3/07" instead of "23/07", a regex defect this reader must not reproduce;
//   - long:    "29 août 2026" (Bien'ici « Modifiée le 29 août 2026 »).
//
// Read as UTC: the value only feeds a whole-day delay, and must not depend on the
// machine's timezone (same rationale as parseIsoDate).

// Full names AND the abbreviations Bien'ici writes with a trailing point
// (« 8 sept. 2026 »). The point is stripped by the caller's regex, so the key is
// the letters only. Measured rule: janv. févr. avr. juil. sept. oct. nov. déc.
// s'abrègent ; mars, mai, juin, août ne s'abrègent PAS (déjà couverts en entier).
const MONTHS: Record<string, number> = {
  janvier: 1,
  janv: 1,
  février: 2,
  fevrier: 2,
  févr: 2,
  fevr: 2,
  mars: 3,
  avril: 4,
  avr: 4,
  mai: 5,
  juin: 6,
  juillet: 7,
  juil: 7,
  août: 8,
  aout: 8,
  septembre: 9,
  sept: 9,
  octobre: 10,
  oct: 10,
  novembre: 11,
  nov: 11,
  décembre: 12,
  decembre: 12,
  déc: 12,
  dec: 12,
};

function toIso(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) {
    return null;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  // Round-trip check rejects impossible dates (e.g. 31/02).
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date.toISOString();
}

export function parseFrenchDate(raw: string): string | null {
  const value = raw.trim().toLowerCase();

  // Numeric: D/M/YYYY or DD/MM/YYYY (also with "-" or "." separators).
  const numeric = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(value);
  if (numeric) {
    return toIso(Number(numeric[3]), Number(numeric[2]), Number(numeric[1]));
  }

  // Long: "29 août 2026", "1er septembre 2026".
  const long = /^(\d{1,2})(?:er)?\s+([a-zàâçéèêëîïôûùüœ]+)\.?\s+(\d{4})$/.exec(value);
  if (long) {
    const month = MONTHS[long[2]];
    if (month) {
      return toIso(Number(long[3]), month, Number(long[1]));
    }
  }

  return null;
}
