import { describe, expect, it } from 'vitest';

import { DANGEROUS_REASONS } from '@/features/live-seller/constants';
import { dangerousChoiceFromForm } from '@/features/live-seller/services/dangerous-choice';

function form(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) fd.set(key, value);
  return fd;
}

describe('dangerousChoiceFromForm', () => {
  it('reporte le concurrent choisi, son motif et le commentaire', () => {
    expect(
      dangerousChoiceFromForm(
        form({
          seller_most_dangerous_comparable_id: 'b',
          seller_most_dangerous_reason: DANGEROUS_REASONS[0],
          seller_most_dangerous_comment: '  mieux placé  ',
        }),
        ['a', 'b'],
      ),
    ).toEqual({
      seller_most_dangerous_comparable_id: 'b',
      seller_most_dangerous_reason: DANGEROUS_REASONS[0],
      seller_most_dangerous_comment: 'mieux placé',
    });
  });

  it('laisse vide ce qui n’est pas répondu', () => {
    expect(dangerousChoiceFromForm(form({}), ['a'])).toEqual({
      seller_most_dangerous_comparable_id: null,
      seller_most_dangerous_reason: null,
      seller_most_dangerous_comment: null,
    });
  });

  it('ne reporte ni un concurrent étranger au Live ni un motif hors liste', () => {
    const choice = dangerousChoiceFromForm(
      form({ seller_most_dangerous_comparable_id: 'z', seller_most_dangerous_reason: 'autre' }),
      ['a', 'b'],
    );
    expect(choice.seller_most_dangerous_comparable_id).toBeNull();
    expect(choice.seller_most_dangerous_reason).toBeNull();
  });
});
