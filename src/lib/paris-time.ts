// Mission 100 — les bornes de temps qui se disent à l'écran (« ce mois », « depuis hier ») se
// comptent à l'heure de Paris, quel que soit le fuseau du serveur.

const PARIS = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Paris',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  hourCycle: 'h23',
});

function parisParts(date: Date): { year: number; month: number; day: number; hour: number } {
  const parts = PARIS.formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return { year: read('year'), month: read('month'), day: read('day'), hour: read('hour') };
}

// Minuit à Paris, le jour donné (un jour hors du mois se reporte : le 0 est le dernier jour du
// mois précédent). Paris est à UTC+1 ou UTC+2 : on essaie les deux, on garde celui qui tombe juste.
function parisMidnight(year: number, month: number, day: number): Date {
  const utcMidnight = Date.UTC(year, month - 1, day);
  const wanted = new Date(utcMidnight);
  for (const offsetHours of [2, 1]) {
    const candidate = new Date(utcMidnight - offsetHours * 3_600_000);
    const parts = parisParts(candidate);
    if (parts.hour === 0 && parts.day === wanted.getUTCDate()) return candidate;
  }
  return new Date(utcMidnight - 3_600_000);
}

export function startOfParisMonth(now: Date): Date {
  const { year, month } = parisParts(now);
  return parisMidnight(year, month, 1);
}

export function startOfParisYesterday(now: Date): Date {
  const { year, month, day } = parisParts(now);
  return parisMidnight(year, month, day - 1);
}

// Mission 139 — la semaine de Paris : son lundi (AAAA-MM-JJ), et minuit à Paris d'un jour donné
// (les bornes du point de la semaine, heure d'été comprise).
export function parisMonday(now: Date): string {
  const { year, month, day } = parisParts(now);
  const date = new Date(Date.UTC(year, month - 1, day));
  const fromMonday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - fromMonday);
  return date.toISOString().slice(0, 10);
}

export function parisMidnightOf(day: string): Date {
  const [year, month, date] = day.split('-').map(Number);
  return parisMidnight(year!, month!, date!);
}
