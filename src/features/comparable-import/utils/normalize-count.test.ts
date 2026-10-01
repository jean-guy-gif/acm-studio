import { describe, expect, it } from 'vitest';

import {
  normalizeCount,
  studioRoomsCount,
} from '@/features/comparable-import/utils/normalize-count';

describe('normalizeCount', () => {
  it('parses integer counts', () => {
    expect(normalizeCount('3')).toBe(3);
    expect(normalizeCount('3 pièces')).toBe(3);
    expect(normalizeCount(4)).toBe(4);
  });

  it('rejects decimals and invalid values', () => {
    expect(normalizeCount('3.5')).toBeNull();
    expect(normalizeCount('3,5 pièces')).toBeNull();
    expect(normalizeCount(2.5)).toBeNull();
    expect(normalizeCount('')).toBeNull();
    expect(normalizeCount('abc')).toBeNull();
    expect(normalizeCount('-1')).toBeNull();
  });
});

// Mission 68 — un studio est un 1 pièce, même quand le libellé ne dit pas « 1 pièce ».
describe('studioRoomsCount', () => {
  it('« Studio », « T1 » et « F1 » comptent pour 1 pièce', () => {
    expect(studioRoomsCount('Studio')).toBe(1);
    expect(studioRoomsCount('Studio à vendre – Nice, vue mer')).toBe(1);
    expect(studioRoomsCount('Appartement T1 22 m² Nice')).toBe(1);
    expect(studioRoomsCount('Vente F1 bis Antibes')).toBe(1);
  });

  it('ne devine rien ailleurs : T2, T10, un mot qui contient « studio », un libellé vide', () => {
    expect(studioRoomsCount('Appartement T2 45 m²')).toBeNull();
    expect(studioRoomsCount('Maison T10')).toBeNull();
    expect(studioRoomsCount('Résidence Studios-Park')).toBeNull();
    expect(studioRoomsCount('Appartement à Nice')).toBeNull();
    expect(studioRoomsCount(null)).toBeNull();
  });
});
