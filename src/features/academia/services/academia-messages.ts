import { formatDay } from '@/lib/format';

// Mission 161 — le délai dit par Academia (`Retry-After`) : une limite par minute, ou celle des
// nouveaux dossiers du jour (200 par 24 h, toutes agences confondues).
const QUOTA_MINUTES_MAX = 3600;
export function academiaQuotaMessage(
  retryAfter: number | undefined,
  now: Date = new Date(),
): { message: string; retry: boolean } {
  if (retryAfter != null && retryAfter <= QUOTA_MINUTES_MAX) {
    const minutes = Math.max(1, Math.ceil(retryAfter / 60));
    return {
      message: `Academia reçoit beaucoup de demandes en ce moment\u00a0: réessayez dans ${minutes} minute${minutes > 1 ? 's' : ''}.`,
      retry: true,
    };
  }
  const tail = ' Les dossiers déjà prêts restent lisibles. Ou collez le lien vous-même.';
  if (retryAfter == null) {
    return {
      message: `Academia a atteint sa limite de nouveaux dossiers pour aujourd’hui\u00a0: réessayez demain.${tail}`,
      retry: false,
    };
  }
  const at = new Date(now.getTime() + retryAfter * 1000);
  const parisDay = (date: Date) =>
    new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris' }).format(date);
  const [hours, minutes] = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    hour: '2-digit',
    minute: '2-digit',
  })
    .format(at)
    .split(':');
  const tomorrow = parisDay(new Date(now.getTime() + 86_400_000));
  const day = parisDay(at);
  const prefix =
    day === parisDay(now)
      ? ''
      : day === tomorrow
        ? 'demain, '
        : `le ${formatDay(at, 'fr', 'short')}, `;
  const when = `${prefix}à partir de ${Number(hours)} h ${minutes}`;
  return {
    message: `Academia a atteint sa limite de nouveaux dossiers pour aujourd’hui\u00a0: réessayez ${when}.${tail}`,
    retry: false,
  };
}
