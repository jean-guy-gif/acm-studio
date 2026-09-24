import { describe, expect, it } from 'vitest';

import { parseDormancyThresholds } from '@/features/team/services/parse-dormancy-thresholds';

function form(prep: string, followUp: string): FormData {
  const fd = new FormData();
  fd.set('preparationDays', prep);
  fd.set('followUpDays', followUp);
  return fd;
}

describe('parseDormancyThresholds (Mission 59 seuils)', () => {
  it('accepte deux entiers positifs', () => {
    expect(parseDormancyThresholds(form('21', '30'))).toEqual({
      ok: true,
      value: { preparationDays: 21, followUpDays: 30 },
    });
  });

  it('un manager qui met 90 jours sait ce qu’il fait (pas de plafond)', () => {
    const result = parseDormancyThresholds(form('90', '120'));
    expect(result.ok).toBe(true);
  });

  it('refuse moins de 1 jour, zéro et le négatif', () => {
    expect(parseDormancyThresholds(form('0', '30')).ok).toBe(false);
    expect(parseDormancyThresholds(form('21', '0')).ok).toBe(false);
    expect(parseDormancyThresholds(form('-5', '30')).ok).toBe(false);
  });

  it('refuse le non-entier et le vide', () => {
    expect(parseDormancyThresholds(form('21.5', '30')).ok).toBe(false);
    expect(parseDormancyThresholds(form('', '30')).ok).toBe(false);
    expect(parseDormancyThresholds(form('abc', '30')).ok).toBe(false);
  });
});
