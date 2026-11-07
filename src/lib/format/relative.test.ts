import { describe, expect, it } from 'vitest';

import { formatRelativeDay, formatRelativeMoment, formatRelativeSince } from '@/lib/format';

// Mission 143 (C1) — les dates du conseiller, relatives, à l'heure de Paris, sans secondes.
const NOW = new Date('2026-11-07T15:00:00Z'); // samedi 7 novembre, 16 h à Paris

describe('les dates du conseiller', () => {
  it('aujourd’hui, hier, il y a N jours, puis le jour daté', () => {
    expect(formatRelativeDay('2026-11-07T08:00:00Z', NOW)).toBe('aujourd’hui');
    // 23 h 30 le 6 à Paris : hier, même si c'est le 6 en UTC aussi.
    expect(formatRelativeDay('2026-11-06T22:30:00Z', NOW)).toBe('hier');
    // 0 h 30 le 7 à Paris (23 h 30 le 6 en UTC) : aujourd'hui.
    expect(formatRelativeDay('2026-11-06T23:30:00Z', NOW)).toBe('aujourd’hui');
    expect(formatRelativeDay('2026-11-04T10:00:00Z', NOW)).toBe('il y a 3 jours');
    expect(formatRelativeDay('2026-11-01T10:00:00Z', NOW)).toBe('il y a 6 jours');
    expect(formatRelativeDay('2026-10-31T10:00:00Z', NOW)).toBe('le 31/10');
    expect(formatRelativeDay('2025-11-07T10:00:00Z', NOW)).toBe('le 07/11/2025');
    // Une date à venir : le jour daté.
    expect(formatRelativeDay('2026-11-14T10:00:00Z', NOW)).toBe('le 14/11');
    expect(formatRelativeDay('pas une date', NOW)).toBe('—');
  });
  it('avec l’heure, à Paris, sans secondes', () => {
    expect(formatRelativeMoment('2026-11-07T11:32:23Z', NOW)).toBe('aujourd’hui à 12 h 32');
    expect(formatRelativeMoment('2026-11-06T08:05:00Z', NOW)).toBe('hier à 9 h 05');
    expect(formatRelativeMoment('2026-11-04T11:32:00Z', NOW)).toBe('le 04/11 à 12 h 32');
    expect(formatRelativeMoment('2025-03-04T11:32:00Z', NOW)).toBe('le 04/03/2025 à 12 h 32');
  });
  it('« depuis », pour un état qui dure', () => {
    expect(formatRelativeSince('2026-11-07T08:00:00Z', NOW)).toBe('depuis aujourd’hui');
    expect(formatRelativeSince('2026-11-06T08:00:00Z', NOW)).toBe('depuis hier');
    expect(formatRelativeSince('2026-11-04T10:00:00Z', NOW)).toBe('depuis 3 jours');
    expect(formatRelativeSince('2026-10-31T10:00:00Z', NOW)).toBe('depuis le 31/10');
  });
});
