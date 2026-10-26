import { describe, expect, it } from 'vitest';

import { answersBySelection } from '@/features/buyer-deck/services/answers-by-selection';

describe('« Ce qu’il a répondu », groupé par sélection', () => {
  it('la sélection la plus récente en premier, chaque réponse dans la sienne', () => {
    const groups = answersBySelection([
      { id: '1', selectionId: 'old', selectionAt: '2026-10-20T10:00:00Z' },
      { id: '2', selectionId: 'new', selectionAt: '2026-10-25T10:00:00Z' },
      { id: '3', selectionId: 'old', selectionAt: '2026-10-20T10:00:00Z' },
    ]);
    expect(groups.map((group) => [group.selectionId, group.answers.map((a) => a.id)])).toEqual([
      ['new', ['2']],
      ['old', ['1', '3']],
    ]);
  });
});
