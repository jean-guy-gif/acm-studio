import { describe, expect, it } from 'vitest';

import { academiaQuotaMessage } from '@/features/academia/services/academia-messages';

// Mission 161 — le délai du plafond d'Academia (Retry-After), dit au conseiller.
describe('academiaQuotaMessage', () => {
  const now = new Date('2026-11-18T10:00:00Z'); // 11 h à Paris
  it('une heure au plus : « dans N minutes », avec « Réessayer »', () => {
    expect(academiaQuotaMessage(45, now)).toEqual({
      message: 'Academia reçoit beaucoup de demandes en ce moment\u00a0: réessayez dans 1 minute.',
      retry: true,
    });
  });
  it('au-delà : l’heure, aujourd’hui, demain ou le jour dit, sans « Réessayer »', () => {
    expect(academiaQuotaMessage(3 * 3600, now).message).toContain('réessayez à partir de 14 h 00.');
    expect(academiaQuotaMessage(20 * 3600, now).message).toContain(
      'réessayez demain, à partir de 7 h 00.',
    );
    expect(academiaQuotaMessage(50 * 3600, now).message).toContain(
      'réessayez le 20/11, à partir de 13 h 00.',
    );
    expect(academiaQuotaMessage(50 * 3600, now).retry).toBe(false);
    expect(academiaQuotaMessage(undefined, now).message).toContain('réessayez demain.');
  });
});
