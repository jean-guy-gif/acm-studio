import { formatRelativeDay } from '@/lib/format';

// Mission 156 — l'âge d'un lien « Vivre ici » collé. Un lien client d'Academia vaut 30 jours
// (Laurent, 15/11), mais ACM ne connaît pas son expiration : il compte les jours de Paris depuis
// le collage (l'heure de la base) et prévient le conseiller du 25e au 29e jour, puis à 30 jours et
// au-delà. Le lien reste toujours montré ; aucune requête ne part vers Academia (décisions de
// Jean-Guy, 15 et 16/11 ; la date d'expiration viendra de l'API). Un lien sans date (collé sur un
// mandat avant la mission) n'a pas d'âge : rien n'est inventé (M56). Pur.

export const LIVING_HERE_SOON_DAYS = 25;
export const LIVING_HERE_OLD_DAYS = 30;

export type LivingHereAge = { level: 'fresh' | 'soon' | 'old'; days: number };
export type LivingHereAgeLine = { tone: 'hint' | 'warn'; text: string };

const PARIS_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Paris',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const parisMidnight = (date: Date) => Date.parse(`${PARIS_DAY.format(date)}T00:00:00Z`);

export function livingHereAge(pastedAt: string | null, now: Date): LivingHereAge | null {
  if (!pastedAt) return null;
  const date = new Date(pastedAt);
  if (Number.isNaN(date.getTime())) return null;
  const days = Math.max(0, Math.round((parisMidnight(now) - parisMidnight(date)) / 86_400_000));
  const level =
    days >= LIVING_HERE_OLD_DAYS ? 'old' : days >= LIVING_HERE_SOON_DAYS ? 'soon' : 'fresh';
  return { level, days };
}

export function livingHereAgeLine(pastedAt: string | null, now: Date): LivingHereAgeLine | null {
  const age = livingHereAge(pastedAt, now);
  if (!age || !pastedAt) return null;
  if (age.level === 'fresh') {
    return { tone: 'hint', text: `Collé ${formatRelativeDay(pastedAt, now)}` };
  }
  const head = `Collé il y a ${age.days} jours : un lien d’Academia vaut 30 jours`;
  return {
    tone: 'warn',
    text:
      age.level === 'soon'
        ? `${head}. Collez bientôt un lien neuf.`
        : `${head}, il ne s’ouvre peut-être plus. Collez un lien neuf.`,
  };
}

// Mission 157 — un lien créé par l'API a son expiration, donnée par Academia : « valable jusqu'au
// 16/12 » ; trois jours avant, en orange ; expiré, il n'est plus montré (ni au vendeur ni aux
// acquéreurs) et « Créer un lien neuf » le remplace. Les jours se comptent à Paris.
export const LIVING_HERE_EXPIRY_SOON_DAYS = 3;
export type LivingHereExpiry = { level: 'ok' | 'soon' | 'expired'; days: number };

export function livingHereExpiry(expiresAt: string, now: Date): LivingHereExpiry | null {
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return null;
  if (date.getTime() <= now.getTime()) return { level: 'expired', days: 0 };
  const days = Math.max(0, Math.round((parisMidnight(date) - parisMidnight(now)) / 86_400_000));
  return { level: days <= LIVING_HERE_EXPIRY_SOON_DAYS ? 'soon' : 'ok', days };
}
