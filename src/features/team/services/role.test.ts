import { describe, expect, it } from 'vitest';

import { isManagerRole, roleLabel } from '@/features/team/services/role';

// Mission 59 §6.2 — le garde de la vue manager. Le rôle décide, écran ET adresse : la page
// appelle isManagerRole avant toute lecture (un conseiller tombe sur un 404).
describe('isManagerRole (Mission 60 — enum nettoyé)', () => {
  it('« manager » est le seul rôle manager ; advisor ne l’est pas', () => {
    expect(isManagerRole('manager')).toBe(true);
    expect(isManagerRole('advisor')).toBe(false);
  });

  it('null / inconnu ne passe jamais le garde (owner/admin n’existent plus)', () => {
    expect(isManagerRole(null)).toBe(false);
    expect(isManagerRole(undefined)).toBe(false);
    expect(isManagerRole('')).toBe(false);
    expect(isManagerRole('owner')).toBe(false);
    expect(isManagerRole('admin')).toBe(false);
  });

  it('roleLabel affiche le concept produit, jamais la valeur DB brute', () => {
    expect(roleLabel('manager')).toBe('Manager');
    expect(roleLabel('advisor')).toBe('Conseiller');
    expect(roleLabel(null)).toBe('Conseiller');
  });
});
