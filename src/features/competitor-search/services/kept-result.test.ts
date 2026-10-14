import { describe, expect, it } from 'vitest';

import {
  KEPT_RESULT_MAX_BYTES,
  parseKeptResult,
  relaunchConfirmText,
} from '@/features/competitor-search/services/kept-result';
import { STREAM_ESTATE_MAX_COST } from '@/features/competitor-search/services/paid-search-guard';

// Mission 105 — ne jamais payer deux fois sans le savoir.
describe('relancer la recherche', () => {
  it('se confirme avec le montant maximal : on sait qu’on repaie', () => {
    expect(relaunchConfirmText(STREAM_ESTATE_MAX_COST)).toBe(
      'Nouvelle recherche payante : jusqu’à 0,60 €. Le résultat actuel sera remplacé.',
    );
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
