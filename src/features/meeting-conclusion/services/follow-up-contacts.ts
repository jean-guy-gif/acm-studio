import { daysSince } from '@/features/meeting-conclusion/services/filter-suivi';

// Mission 96 — rien ne dort : chaque dossier « à relancer » dit depuis quand le vendeur n'a pas
// été contacté. Pur. La date de conclusion compte comme premier contact ; ensuite, la relance
// la plus récente. Aucun rappel n'est envoyé : l'écran informe, le conseiller décide.

export type FollowUpContact = {
  id: string;
  contactedAt: string;
  note: string | null;
  // « Prénom Nom » de l'auteur ; null si son profil n'existe plus.
  author: string | null;
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
