import { describe, expect, it } from 'vitest';

import {
  MANUAL_OPPOSITION_INCOMPLETE,
  manualOppositionKey,
} from '@/features/prospecting/services/manual-opposition';
import { buildOppositions, opposedOn } from '@/features/prospecting/services/opposition';

describe('opposition inscrite à la main (mission 102)', () => {
  it('rend la clé de l’immeuble de l’adresse tapée', () => {
    expect(manualOppositionKey('  14 ch. des Oliviers,  06800 Cagnes-sur-Mer ')).toEqual({
      ok: true,
      key: '14 chemin des oliviers cagnes sur mer',
    });
  });

  it('refuse ce qui n’est pas une adresse complète : numéro, rue, ville', () => {
    for (const raw of [null, undefined, 42, '', '   ', 'rue des Pins, Antibes', '8 Antibes']) {
      expect(manualOppositionKey(raw)).toEqual({ ok: false, error: MANUAL_OPPOSITION_INCOMPLETE });
    }
    expect(manualOppositionKey(`8 rue ${'x'.repeat(200)}, Antibes`).ok).toBe(false);
  });

  it('l’adresse inscrite est bloquée partout, quelle que soit son écriture sur une carte', () => {
    const parsed = manualOppositionKey('14 chemin des Oliviers, Cros-de-Cagnes');
    expect(parsed.ok).toBe(true);
    const list = buildOppositions([
      {
        address_key: parsed.ok ? parsed.key : null,
        listing_key: null,
        requested_at: '2026-10-12T08:00:00.000Z',
      },
    ]);
    expect(
      opposedOn({ address: '14 ch des Oliviers · 1er étage, 06800 Cagnes-sur-Mer' }, list),
    ).toBe('2026-10-12T08:00:00.000Z');
    expect(opposedOn({ address: '16 chemin des Oliviers, 06800 Cagnes-sur-Mer' }, list)).toBeNull();
  });
});
