import { propertyAddressLine } from '@/lib/academia';
import { formatRelativeDay } from '@/lib/format';

// Mission 156 — l'âge d'un lien « Vivre ici » collé. Un lien client d'Academia vaut 30 jours
// (Laurent, 15/11), mais ACM ne connaît pas son expiration : il compte les jours de Paris depuis
// le collage (l'heure de la base) et prévient le conseiller du 25e au 29e jour (décisions de
// Jean-Guy, 15 et 16/11). Mission 157 — un lien collé se comporte comme un lien créé en un clic
// (Jean-Guy, 17/11) : à 30 jours et au-delà, ou quand l'adresse du bien a changé depuis le collage,
// il n'est plus montré, ni au vendeur ni aux acquéreurs, et la carte du conseiller le dit. Un lien
// sans date (collé avant la mission 156) n'a pas d'âge sûr : il n'est plus montré non plus. Pur.

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

export type PastedLinkStatus = 'shown' | 'old' | 'moved' | 'undated';

// L'adresse du bien au collage, gardée par la base (`academia_living_here_property`) : composée
// comme l'adresse du jour, pour les comparer. Illisible, aucune.
export function pastedPropertyAddress(value: unknown): string | null {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const text = (field: unknown) => (typeof field === 'string' ? field : null);
  return propertyAddressLine({
    address: text(record.address),
    postalCode: text(record.postal_code),
    city: text(record.city),
  });
}

export function pastedLinkStatus(input: {
  pastedAt: string | null;
  pastedProperty: unknown;
  currentAddress: string | null;
  now: Date;
}): PastedLinkStatus {
  const age = livingHereAge(input.pastedAt, input.now);
  if (!age) return 'undated';
  const valid =
    input.pastedProperty == null ||
    (typeof input.pastedProperty === 'object' && !Array.isArray(input.pastedProperty));
  if (!valid || pastedPropertyAddress(input.pastedProperty) !== input.currentAddress) {
    return 'moved';
  }
  return age.level === 'old' ? 'old' : 'shown';
}

const NOT_SHOWN = 'n’est plus montré, ni au vendeur ni aux acquéreurs';

export function livingHereAgeLine(
  pastedAt: string | null,
  now: Date,
  options: { moved?: boolean; canCreate?: boolean } = {},
): LivingHereAgeLine | null {
  const make = options.canCreate ? 'Créez' : 'Collez';
  if (!pastedAt) {
    return {
      tone: 'warn',
      text: `Collé sans date connue\u00a0: ce lien ${NOT_SHOWN}. ${make} un lien neuf.`,
    };
  }
  if (options.moved) {
    return {
      tone: 'warn',
      text: `L’adresse du bien a changé depuis le collage\u00a0: ce lien ${NOT_SHOWN}. ${make} celui de la nouvelle adresse.`,
    };
  }
  const age = livingHereAge(pastedAt, now);
  if (!age) return null;
  if (age.level === 'fresh') {
    return { tone: 'hint', text: `Collé ${formatRelativeDay(pastedAt, now)}` };
  }
  const head = `Collé il y a ${age.days} jours\u00a0: un lien d’Academia vaut 30 jours`;
  return {
    tone: 'warn',
    text:
      age.level === 'soon'
        ? `${head}. ${make} bientôt un lien neuf.`
        : `${head}. Il ${NOT_SHOWN}. ${make} un lien neuf.`,
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

// Mission 161 — un seul lien « Vivre ici » par bien, réutilisé partout tant qu'il a moins de 7 jours
// (décision de Jean-Guy, 18/11) ; au-delà, un écran du conseiller en crée un neuf. Un lien d'Academia
// vaut 30 jours : son âge se lit dans son expiration. Sans expiration lisible, il est à refaire.
export const LINK_LIFETIME_DAYS = 30;
export const LINK_RENEW_AFTER_DAYS = 7;

export function linkNeedsRenewal(expiresAt: string | null, now: Date): boolean {
  const at = expiresAt ? new Date(expiresAt).getTime() : Number.NaN;
  if (Number.isNaN(at)) return true;
  const ageDays = LINK_LIFETIME_DAYS - (at - now.getTime()) / 86_400_000;
  return ageDays >= LINK_RENEW_AFTER_DAYS;
}
