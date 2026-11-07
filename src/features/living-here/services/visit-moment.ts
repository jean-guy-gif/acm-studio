import type { TextLanguage } from '@/lib/client-texts';

// Mission 142 — le jour et l'heure de « Confirmer la visite », saisis à Paris : relus, jamais dans
// le passé ni à plus d'un an ; dits dans la langue de l'acquéreur. Service pur.

export type VisitMoment =
  | {
      ok: true;
      at: string;
      day: (language: TextLanguage) => string;
      time: (language: TextLanguage) => string;
    }
  | { ok: false; error: string };

const LOCALES: Record<TextLanguage, string> = { fr: 'fr-FR', en: 'en-GB' };
const YEAR_MS = 366 * 86_400_000;

// Le décalage de Paris à un instant donné, en minutes.
function parisOffsetMinutes(at: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Paris',
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'));
  return Math.round((asUtc - at.getTime()) / 60_000);
}

export function visitMoment(rawDay: unknown, rawTime: unknown, now: Date): VisitMoment {
  const day = typeof rawDay === 'string' ? rawDay.trim() : '';
  const time = typeof rawTime === 'string' ? rawTime.trim() : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    return { ok: false, error: 'Indiquez le jour et l’heure de la visite.' };
  }
  const naive = new Date(`${day}T${time}:00Z`);
  if (Number.isNaN(naive.getTime()) || naive.toISOString().slice(0, 10) !== day) {
    return { ok: false, error: 'Indiquez le jour et l’heure de la visite.' };
  }
  const at = new Date(naive.getTime() - parisOffsetMinutes(naive) * 60_000);
  if (at.getTime() < now.getTime() - 3_600_000 || at.getTime() > now.getTime() + YEAR_MS) {
    return { ok: false, error: 'La visite se confirme d’aujourd’hui à un an.' };
  }
  return {
    ok: true,
    at: at.toISOString(),
    day: (language) =>
      new Intl.DateTimeFormat(LOCALES[language], {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        timeZone: 'Europe/Paris',
      }).format(at),
    time: (language) =>
      language === 'fr'
        ? time.replace(':', ' h ')
        : new Intl.DateTimeFormat('en-GB', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZone: 'Europe/Paris',
          }).format(at),
  };
}
