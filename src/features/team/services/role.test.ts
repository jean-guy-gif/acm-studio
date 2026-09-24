import { describe, expect, it } from 'vitest';

import { isManagerRole, roleLabel } from '@/features/team/services/role';

// Mission 59 §6.2 — le garde de la vue manager. Le rôle décide, écran ET adresse : la page
// appelle isManagerRole avant toute lecture (un conseiller tombe sur un 404).
describe('isManagerRole (Mission 59)', () => {
  it('owner et admin sont managers ; advisor ne l’est pas', () => {
    expect(isManagerRole('owner')).toBe(true);
    expect(isManagerRole('admin')).toBe(true);
    expect(isManagerRole('advisor')).toBe(false);
  });

  it('null / inconnu ne passe jamais le garde', () => {
    expect(isManagerRole(null)).toBe(false);
    expect(isManagerRole(undefined)).toBe(false);
    expect(isManagerRole('')).toBe(false);
    expect(isManagerRole('manager')).toBe(false); // valeur non stockée aujourd'hui
  });

  it('roleLabel affiche le concept produit, jamais la valeur DB brute', () => {
    expect(roleLabel('owner')).toBe('Manager');
    expect(roleLabel('admin')).toBe('Manager');
    expect(roleLabel('advisor')).toBe('Conseiller');
    expect(roleLabel(null)).toBe('Conseiller');
  });
});
