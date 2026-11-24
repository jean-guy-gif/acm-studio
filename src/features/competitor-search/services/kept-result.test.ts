import { describe, expect, it } from 'vitest';

import {
  KEPT_RESULT_MAX_BYTES,
  parseKeptResult,
  RELAUNCH_CONFIRM_TEXT,
} from '@/features/competitor-search/services/kept-result';

// Mission 105 — ne jamais relancer sans le savoir. Lancement, mission 5 — sans montant : la
// recherche compte dans le forfait de l'agence.
describe('relancer la recherche', () => {
  it('se confirme : elle compte de nouveau, et remplace le résultat', () => {
    expect(RELAUNCH_CONFIRM_TEXT).toBe(
      'Nouvelle recherche, comptée dans le forfait du mois. Le résultat actuel sera remplacé.',
    );
    expect(RELAUNCH_CONFIRM_TEXT).not.toMatch(/€|pay/);
  });
});

describe('le résultat payé, gardé sur le dossier', () => {
  const kept = { portal: { candidates: [{ key: 'a' }] }, note: { billed: 20 } };

  it('garde un résultat bien formé, tel quel', () => {
    expect(parseKeptResult(kept)).toEqual(kept);
  });

  it('refuse ce qui n’en est pas un, et ce qui est trop lourd', () => {
    for (const raw of [null, 42, [], {}, { portal: {}, note: {} }, { portal: kept.portal }]) {
      expect(parseKeptResult(raw)).toBeNull();
    }
    const heavy = {
      portal: { candidates: ['x'.repeat(KEPT_RESULT_MAX_BYTES)] },
      note: {},
    };
    expect(parseKeptResult(heavy)).toBeNull();
  });
});
