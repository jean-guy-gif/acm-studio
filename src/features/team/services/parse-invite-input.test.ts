import { describe, expect, it } from 'vitest';

import { parseInviteInput } from '@/features/team/services/parse-invite-input';

function form(email: string, role: string): FormData {
  const fd = new FormData();
  fd.set('email', email);
  fd.set('role', role);
  return fd;
}

describe('parseInviteInput (Mission 60)', () => {
  it('accepte une adresse + un rôle, et normalise l’adresse en minuscules', () => {
    expect(parseInviteInput(form('Bob@Agence.FR', 'advisor'))).toEqual({
      ok: true,
      value: { email: 'bob@agence.fr', role: 'advisor' },
    });
    expect(parseInviteInput(form('chef@agence.fr', 'manager')).ok).toBe(true);
  });

  it('refuse une adresse manifestement invalide', () => {
    expect(parseInviteInput(form('pas-un-email', 'advisor')).ok).toBe(false);
    expect(parseInviteInput(form('a@b', 'advisor')).ok).toBe(false);
    expect(parseInviteInput(form('', 'advisor')).ok).toBe(false);
  });

  it('refuse un rôle inconnu (owner/admin n’existent plus)', () => {
    expect(parseInviteInput(form('a@b.fr', 'owner')).ok).toBe(false);
    expect(parseInviteInput(form('a@b.fr', '')).ok).toBe(false);
  });
});
