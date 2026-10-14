import { daysSince } from '@/features/meeting-conclusion/services/filter-suivi';
import type { FollowUpMotive } from '@/features/meeting-conclusion/types';

// Mission 96 — rien ne dort : chaque dossier « à relancer » dit depuis quand le vendeur n'a pas
// été contacté. Pur. La date de conclusion compte comme premier contact ; ensuite, la relance
// la plus récente. Aucun rappel n'est envoyé : l'écran informe, le conseiller décide.

export type FollowUpContact = {
  id: string;
  contactedAt: string;
  note: string | null;
  // « Prénom Nom » de l'auteur ; null si son profil n'existe plus.
  author: string | null;
  // Mission 105 — la date de prochaine relance posée avec cette relance (AAAA-MM-JJ) ; null pour
  // une relance d'avant la mission : la règle des 7 jours vaut alors.
  nextFollowUpOn?: string | null;
};

// Au-delà de 7 jours sans contact, la pastille « À relancer aujourd'hui » apparaît.
export const FOLLOW_UP_DUE_AFTER_DAYS = 7;
export const FOLLOW_UP_DUE_LABEL = 'À relancer aujourd’hui';

const time = (iso: string | null | undefined): number | null => {
  if (!iso) {
    return null;
  }
  const value = new Date(iso).getTime();
  return Number.isNaN(value) ? null : value;
};

// Le dernier contact : la relance la plus récente, sinon la conclusion du rendez-vous.
export function lastContactAt(
  concludedAt: string | null | undefined,
  contacts: Pick<FollowUpContact, 'contactedAt'>[],
): string | null {
  let latest: { iso: string; time: number } | null = null;
  for (const iso of [concludedAt, ...contacts.map((contact) => contact.contactedAt)]) {
    const value = time(iso);
    if (iso && value != null && (latest == null || value > latest.time)) {
      latest = { iso, time: value };
    }
  }
  return latest?.iso ?? null;
}

export function daysSinceLastContact(
  concludedAt: string | null | undefined,
  contacts: Pick<FollowUpContact, 'contactedAt'>[],
  now: Date,
): number | null {
  return daysSince(lastContactAt(concludedAt, contacts), now);
}

export function isFollowUpDue(days: number | null): boolean {
  return days != null && days > FOLLOW_UP_DUE_AFTER_DAYS;
}

export function lastContactLabel(days: number): string {
  if (days === 0) {
    return 'Dernier contact aujourd’hui';
  }
  return `Dernier contact il y a ${days} jour${days > 1 ? 's' : ''}`;
}

// « 3 vendeurs à relancer aujourd'hui » ; null quand personne n'attend : le compteur se tait.
export function dueTodayLabel(count: number): string | null {
  if (count <= 0) {
    return null;
  }
  return `${count} vendeur${count > 1 ? 's' : ''} à relancer aujourd’hui`;
}

// Les relances d'un dossier, de la plus récente à la plus ancienne.
export function sortContacts<T extends Pick<FollowUpContact, 'contactedAt'>>(contacts: T[]): T[] {
  return [...contacts].sort((a, b) => (time(b.contactedAt) ?? 0) - (time(a.contactedAt) ?? 0));
}

// ---------------------------------------------------------------------------------------------
// Mission 105 — la date de prochaine relance. Chaque relance enregistrée en propose une,
// modifiable : 1 mois si le vendeur réfléchit au prix, 7 jours sinon ; le conseiller y met la
// date du projet quand le vendeur en a donné une. Le dossier ne revient dans la pastille qu'à
// cette date. Sans date posée (relances d'avant la mission), la règle des 7 jours vaut.
// ---------------------------------------------------------------------------------------------

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

// Le jour, à Paris : « 2026-10-14 ».
export function parisDay(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

function shiftDay(day: string, days: number, months = 0): string {
  const [, y, m, d] = DAY.exec(day) ?? [];
  const date = new Date(Date.UTC(Number(y), Number(m) - 1 + months, Number(d) + days));
  return date.toISOString().slice(0, 10);
}

export const NEXT_FOLLOW_UP_MAX_DAYS = 366;

export function defaultNextFollowUpOn(
  motive: FollowUpMotive | null | undefined,
  now: Date,
): string {
  const today = parisDay(now);
  return motive === 'thinking_price' ? shiftDay(today, 0, 1) : shiftDay(today, 7);
}

// La date reçue de l'écran, relue : un jour réel, d'aujourd'hui à un an. Vide : la date proposée.
export function parseNextFollowUpOn(
  raw: unknown,
  motive: FollowUpMotive | null | undefined,
  now: Date,
): { ok: true; day: string } | { ok: false } {
  const text = typeof raw === 'string' ? raw.trim() : '';
  if (text === '') {
    return { ok: true, day: defaultNextFollowUpOn(motive, now) };
  }
  const match = DAY.exec(text);
  if (!match || shiftDay(text, 0) !== text) {
    return { ok: false };
  }
  const today = parisDay(now);
  if (text < today || text > shiftDay(today, NEXT_FOLLOW_UP_MAX_DAYS)) {
    return { ok: false };
  }
  return { ok: true, day: text };
}

// Le dossier attend-il une relance aujourd'hui ? La date posée avec la dernière relance décide ;
// sans elle, la règle des 7 jours (M96).
export function isFollowUpDueNow(
  concludedAt: string | null | undefined,
  contacts: Pick<FollowUpContact, 'contactedAt' | 'nextFollowUpOn'>[],
  now: Date,
): boolean {
  const latest = sortContacts(contacts)[0];
  if (latest?.nextFollowUpOn) {
    return parisDay(now) >= latest.nextFollowUpOn;
  }
  return isFollowUpDue(daysSinceLastContact(concludedAt, contacts, now));
}

// « Prochaine relance le 14/11 »
export function nextFollowUpLabel(day: string): string {
  const [, , m, d] = DAY.exec(day) ?? [];
  return m && d ? `Prochaine relance le ${d}/${m}` : '';
}
