import { describe, expect, it } from 'vitest';

import { summarizeRecoveryFailures } from '@/features/subject-property-import/services/summarize-recovery-failures';

describe('summarizeRecoveryFailures', () => {
  it('groups the failures by cause, in order of first appearance', () => {
    expect(
      summarizeRecoveryFailures([
        'Photo introuvable sur le site de l’annonce (404).',
        'Maximum 20 photos atteint.',
        'Photo introuvable sur le site de l’annonce (404).',
      ]),
    ).toEqual([
      { cause: 'Photo introuvable sur le site de l’annonce (404).', count: 2 },
      { cause: 'Maximum 20 photos atteint.', count: 1 },
    ]);
  });

  it('returns nothing when nothing failed', () => {
    expect(summarizeRecoveryFailures([])).toEqual([]);
  });
});
