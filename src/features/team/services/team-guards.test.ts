import { describe, expect, it } from 'vitest';

import {
  activeManagers,
  isLastManager,
  type MemberRole,
} from '@/features/team/services/team-guards';

const m = (id: string, role: string, removedAt: string | null = null): MemberRole => ({
  id,
  role,
  removedAt,
});

describe('team-guards (Mission 60 §3)', () => {
  it('activeManagers ignore les retirés et les conseillers', () => {
    const members = [m('a', 'manager'), m('b', 'manager', '2026-01-01'), m('c', 'advisor')];
    expect(activeManagers(members).map((x) => x.id)).toEqual(['a']);
  });

  it('le SEUL manager actif est le dernier ; un conseiller ne l’est jamais', () => {
    const members = [m('a', 'manager'), m('b', 'advisor')];
    expect(isLastManager(members, 'a')).toBe(true);
    expect(isLastManager(members, 'b')).toBe(false);
  });

  it('deux managers actifs → aucun n’est le dernier', () => {
    const members = [m('a', 'manager'), m('b', 'manager')];
    expect(isLastManager(members, 'a')).toBe(false);
    expect(isLastManager(members, 'b')).toBe(false);
  });

  it('un manager retiré ne « tient » plus l’agence : l’autre devient le dernier', () => {
    const members = [m('a', 'manager'), m('b', 'manager', '2026-02-02')];
    expect(isLastManager(members, 'a')).toBe(true);
    expect(isLastManager(members, 'b')).toBe(false);
  });
});
