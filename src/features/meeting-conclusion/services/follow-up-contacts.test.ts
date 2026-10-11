import { describe, expect, it } from 'vitest';

import {
  FOLLOW_UP_DUE_AFTER_DAYS,
  daysSinceLastContact,
  dueTodayLabel,
  isFollowUpDue,
  lastContactAt,
  lastContactLabel,
  sortContacts,
} from '@/features/meeting-conclusion/services/follow-up-contacts';

const NOW = new Date('2026-10-20T12:00:00Z');
const contact = (contactedAt: string) => ({ contactedAt });

describe('le dernier contact (mission 96)', () => {
  it('la date de conclusion compte comme premier contact', () => {
    expect(lastContactAt('2026-10-08T12:00:00Z', [])).toBe('2026-10-08T12:00:00Z');
    expect(daysSinceLastContact('2026-10-08T12:00:00Z', [], NOW)).toBe(12);
    expect(lastContactLabel(12)).toBe('Dernier contact il y a 12 jours');
  });

  it('ensuite, la relance la plus récente', () => {
    const contacts = [contact('2026-10-12T09:00:00Z'), contact('2026-10-18T09:00:00Z')];
    expect(lastContactAt('2026-10-08T12:00:00Z', contacts)).toBe('2026-10-18T09:00:00Z');
    expect(daysSinceLastContact('2026-10-08T12:00:00Z', contacts, NOW)).toBe(2);
  });

  it('« Relancé aujourd’hui » : le délai revient à 0', () => {
    const days = daysSinceLastContact(
      '2026-09-01T12:00:00Z',
      [contact('2026-10-20T10:00:00Z')],
      NOW,
    );
    expect(days).toBe(0);
    expect(lastContactLabel(0)).toBe('Dernier contact aujourd’hui');
    expect(isFollowUpDue(days)).toBe(false);
  });

  it('accorde le libellé', () => {
    expect(lastContactLabel(1)).toBe('Dernier contact il y a 1 jour');
  });

  it('sans aucune date lisible, on ne dit rien', () => {
    expect(lastContactAt(null, [])).toBeNull();
    expect(daysSinceLastContact('pas une date', [], NOW)).toBeNull();
    expect(isFollowUpDue(null)).toBe(false);
  });
});

describe('la pastille « À relancer aujourd’hui »', () => {
  it('apparaît au-delà de 7 jours sans contact, pas avant', () => {
    expect(FOLLOW_UP_DUE_AFTER_DAYS).toBe(7);
    expect(isFollowUpDue(0)).toBe(false);
    expect(isFollowUpDue(7)).toBe(false);
    expect(isFollowUpDue(8)).toBe(true);
    expect(isFollowUpDue(40)).toBe(true);
  });

  it('se mesure au dernier contact, pas au rendez-vous', () => {
    const old = '2026-09-01T12:00:00Z';
    expect(isFollowUpDue(daysSinceLastContact(old, [], NOW))).toBe(true);
    expect(isFollowUpDue(daysSinceLastContact(old, [contact('2026-10-15T12:00:00Z')], NOW))).toBe(
      false,
    );
  });
});

describe('le compteur du Suivi', () => {
  it('« 3 vendeurs à relancer aujourd’hui »', () => {
    expect(dueTodayLabel(3)).toBe('3 vendeurs à relancer aujourd’hui');
    expect(dueTodayLabel(1)).toBe('1 vendeur à relancer aujourd’hui');
  });

  it('personne n’attend : le compteur se tait', () => {
    expect(dueTodayLabel(0)).toBeNull();
  });
});

describe('l’historique', () => {
  it('se lit de la relance la plus récente à la plus ancienne', () => {
    const sorted = sortContacts([
      contact('2026-10-12T09:00:00Z'),
      contact('2026-10-18T09:00:00Z'),
      contact('2026-10-15T09:00:00Z'),
    ]);
    expect(sorted.map((entry) => entry.contactedAt)).toEqual([
      '2026-10-18T09:00:00Z',
      '2026-10-15T09:00:00Z',
      '2026-10-12T09:00:00Z',
    ]);
  });
});
